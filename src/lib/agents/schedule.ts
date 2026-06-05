import { z } from 'zod'
import { Type } from '@google/genai'
import type { Task } from '@prisma/client'
import { getGemini, GEMINI_MODEL } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'
import type { BusyInterval } from '@/lib/google'

// The Schedule agent proposes 2-3 calendar time slots for a task, given the
// user's existing busy times. It only *proposes* — creating the calendar event
// happens separately, after the user picks a slot and approves it. There is
// deliberately no path here that writes to the calendar.

// ───────────────────────── Output contract ─────────────────────────

export const scheduleSlotSchema = z.object({
  // ISO 8601 datetimes (with offset). Zod keeps them as strings; the commit
  // route coerces to Date when it persists/creates the event.
  start: z.string().min(1),
  end: z.string().min(1),
  reason: z.string().min(1).max(300),
})

export type ScheduleSlot = z.infer<typeof scheduleSlotSchema>

const scheduleOutputSchema = z.object({
  slots: z.array(scheduleSlotSchema).min(1),
})

// Gemini structured-output schema (OpenAPI 3.0 subset). Keep in sync with the
// Zod schema above — Zod re-validates the response.
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    slots: {
      type: Type.ARRAY,
      description: 'Two or three proposed time slots, best option first.',
      items: {
        type: Type.OBJECT,
        properties: {
          start: {
            type: Type.STRING,
            description: 'ISO 8601 start datetime with timezone offset.',
          },
          end: { type: Type.STRING, description: 'ISO 8601 end datetime with timezone offset.' },
          reason: { type: Type.STRING, description: 'One short line on why this slot works.' },
        },
        required: ['start', 'end', 'reason'],
        propertyOrdering: ['start', 'end', 'reason'],
      },
    },
  },
  required: ['slots'],
  propertyOrdering: ['slots'],
}

const SYSTEM_PROMPT = `You are the Schedule agent inside TaskAgent, a personal task manager. Propose 2-3 concrete calendar time slots to work on a single task.

Rules:
- Each slot must last exactly the task's estimated duration.
- Only suggest slots within the next 7 days, and do NOT overlap any of the user's busy intervals provided.
- Prefer business hours (roughly 09:00-18:00 local) on weekdays. For higher-priority tasks, prefer sooner slots.
- Spread the options out (don't propose three slots back to back).
- Return start and end as ISO 8601 datetimes that include the timezone offset for the user's timezone.
- Give each slot a short, specific reason (e.g. "Open morning before your 1pm meeting").

Return only the slots as JSON matching the provided schema, best option first.`

// Cap so a misbehaving response can't flood the UI.
const MAX_SLOTS = 4

const DEFAULT_DURATION_MINUTES = 30

// Free, offline fallback used when no GEMINI_API_KEY is configured. Deterministic
// slots so the propose→approve→create flow is testable at zero cost.
export function demoScheduleSlots(estimatedMinutes: number): ScheduleSlot[] {
  const duration = estimatedMinutes > 0 ? estimatedMinutes : DEFAULT_DURATION_MINUTES
  const make = (daysAhead: number, hour: number, reason: string): ScheduleSlot => {
    const start = new Date()
    start.setDate(start.getDate() + daysAhead)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(start.getTime() + duration * 60_000)
    return { start: start.toISOString(), end: end.toISOString(), reason }
  }
  return [make(1, 10, 'A clear morning block tomorrow'), make(2, 14, 'Early-afternoon focus time')]
}

// ───────────────────────── Agent ─────────────────────────

export type ScheduleTaskInput = Pick<
  Task,
  'id' | 'title' | 'description' | 'priority' | 'estimatedMinutes'
>

export type ScheduleResult = {
  agentRunId: string
  slots: ScheduleSlot[]
}

/**
 * Propose time slots for a task. Writes a SCHEDULE AgentRun audit record like
 * the other agents. Throws on failure (after recording the AgentRun as ERROR).
 * Creating the event is a separate, user-approved step.
 */
export async function runScheduleAgent(params: {
  userId: string
  task: ScheduleTaskInput
  /** The user's existing busy intervals over the planning window. */
  busy: BusyInterval[]
  /** IANA timezone of the user's browser, e.g. "Europe/Lisbon". */
  timeZone: string
  /** When true, skip the Gemini call and return free placeholder slots. */
  demo?: boolean
}): Promise<ScheduleResult> {
  const { userId, task, busy, timeZone, demo = false } = params
  const duration =
    task.estimatedMinutes && task.estimatedMinutes > 0
      ? task.estimatedMinutes
      : DEFAULT_DURATION_MINUTES

  const run = await prisma.agentRun.create({
    data: {
      userId,
      taskId: task.id,
      agentType: 'SCHEDULE',
      status: 'PENDING',
      input: {
        taskId: task.id,
        title: task.title,
        duration,
        timeZone,
        busyCount: busy.length,
        demo,
      },
    },
  })

  try {
    let slots: ScheduleSlot[]
    let tokensUsed = 0

    if (demo) {
      slots = demoScheduleSlots(duration)
    } else {
      const busyLines = busy.length
        ? busy.map((b) => `- ${b.start} to ${b.end}`).join('\n')
        : '(none in this window)'
      const prompt = [
        `NOW: ${new Date().toISOString()}`,
        `USER TIMEZONE: ${timeZone}`,
        `TASK: ${task.title}` + (task.description ? `\n${task.description}` : ''),
        `PRIORITY: ${task.priority}`,
        `DURATION: ${duration} minutes`,
        `BUSY INTERVALS (do not overlap these):\n${busyLines}`,
      ].join('\n\n')

      const response = await getGemini().models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      })

      const text = response.text
      if (!text) {
        throw new Error('The agent did not return any time slots.')
      }

      slots = scheduleOutputSchema.parse(JSON.parse(text)).slots.slice(0, MAX_SLOTS)
      tokensUsed = response.usageMetadata?.totalTokenCount ?? 0
    }

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        output: { demo, slots },
        tokensUsed,
        completedAt: new Date(),
      },
    })

    return { agentRunId: run.id, slots }
  } catch (err) {
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'ERROR',
        error: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
      },
    })
    throw err
  }
}
