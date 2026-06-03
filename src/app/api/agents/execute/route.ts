import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { executeRequestSchema } from '@/lib/validators'
import { getTaskForUser } from '@/lib/tasks'
import { runExecuteAgent } from '@/lib/agents/execute'
import { agentRateLimitOk, isQuotaError } from '@/lib/rate-limit'

// Web search can take 10–20s; give the route room.
export const maxDuration = 60

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
  const parsed = executeRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const task = await getTaskForUser(session.user.id, parsed.data.taskId)
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // No API key → free demo mode. Real web search runs once GEMINI_API_KEY is set.
  const demo = !process.env.GEMINI_API_KEY

  try {
    const { result, sources } = await runExecuteAgent({
      userId: session.user.id,
      task,
      reply: parsed.data.reply,
      demo,
    })
    return NextResponse.json({ result, sources, demo }, { status: 200 })
  } catch (err) {
    console.error('Execute agent failed:', err)
    if (isQuotaError(err)) {
      return NextResponse.json(
        { error: 'AI quota reached for now — please try again in a bit.' },
        { status: 429 },
      )
    }
    return NextResponse.json(
      { error: 'The agent failed to run the task. Please try again.' },
      { status: 502 },
    )
  }
}
