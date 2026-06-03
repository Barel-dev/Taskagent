import { z } from 'zod'
import { Type } from '@google/genai'
import { getGemini, GEMINI_MODEL } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'
import { priorityEnum } from '@/lib/validators'

// The Prioritizer agent looks at all open top-level tasks and reassigns their
// priority based on due dates, urgency, and dependencies — then explains why.

export type PrioritizeResult = { agentRunId: string; rationale: string; updated: number }

const outputSchema = z.object({
  rationale: z.string(),
  tasks: z.array(z.object({ id: z.string(), priority: priorityEnum })),
})

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    rationale: { type: Type.STRING, description: 'A 1-2 sentence explanation of the ordering.' },
    tasks: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] },
        },
        required: ['id', 'priority'],
      },
    },
  },
  required: ['rationale', 'tasks'],
}

const SYSTEM_PROMPT = `You are the Prioritizer agent inside TaskAgent. Given the user's open tasks, decide the right priority for each (LOW, MEDIUM, HIGH, URGENT) based on due dates, urgency, effort, and dependencies between tasks.

Return every task's id with its new priority, and a 1-2 sentence plain-text rationale (no Markdown). Be decisive — don't mark everything HIGH.`

export async function runPrioritizeAgent(params: {
  userId: string
  demo?: boolean
}): Promise<PrioritizeResult> {
  const { userId, demo = false } = params

  const tasks = await prisma.task.findMany({
    where: { userId, parentId: null, status: { not: 'DONE' } },
    orderBy: { createdAt: 'asc' },
  })

  const run = await prisma.agentRun.create({
    data: {
      userId,
      agentType: 'PRIORITIZER',
      status: 'PENDING',
      input: { count: tasks.length, demo },
    },
  })

  try {
    let rationale: string
    let tokensUsed = 0
    let updatedCount = 0

    if (tasks.length === 0) {
      rationale = 'No open tasks to prioritize.'
    } else if (demo) {
      rationale = 'Demo mode — add a Gemini API key to let the agent reprioritize your day.'
    } else {
      const list = tasks
        .map(
          (t) =>
            `- id:${t.id} | ${t.title} | priority:${t.priority}` +
            (t.dueDate ? ` | due:${t.dueDate.toISOString().slice(0, 10)}` : ''),
        )
        .join('\n')

      const response = await getGemini().models.generateContent({
        model: GEMINI_MODEL,
        contents: `Today is ${new Date().toISOString().slice(0, 10)}.\n\nOpen tasks:\n${list}`,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      })

      const parsed = outputSchema.parse(JSON.parse(response.text ?? '{}'))
      rationale = parsed.rationale
      tokensUsed = response.usageMetadata?.totalTokenCount ?? 0

      // Only apply updates to tasks that actually belong to this user.
      const valid = new Set(tasks.map((t) => t.id))
      const updates = parsed.tasks.filter((u) => valid.has(u.id))
      await prisma.$transaction(
        updates.map((u) => prisma.task.update({ where: { id: u.id }, data: { priority: u.priority } })),
      )
      updatedCount = updates.length
    }

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        output: { demo, rationale, updated: updatedCount },
        tokensUsed,
        completedAt: new Date(),
      },
    })

    return { agentRunId: run.id, rationale, updated: updatedCount }
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
