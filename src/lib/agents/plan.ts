import { z } from 'zod'
import { Type } from '@google/genai'
import type { Priority, Task } from '@prisma/client'
import { getGemini, GEMINI_MODEL } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'
import { priorityEnum } from '@/lib/validators'
import { subtaskSchema, demoSubtasks } from '@/lib/agents/breakdown'

// The Planner turns a plain-language goal into a brand-new task plus its
// subtasks — "the agent makes the task". Reuses the same subtask shape and
// free demo fallback as the Breakdown agent.

const planOutputSchema = z.object({
  title: z.string().min(1).max(200),
  priority: priorityEnum,
  subtasks: z.array(subtaskSchema).min(1),
})

const PLAN_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'A concise, imperative task title capturing the goal (under ~80 chars).',
    },
    priority: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
    subtasks: {
      type: Type.ARRAY,
      description: 'The ordered subtasks, in the sequence they should be done.',
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
          estimatedMinutes: { type: Type.INTEGER },
        },
        required: ['title', 'priority', 'estimatedMinutes'],
        propertyOrdering: ['title', 'priority', 'estimatedMinutes'],
      },
    },
  },
  required: ['title', 'priority', 'subtasks'],
  propertyOrdering: ['title', 'priority', 'subtasks'],
}

const SYSTEM_PROMPT = `You are the Planner agent inside TaskAgent, a personal task manager.
The user gives you a short goal in plain language. Turn it into ONE actionable task plus its subtasks.

Produce:
- title: a concise, imperative task title that captures the goal (under ~80 characters).
- priority: the overall priority of the task (LOW, MEDIUM, HIGH, URGENT).
- subtasks: 3-7 concrete, ordered steps. Each is a specific action, not a vague theme. Include a realistic
  whole-number estimatedMinutes and a priority relative to the other subtasks.

Do not add filler steps like "review the plan" or "get started". Return only JSON matching the schema.`

const MAX_SUBTASKS = 12

export type PlanResult = {
  agentRunId: string
  task: Task & { children: Task[] }
}

/**
 * Run the Planner agent: create a new task (with subtasks) from a free-text
 * goal. Logs an AgentRun. Throws on failure (after recording it as ERROR).
 */
export async function runPlanAgent(params: {
  userId: string
  goal: string
  /** When true, skip the Gemini call and return a free placeholder plan. */
  demo?: boolean
}): Promise<PlanResult> {
  const { userId, goal, demo = false } = params

  const run = await prisma.agentRun.create({
    data: {
      userId,
      agentType: 'BREAKDOWN',
      status: 'PENDING',
      input: { goal, demo },
    },
  })

  try {
    let title: string
    let priority: Priority
    let subtasks: z.infer<typeof subtaskSchema>[]
    let tokensUsed = 0

    if (demo) {
      title = goal.trim().slice(0, 200) || 'New task'
      priority = 'MEDIUM'
      subtasks = demoSubtasks(title)
    } else {
      const response = await getGemini().models.generateContent({
        model: GEMINI_MODEL,
        contents: `Goal: ${goal}`,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: PLAN_RESPONSE_SCHEMA,
        },
      })

      const text = response.text
      if (!text) throw new Error('The agent did not return a plan.')

      const parsed = planOutputSchema.parse(JSON.parse(text))
      title = parsed.title
      priority = parsed.priority
      subtasks = parsed.subtasks
      tokensUsed = response.usageMetadata?.totalTokenCount ?? 0
    }

    const capped = subtasks.slice(0, MAX_SUBTASKS)

    // Create the parent task and its subtasks atomically.
    const task = await prisma.task.create({
      data: {
        userId,
        title,
        priority,
        children: {
          create: capped.map((s) => ({
            userId,
            title: s.title,
            priority: s.priority,
            estimatedMinutes: s.estimatedMinutes,
          })),
        },
      },
      include: { children: { orderBy: { createdAt: 'asc' } } },
    })

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        taskId: task.id,
        output: { demo, title, subtasks: capped },
        tokensUsed,
        completedAt: new Date(),
      },
    })

    return { agentRunId: run.id, task }
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
