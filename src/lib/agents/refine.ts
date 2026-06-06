import { z } from 'zod'
import { Type } from '@google/genai'
import type { Task } from '@prisma/client'
import { getGemini, GEMINI_MODEL } from '@/lib/gemini'

// The Refine agent sharpens a vague/terse task into a clear title, description,
// and acceptance criteria. Like the chat router, it does not log its own
// AgentRun (the AgentType enum has no REFINE value, and we avoid an enum
// migration); it's a pure transform the user reviews before applying.

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
  task: Pick<Task, 'title' | 'description'>
  demo?: boolean
}): Promise<RefineResult> {
  const { task, demo = false } = params
  if (demo) return demoRefine(task.title)

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
  return refineOutputSchema.parse(JSON.parse(text))
}
