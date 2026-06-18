import { getGemini, GEMINI_MODEL } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

// The Weekly Review agent looks back at the last 7 days — what got done, what
// slipped, how the agents were used — and writes a short, honest retro with a
// suggested focus for the coming week. Logged as a WEEKLY_REVIEW run (the
// output also carries kind:'weekly-review' for older dashboard queries).

export type WeeklyReviewResult = { agentRunId: string; review: string }

const SYSTEM_PROMPT = `You are the Weekly Review agent inside TaskAgent, a personal task manager. Given a snapshot of the user's last 7 days, write a short weekly retro:
- start with the wins: what they completed (call out the most meaningful items)
- name what slipped: overdue tasks and anything untouched
- one or two concrete suggestions for next week's focus
- keep it honest but encouraging.

Plain text only — no Markdown symbols. A few short paragraphs or dash lines, concise.`

export async function runWeeklyReviewAgent(params: {
  userId: string
  demo?: boolean
}): Promise<WeeklyReviewResult> {
  const { userId, demo = false } = params

  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)

  const [completed, overdue, created, runsCount] = await Promise.all([
    prisma.task.findMany({
      where: { userId, completedAt: { gte: weekAgo } },
      orderBy: { completedAt: 'asc' },
      select: { title: true, priority: true, estimatedMinutes: true },
    }),
    prisma.task.findMany({
      where: { userId, status: { not: 'DONE' }, dueDate: { lt: new Date() } },
      orderBy: { dueDate: 'asc' },
      select: { title: true, dueDate: true },
      take: 15,
    }),
    prisma.task.count({ where: { userId, createdAt: { gte: weekAgo } } }),
    prisma.agentRun.count({ where: { userId, createdAt: { gte: weekAgo } } }),
  ])

  const run = await prisma.agentRun.create({
    data: {
      userId,
      agentType: 'WEEKLY_REVIEW',
      status: 'PENDING',
      input: { kind: 'weekly-review', completed: completed.length, overdue: overdue.length, demo },
    },
  })

  try {
    let review: string
    let tokensUsed = 0

    if (demo) {
      review = 'Demo mode — add a Gemini API key and the agent will write your weekly review here.'
    } else if (completed.length === 0 && overdue.length === 0 && created === 0) {
      review = 'A quiet week — nothing completed, created, or overdue. Add a goal to get rolling.'
    } else {
      const doneLines = completed.length
        ? completed
            .map(
              (t) =>
                `- ${t.title} (${t.priority}${t.estimatedMinutes ? `, ~${t.estimatedMinutes}min` : ''})`,
            )
            .join('\n')
        : '(nothing completed)'
      const overdueLines = overdue.length
        ? overdue
            .map((t) => `- ${t.title} (due ${t.dueDate?.toISOString().slice(0, 10)})`)
            .join('\n')
        : '(nothing overdue)'

      const response = await getGemini().models.generateContent({
        model: GEMINI_MODEL,
        contents: [
          `Today is ${new Date().toISOString().slice(0, 10)}.`,
          `COMPLETED THIS WEEK (${completed.length}):\n${doneLines}`,
          `CURRENTLY OVERDUE:\n${overdueLines}`,
          `Also this week: ${created} new task(s) created, ${runsCount} agent run(s).`,
        ].join('\n\n'),
        config: { systemInstruction: SYSTEM_PROMPT },
      })

      review = response.text?.trim() ?? ''
      if (!review) throw new Error('The agent did not return a review.')
      tokensUsed = response.usageMetadata?.totalTokenCount ?? 0
    }

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        output: { demo, kind: 'weekly-review', review },
        tokensUsed,
        completedAt: new Date(),
      },
    })

    return { agentRunId: run.id, review }
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
