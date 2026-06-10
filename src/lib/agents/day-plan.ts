import { z } from 'zod'
import { Type } from '@google/genai'
import { getGemini, GEMINI_MODEL } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

// The Day Planner agent turns "what should I do today?" into an actual
// schedule: it picks the most important open tasks and proposes concrete
// time blocks for today, around anything already time-blocked. It only
// *proposes* — the blocks are written to the tasks in a separate, user-
// approved commit step (no calendar/Google involvement; blocks live on the
// tasks themselves and show up on the Today page and calendar view).

export const dayPlanBlockSchema = z.object({
  taskId: z.string().min(1),
  // ISO 8601 datetimes (with offset). Kept as strings; the commit route
  // coerces to Date when persisting.
  start: z.string().min(1),
  end: z.string().min(1),
  reason: z.string().min(1).max(300),
})

export type DayPlanBlock = z.infer<typeof dayPlanBlockSchema> & { title: string }

const dayPlanOutputSchema = z.object({
  summary: z.string().min(1).max(600),
  blocks: z.array(dayPlanBlockSchema),
})

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: 'One or two plain-text lines describing the shape of the day.',
    },
    blocks: {
      type: Type.ARRAY,
      description: 'The proposed focus blocks for today, in chronological order.',
      items: {
        type: Type.OBJECT,
        properties: {
          taskId: {
            type: Type.STRING,
            description: 'The exact id of the task, copied from the list. Never invent ids.',
          },
          start: {
            type: Type.STRING,
            description: 'ISO 8601 start datetime with timezone offset.',
          },
          end: { type: Type.STRING, description: 'ISO 8601 end datetime with timezone offset.' },
          reason: { type: Type.STRING, description: 'One short line on why this task, now.' },
        },
        required: ['taskId', 'start', 'end', 'reason'],
        propertyOrdering: ['taskId', 'start', 'end', 'reason'],
      },
    },
  },
  required: ['summary', 'blocks'],
  propertyOrdering: ['summary', 'blocks'],
}

const SYSTEM_PROMPT = `You are the Day Planner agent inside TaskAgent, a personal task manager. Given the user's open tasks and what is already time-blocked today, propose a realistic plan for the REST of today.

Rules:
- Pick the 3-6 tasks that matter most today: overdue and due-today first, then by priority and effort.
- Each block's length should match the task's estimated minutes (default 30 if none), rounded to 5 minutes.
- Schedule only between the current time and ~19:00 in the user's timezone — never in the past.
- Do not overlap the existing busy blocks, and leave 10-15 minute gaps between blocks.
- Don't fill every minute: cap the plan at about 5 focused hours.
- Return start and end as ISO 8601 datetimes that include the timezone offset.
- Give each block a short, specific reason (e.g. "Overdue and quick — clear it first").

Return only JSON matching the schema, blocks in chronological order.`

const MAX_BLOCKS = 8
const MAX_TASKS_IN_PROMPT = 40

export type DayPlanResult = {
  agentRunId: string
  summary: string
  blocks: DayPlanBlock[]
}

export function demoDayPlan(): { summary: string; blocks: [] } {
  return {
    summary:
      'Demo mode — add a Gemini API key and the agent will build a real schedule for your day here.',
    blocks: [],
  }
}

/**
 * Propose today's focus blocks. Logs a SCHEDULE AgentRun like the other
 * agents. Throws on failure (after recording the run as ERROR). Applying the
 * blocks is a separate, user-approved step.
 */
export async function runDayPlanAgent(params: {
  userId: string
  /** IANA timezone of the user's browser, e.g. "Asia/Jerusalem". */
  timeZone: string
  /** When true, skip the Gemini call and return a free placeholder. */
  demo?: boolean
}): Promise<DayPlanResult> {
  const { userId, timeZone, demo = false } = params

  // Candidates: open tasks (parents and subtasks alike — whatever can be
  // worked on), plus today's existing blocks to plan around.
  const open = await prisma.task.findMany({
    where: { userId, status: { not: 'DONE' } },
    orderBy: [{ dueDate: 'asc' }, { createdAt: 'asc' }],
    take: MAX_TASKS_IN_PROMPT,
  })
  const titleById = new Map(open.map((t) => [t.id, t.title]))

  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dayStart)
  dayEnd.setDate(dayEnd.getDate() + 1)
  const busy = open.filter(
    (t) => t.scheduledStart && t.scheduledStart >= dayStart && t.scheduledStart < dayEnd,
  )

  const run = await prisma.agentRun.create({
    data: {
      userId,
      agentType: 'SCHEDULE',
      status: 'PENDING',
      input: { kind: 'day-plan', candidates: open.length, timeZone, demo },
    },
  })

  try {
    let summary: string
    let blocks: DayPlanBlock[] = []
    let tokensUsed = 0

    if (demo) {
      summary = demoDayPlan().summary
    } else if (open.length === 0) {
      summary = 'No open tasks to plan — enjoy the clear day.'
    } else {
      const taskLines = open
        .map(
          (t) =>
            `- id:${t.id} | ${t.title} | priority:${t.priority}` +
            (t.dueDate ? ` | due:${t.dueDate.toISOString().slice(0, 10)}` : '') +
            (t.estimatedMinutes ? ` | estimate:${t.estimatedMinutes}min` : ''),
        )
        .join('\n')
      const busyLines = busy.length
        ? busy
            .map(
              (t) =>
                `- ${t.scheduledStart!.toISOString()} to ${t.scheduledEnd?.toISOString() ?? '?'} (${t.title})`,
            )
            .join('\n')
        : '(nothing scheduled yet today)'

      const response = await getGemini().models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          `NOW: ${new Date().toISOString()}`,
          `USER TIMEZONE: ${timeZone}`,
          `OPEN TASKS:\n${taskLines}`,
          `ALREADY BLOCKED TODAY (do not overlap):\n${busyLines}`,
        ].join('\n\n'),
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      })

      const text = response.text
      if (!text) throw new Error('The agent did not return a plan.')
      const parsed = dayPlanOutputSchema.parse(JSON.parse(text))
      tokensUsed = response.usageMetadata?.totalTokenCount ?? 0
      summary = parsed.summary

      // Keep only blocks that reference the user's own tasks and parse to a
      // valid time range; attach titles for the review UI.
      blocks = parsed.blocks
        .filter((b) => {
          const s = new Date(b.start)
          const e = new Date(b.end)
          return (
            titleById.has(b.taskId) &&
            !Number.isNaN(s.getTime()) &&
            !Number.isNaN(e.getTime()) &&
            e > s
          )
        })
        .slice(0, MAX_BLOCKS)
        .map((b) => ({ ...b, title: titleById.get(b.taskId)! }))
    }

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        output: { demo, kind: 'day-plan', summary, blocks },
        tokensUsed,
        completedAt: new Date(),
      },
    })

    return { agentRunId: run.id, summary, blocks }
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
