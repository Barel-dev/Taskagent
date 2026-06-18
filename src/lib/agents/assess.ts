import { z } from 'zod'
import { Type } from '@google/genai'
import { getGemini, GEMINI_MODEL } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

// The Assess agent reviews a task (with its subtasks and saved context) and
// surfaces the likely risks — each with a concrete mitigation — plus any
// blockers/prerequisites to resolve first. Advisory only: it never edits the
// task. Logs an ASSESS AgentRun like the other agents.

export const assessOutputSchema = z.object({
  assessment: z.string().min(1).max(600),
  risks: z
    .array(z.object({ risk: z.string().min(1).max(300), mitigation: z.string().min(1).max(300) }))
    .max(8),
  blockers: z.array(z.string().min(1).max(300)).max(8),
})
export type AssessResult = z.infer<typeof assessOutputSchema> & { agentRunId: string }

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    assessment: {
      type: Type.STRING,
      description: 'One or two plain-text lines: an overall read on how risky/ready this task is.',
    },
    risks: {
      type: Type.ARRAY,
      description: 'The most important risks, each with a concrete mitigation.',
      items: {
        type: Type.OBJECT,
        properties: {
          risk: { type: Type.STRING, description: 'A specific risk to this task.' },
          mitigation: {
            type: Type.STRING,
            description: 'A concrete way to reduce or handle it.',
          },
        },
        required: ['risk', 'mitigation'],
        propertyOrdering: ['risk', 'mitigation'],
      },
    },
    blockers: {
      type: Type.ARRAY,
      description: 'Prerequisites or dependencies to resolve first (omit if there are none).',
      items: { type: Type.STRING },
    },
  },
  required: ['assessment', 'risks', 'blockers'],
  propertyOrdering: ['assessment', 'risks', 'blockers'],
}

const SYSTEM_PROMPT = `You are the Assess agent inside TaskAgent. Given a task (plus any subtasks and saved context), surface what could go wrong and what must happen first.

- assessment: 1-2 plain sentences on how risky or ready this task looks.
- risks: the 3-6 most important, SPECIFIC risks for THIS task — each with a concrete, actionable mitigation. No generic filler.
- blockers: concrete prerequisites or dependencies to resolve first; return an empty list if there are none.

Be specific to the task and do not invent facts. Plain text only — no Markdown symbols. Return only JSON matching the schema.`

export function demoAssess(title: string): Omit<AssessResult, 'agentRunId'> {
  return {
    assessment: `Demo mode — add a GEMINI_API_KEY and the agent will assess "${title.slice(0, 60)}" for real.`,
    risks: [
      {
        risk: 'The scope is larger than it first looks',
        mitigation: 'Break it into smaller, time-boxed steps and start the riskiest one early',
      },
      {
        risk: 'A dependency slips and stalls the rest',
        mitigation: 'Identify the long-lead item and kick it off first',
      },
    ],
    blockers: [],
  }
}

export async function runAssessAgent(params: {
  userId: string
  taskId: string
  demo?: boolean
}): Promise<AssessResult> {
  const { userId, taskId, demo = false } = params

  const task = await prisma.task.findFirst({
    where: { id: taskId, userId },
    include: { children: { orderBy: { createdAt: 'asc' } } },
  })
  if (!task) throw new Error('Task not found')

  const run = await prisma.agentRun.create({
    data: {
      userId,
      taskId: task.id,
      agentType: 'ASSESS',
      status: 'PENDING',
      input: { taskId: task.id, title: task.title, demo },
    },
  })

  try {
    let result: Omit<AssessResult, 'agentRunId'>
    let tokensUsed = 0

    if (demo) {
      result = demoAssess(task.title)
    } else {
      const childLines = task.children.map((c) => `- ${c.title} [${c.status}]`).join('\n')
      const prompt = [
        `TASK: ${task.title}` + (task.description ? ` — ${task.description}` : ''),
        task.context ? `\nKNOWN CONTEXT:\n${task.context}` : '',
        task.children.length ? `\nSUBTASKS:\n${childLines}` : '',
      ]
        .filter(Boolean)
        .join('\n')

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
      if (!text) throw new Error('The agent did not return an assessment.')
      result = assessOutputSchema.parse(JSON.parse(text))
      tokensUsed = response.usageMetadata?.totalTokenCount ?? 0
    }

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'SUCCESS', output: { demo, ...result }, tokensUsed, completedAt: new Date() },
    })

    return { agentRunId: run.id, ...result }
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
