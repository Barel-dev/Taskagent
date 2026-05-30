import { z } from 'zod'
import type Anthropic from '@anthropic-ai/sdk'
import type { Priority, Task } from '@prisma/client'
import { claude, AGENT_MODEL } from '@/lib/claude'
import { prisma } from '@/lib/prisma'
import { priorityEnum } from '@/lib/validators'

// ───────────────────────── Output contract ─────────────────────────

// What we accept back from the model. The JSON Schema handed to the API
// (below) constrains the *shape*; this Zod schema enforces the finer
// constraints (non-empty title, positive integer minutes) that JSON Schema
// for tool use can't express, and gives us a typed result.
const subtaskSchema = z.object({
  title: z.string().min(1).max(200),
  priority: priorityEnum,
  estimatedMinutes: z.number().int().positive().max(100000),
})

const breakdownOutputSchema = z.object({
  subtasks: z.array(subtaskSchema).min(1),
})

// JSON Schema for the forced `create_subtasks` tool call. Keep in sync with
// the Zod schema above.
const CREATE_SUBTASKS_SCHEMA: Anthropic.Tool.InputSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    subtasks: {
      type: 'array',
      description: 'The ordered subtasks, in the sequence they should be done.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          title: { type: 'string', description: 'A specific, actionable subtask.' },
          priority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            description: 'How blocking/urgent this subtask is relative to the others.',
          },
          estimatedMinutes: {
            type: 'integer',
            description: 'Realistic whole-number estimate of focused work, in minutes.',
          },
        },
        required: ['title', 'priority', 'estimatedMinutes'],
      },
    },
  },
  required: ['subtasks'],
} as const

const SYSTEM_PROMPT = `You are the Breakdown agent inside TaskAgent, a personal task manager.
Given a single task, decompose it into 3-7 concrete, ordered subtasks the user can act on immediately.

Rules:
- Each subtask is a specific action, not a vague theme. Prefer "Book round-trip flights" over "Travel logistics".
- Order the subtasks in the sequence they should be done.
- estimatedMinutes is a realistic whole-number estimate of focused work for that one subtask.
- priority reflects how blocking or urgent the subtask is relative to the others.
- Keep each title under ~80 characters.
- Do not restate the parent task as a subtask, and do not add filler steps like "review the plan" or "get started".

Always respond by calling the create_subtasks tool.`

// Defensive cap so a misbehaving response can't create hundreds of rows.
const MAX_SUBTASKS = 12

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
}): Promise<BreakdownResult> {
  const { userId, task } = params

  const run = await prisma.agentRun.create({
    data: {
      userId,
      taskId: task.id,
      agentType: 'BREAKDOWN',
      status: 'PENDING',
      input: { taskId: task.id, title: task.title, priority: task.priority },
    },
  })

  try {
    const userPrompt =
      `Task: ${task.title}` +
      (task.description ? `\n\nDetails: ${task.description}` : '') +
      `\n\nCurrent priority: ${task.priority}`

    const message = await claude.messages.create({
      model: AGENT_MODEL,
      max_tokens: 2048,
      // Disabled for snappy UX — the forced tool call returns structured
      // data directly, so reasoning tokens add latency without value here.
      thinking: { type: 'disabled' },
      system: [
        // cache_control is the documented pattern; it only takes effect once
        // the prompt exceeds the model's minimum cacheable prefix.
        { type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
      ],
      tools: [
        {
          name: 'create_subtasks',
          description: 'Record the ordered list of subtasks the parent task breaks down into.',
          input_schema: CREATE_SUBTASKS_SCHEMA,
        },
      ],
      tool_choice: { type: 'tool', name: 'create_subtasks' },
      messages: [{ role: 'user', content: userPrompt }],
    })

    const toolUse = message.content.find((block) => block.type === 'tool_use')
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new Error('The agent did not return any subtasks.')
    }

    const { subtasks } = breakdownOutputSchema.parse(toolUse.input)
    const capped = subtasks.slice(0, MAX_SUBTASKS)

    // Create the child rows in order, in one transaction, so we can return
    // the persisted rows (with ids) to the client.
    const created = await prisma.$transaction(
      capped.map((s) =>
        prisma.task.create({
          data: {
            userId,
            parentId: task.id,
            title: s.title,
            priority: s.priority,
            estimatedMinutes: s.estimatedMinutes,
          },
        }),
      ),
    )

    const tokensUsed = message.usage.input_tokens + message.usage.output_tokens
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        output: { subtasks: capped },
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
