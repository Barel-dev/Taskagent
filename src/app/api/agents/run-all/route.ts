import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { breakdownRequestSchema } from '@/lib/validators' // also just { taskId }
import { getTaskForUser } from '@/lib/tasks'
import { prisma } from '@/lib/prisma'
import { runExecuteAgent } from '@/lib/agents/execute'
import { agentRateLimitOk } from '@/lib/rate-limit'

export const maxDuration = 60

// Cap how many subtasks one "Do all" runs. Each web-search subtask takes
// ~10s, so 5 keeps the request under the serverless 60s function limit.
const MAX_RUN = 5

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await agentRateLimitOk(session.user.id))) {
    return NextResponse.json(
      { error: 'You’re going too fast — give the agents a moment.' },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = breakdownRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const parent = await getTaskForUser(session.user.id, parsed.data.taskId)
  if (!parent) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const children = await prisma.task.findMany({
    where: { userId: session.user.id, parentId: parent.id, status: { not: 'DONE' } },
    orderBy: { createdAt: 'asc' },
    take: MAX_RUN,
  })

  const demo = !process.env.GEMINI_API_KEY

  // Run sequentially so each subtask's result becomes shared context for the
  // next one (the Execute agent reads sibling results).
  const results: { taskId: string; result: string; sources: { title: string; uri: string }[] }[] =
    []
  for (const child of children) {
    try {
      const r = await runExecuteAgent({
        userId: session.user.id,
        task: {
          id: child.id,
          title: child.title,
          description: child.description,
          parentId: child.parentId,
        },
        demo,
      })
      results.push({ taskId: child.id, result: r.result, sources: r.sources })
    } catch (err) {
      console.error('Do all: a subtask failed, continuing:', err)
    }
  }

  return NextResponse.json(
    { ran: results.length, total: children.length, results, demo },
    { status: 200 },
  )
}
