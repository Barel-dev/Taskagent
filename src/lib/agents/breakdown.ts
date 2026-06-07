import { z } from 'zod'
import { Type } from '@google/genai'
import type { Priority, Task } from '@prisma/client'
import { getGemini, GEMINI_MODEL } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'
import { priorityEnum } from '@/lib/validators'

// ───────────────────────── Output contract ─────────────────────────

// What we accept back from the model. The JSON Schema handed to the API
// (below) constrains the *shape*; this Zod schema enforces the finer
// constraints (non-empty title, positive integer minutes) that JSON Schema
// for tool use can't express, and gives us a typed result.
export const subtaskSchema = z.object({
  title: z.string().min(1).max(200),
  priority: priorityEnum,
  estimatedMinutes: z.number().int().positive().max(100000),
})

const breakdownOutputSchema = z.object({
  subtasks: z.array(subtaskSchema).min(1),
})

// Gemini structured-output schema (OpenAPI 3.0 subset). Keep in sync with the
// Zod schema above — Zod re-validates the response, enforcing the finer
// constraints this schema can't express.
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    subtasks: {
      type: Type.ARRAY,
      description: 'The ordered subtasks, in the sequence they should be done.',
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: 'A specific, actionable subtask.' },
          priority: {
            type: Type.STRING,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            description: 'How blocking/urgent this subtask is relative to the others.',
          },
          estimatedMinutes: {
            type: Type.INTEGER,
            description: 'Realistic whole-number estimate of focused work, in minutes.',
          },
        },
        required: ['title', 'priority', 'estimatedMinutes'],
        propertyOrdering: ['title', 'priority', 'estimatedMinutes'],
      },
    },
  },
  required: ['subtasks'],
  propertyOrdering: ['subtasks'],
}

const SYSTEM_PROMPT = `You are the Breakdown agent inside TaskAgent, a personal task manager.
Given a single task, decompose it into 3-7 concrete, ordered subtasks the user can act on immediately.

Rules:
- Each subtask is a specific action, not a vague theme. Prefer "Book round-trip flights" over "Travel logistics".
- Order the subtasks in the sequence they should be done.
- estimatedMinutes is a realistic whole-number estimate of focused work for that one subtask.
- priority reflects how blocking or urgent the subtask is relative to the others.
- Keep each title under ~80 characters.
- Do not restate the parent task as a subtask, and do not add filler steps like "review the plan" or "get started".

Return only the subtasks as JSON matching the provided schema.`

// Defensive cap so a misbehaving response can't create hundreds of rows.
const MAX_SUBTASKS = 12

// Free, offline fallback used when no GEMINI_API_KEY is configured.
// Deterministic placeholder subtasks so the whole flow is testable at zero
// cost; the real Gemini breakdown takes over automatically once a key is set.
export function demoSubtasks(title: string): z.infer<typeof subtaskSchema>[] {
  const t = title.trim() || 'this task'
  return [
    {
      title: `Clarify the goal & success criteria for "${t}"`,
      priority: 'HIGH',
      estimatedMinutes: 15,
    },
    {
      title: 'Outline the steps and gather what you need',
      priority: 'MEDIUM',
      estimatedMinutes: 20,
    },
    { title: 'Do the core work', priority: 'HIGH', estimatedMinutes: 60 },
    { title: 'Review, test, and refine', priority: 'MEDIUM', estimatedMinutes: 20 },
    { title: 'Wrap up and mark complete', priority: 'LOW', estimatedMinutes: 10 },
  ]
}

// ───────────────────────── Agent ─────────────────────────

export type BreakdownInput = {
  id: string
  title: string
  description: string | null
  priority: Priority
}

export type BreakdownResult = {
  agentRunId: string
  subtasks: Task[]
}

/**
 * Run the Breakdown agent for a task the caller has already loaded and
 * verified ownership of. Creates child Task rows and writes an AgentRun
 * audit record. Throws on failure (after recording the AgentRun as ERROR).
 */
export async function runBreakdownAgent(params: {
  userId: string
  task: BreakdownInput
  /** When true, skip the Gemini call and return free placeholder subtasks. */
  demo?: boolean
}): Promise<BreakdownResult> {
  const { userId, task, demo = false } = params

  const run = await prisma.agentRun.create({
    data: {
      userId,
      taskId: task.id,
      agentType: 'BREAKDOWN',
      status: 'PENDING',
      input: { taskId: task.id, title: task.title, priority: task.priority, demo },
    },
  })

  try {
    let subtasks: z.infer<typeof subtaskSchema>[]
    let tokensUsed = 0

    if (demo) {
      subtasks = demoSubtasks(task.title)
    } else {
      const userPrompt =
        `Task: ${task.title}` +
        (task.description ? `\n\nDetails: ${task.description}` : '') +
        `\n\nCurrent priority: ${task.priority}`

      const response = await getGemini().models.generateContent({
        model: GEMINI_MODEL,
        contents: userPrompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      })

      const text = response.text
      if (!text) {
        throw new Error('The agent did not return any subtasks.')
      }

      subtasks = breakdownOutputSchema.parse(JSON.parse(text)).subtasks
      tokensUsed = response.usageMetadata?.totalTokenCount ?? 0
    }

    const capped = subtasks.slice(0, MAX_SUBTASKS)

    // Create the child rows in order, in one transaction, so we can return
    // the persisted rows (with ids) to the client.
    const created = await prisma.$transaction(
      capped.map((s, i) =>
        prisma.task.create({
          data: {
            userId,
            parentId: task.id,
            title: s.title,
            priority: s.priority,
            estimatedMinutes: s.estimatedMinutes,
            order: i,
          },
        }),
      ),
    )

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        output: { demo, subtasks: capped },
        tokensUsed,
        completedAt: new Date(),
      },
    })

    return { agentRunId: run.id, subtasks: created }
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
