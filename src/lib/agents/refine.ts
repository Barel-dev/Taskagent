import { z } from 'zod'
import { Type } from '@google/genai'
import type { Task } from '@prisma/client'
import { getGemini, GEMINI_MODEL } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

// The Refine agent sharpens a vague/terse task into a clear title, description,
// and acceptance criteria. It logs a REFINE AgentRun like the other agents; the
// result is a transform the user reviews before applying.

export const refineOutputSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(4000),
  acceptanceCriteria: z.array(z.string().min(1).max(300)).min(1).max(8),
})
export type RefineResult = z.infer<typeof refineOutputSchema>

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'A sharp, specific, action-oriented task title (under ~80 chars).',
    },
    description: {
      type: Type.STRING,
      description: 'A clear 1-3 sentence description of the goal, scope, and any assumptions.',
    },
    acceptanceCriteria: {
      type: Type.ARRAY,
      description: 'Concrete, checkable "done when…" conditions.',
      items: { type: Type.STRING },
    },
  },
  required: ['title', 'description', 'acceptanceCriteria'],
  propertyOrdering: ['title', 'description', 'acceptanceCriteria'],
}

const SYSTEM_PROMPT = `You are the Refine agent inside TaskAgent. Turn a vague or terse task into a sharp, actionable one.

- title: a specific, action-oriented title (under ~80 characters); prefer a strong verb.
- description: 1-3 plain sentences clarifying the goal, scope, and any sensible assumptions.
- acceptanceCriteria: 2-5 concrete, checkable "done when…" conditions.

Do not invent facts, constraints, or commitments not implied by the input. Plain text only — no Markdown. Return only JSON matching the provided schema.`

export function demoRefine(title: string): RefineResult {
  const t = title.trim() || 'this task'
  return {
    title: `${t.slice(0, 70)} — clarified`,
    description: `Demo mode — add a GEMINI_API_KEY and the Refine agent will sharpen "${t}" into a clear goal with acceptance criteria.`,
    acceptanceCriteria: [
      'The goal is clearly stated',
      'Scope and assumptions are explicit',
      'You can tell when it is done',
    ],
  }
}

export async function runRefineAgent(params: {
  userId: string
  task: Pick<Task, 'id' | 'title' | 'description'>
  demo?: boolean
}): Promise<RefineResult> {
  const { userId, task, demo = false } = params

  const run = await prisma.agentRun.create({
    data: {
      userId,
      taskId: task.id,
      agentType: 'REFINE',
      status: 'PENDING',
      input: { taskId: task.id, title: task.title, demo },
    },
  })

  try {
    let result: RefineResult
    let tokensUsed = 0

    if (demo) {
      result = demoRefine(task.title)
    } else {
      const prompt =
        `TASK: ${task.title}` + (task.description ? `\n\nCurrent details: ${task.description}` : '')

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
      if (!text) throw new Error('The agent did not return a refinement.')
      result = refineOutputSchema.parse(JSON.parse(text))
      tokensUsed = response.usageMetadata?.totalTokenCount ?? 0
    }

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'SUCCESS', output: { demo, ...result }, tokensUsed, completedAt: new Date() },
    })

    return result
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
