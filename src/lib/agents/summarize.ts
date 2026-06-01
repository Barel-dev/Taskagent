import { getGemini, GEMINI_MODEL } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

// The Summarize agent rolls a plan up into a short, skimmable briefing:
// where it stands, the key findings the agents produced, and what's next.

export type SummarizeResult = { agentRunId: string; summary: string }

const SYSTEM_PROMPT = `You are the Summary agent inside TaskAgent. You are given a plan: a main task and its subtasks, including any results the agents already produced.

Write a short, skimmable briefing:
- Where the plan stands (what's done vs not).
- The key findings, decisions, or numbers from the agent results so far.
- The clear next steps.

Plain text only — no Markdown symbols like ** or #. Use simple dash bullets. Keep it tight (a few short bullets).`

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

export async function runSummarizeAgent(params: {
  userId: string
  taskId: string
  demo?: boolean
}): Promise<SummarizeResult> {
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
      agentType: 'BRIEFING',
      status: 'PENDING',
      input: { taskId: task.id, title: task.title, demo },
    },
  })

  try {
    let summary: string
    let tokensUsed = 0

    if (demo) {
      summary =
        `Demo mode — add a Gemini API key and the agent will summarize ` +
        `“${task.title}” and its ${task.children.length} subtask(s) here.`
    } else {
      const childLines = task.children.map(
        (c) =>
          `- [${c.status === 'DONE' ? 'x' : ' '}] ${c.title}` +
          (c.result ? `\n    findings: ${truncate(c.result, 500)}` : ''),
      )
      const prompt = [
        `PLAN: ${task.title}` + (task.description ? ` — ${task.description}` : ''),
        task.context ? `\nUser context: ${task.context}` : '',
        `\nSUBTASKS:\n${childLines.join('\n') || '(no subtasks yet)'}`,
      ]
        .filter(Boolean)
        .join('\n')

      const response = await getGemini().models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { systemInstruction: SYSTEM_PROMPT },
      })

      summary = response.text?.trim() ?? ''
      if (!summary) throw new Error('The agent did not return a summary.')
      tokensUsed = response.usageMetadata?.totalTokenCount ?? 0
    }

    await prisma.task.update({
      where: { id: task.id },
      data: { summary, summaryAt: new Date() },
    })

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'SUCCESS', output: { demo, summary }, tokensUsed, completedAt: new Date() },
    })

    return { agentRunId: run.id, summary }
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
