import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { refineRequestSchema } from '@/lib/validators'
import { getTaskForUser } from '@/lib/tasks'
import { runRefineAgent } from '@/lib/agents/refine'
import { agentRateLimitOk, isQuotaError } from '@/lib/rate-limit'

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
  const parsed = refineRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const task = await getTaskForUser(session.user.id, parsed.data.taskId)
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const demo = !process.env.GEMINI_API_KEY

  try {
    const result = await runRefineAgent({ task, demo })
    return NextResponse.json({ ...result, demo }, { status: 200 })
  } catch (err) {
    console.error('Refine agent failed:', err)
    if (isQuotaError(err)) {
      return NextResponse.json(
        { error: 'AI quota reached for now — please try again in a bit.' },
        { status: 429 },
      )
    }
    return NextResponse.json(
      { error: 'The agent failed to refine the task. Please try again.' },
      { status: 502 },
    )
  }
}
