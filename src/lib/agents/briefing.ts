import { getGemini, GEMINI_MODEL } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

// The Daily Briefing agent writes a short morning brief across all of the
// user's tasks: what to focus on, what's urgent, and a closing nudge.

export type BriefingResult = { agentRunId: string; briefing: string }

const SYSTEM_PROMPT = `You are the Daily Briefing agent inside TaskAgent. Given the user's tasks (with status, priority, due dates, and subtask progress), write a short, friendly morning brief:
- what to focus on today
- the top 2-3 priorities
- anything urgent or overdue
- a brief closing nudge.

Plain text only — no Markdown symbols. Keep it to a few short lines, warm but concise.`

export async function runBriefingAgent(params: {
  userId: string
  demo?: boolean
}): Promise<BriefingResult> {
  const { userId, demo = false } = params

  const tasks = await prisma.task.findMany({
    where: { userId, parentId: null },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    include: { children: true },
  })

  const run = await prisma.agentRun.create({
    data: {
      userId,
      agentType: 'BRIEFING',
      status: 'PENDING',
      input: { count: tasks.length, demo },
    },
  })

  try {
    let briefing: string
    let tokensUsed = 0

    if (demo) {
      briefing =
        'Demo mode — add a Gemini API key and the agent will write your daily briefing here.'
    } else if (tasks.length === 0) {
      briefing = 'You have no tasks yet. Add a goal and let the agents help you plan it.'
    } else {
      const list = tasks
        .map((t) => {
          const done = t.children.filter((c) => c.status === 'DONE').length
          return (
            `- ${t.title} [${t.status}] priority:${t.priority}` +
            (t.dueDate ? ` due:${t.dueDate.toISOString().slice(0, 10)}` : '') +
            (t.children.length ? ` (${done}/${t.children.length} subtasks done)` : '')
          )
        })
        .join('\n')

      const response = await getGemini().models.generateContent({
        model: GEMINI_MODEL,
        contents: `Today is ${new Date().toISOString().slice(0, 10)}.\n\nTasks:\n${list}`,
        config: { systemInstruction: SYSTEM_PROMPT },
      })

      briefing = response.text?.trim() ?? ''
      if (!briefing) throw new Error('The agent did not return a briefing.')
      tokensUsed = response.usageMetadata?.totalTokenCount ?? 0
    }

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: 'SUCCESS', output: { demo, briefing }, tokensUsed, completedAt: new Date() },
    })

    return { agentRunId: run.id, briefing }
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
