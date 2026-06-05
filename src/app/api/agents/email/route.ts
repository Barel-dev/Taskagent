import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { draftEmailRequestSchema } from '@/lib/validators'
import { getTaskForUser } from '@/lib/tasks'
import { runEmailDraftAgent } from '@/lib/agents/email'
import { agentRateLimitOk, isQuotaError } from '@/lib/rate-limit'

// Draft an email with the Email agent. Drafting never sends — sending is a
// separate, user-approved step at /api/agents/email/send.
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
  const parsed = draftEmailRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // If the email is about a task, load it (and verify ownership) for context.
  let task = undefined
  if (parsed.data.taskId) {
    const found = await getTaskForUser(session.user.id, parsed.data.taskId)
    if (!found) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    task = { id: found.id, title: found.title, description: found.description }
  }

  // No API key → free demo mode. Real drafting runs once GEMINI_API_KEY is set.
  const demo = !process.env.GEMINI_API_KEY

  try {
    const { draft } = await runEmailDraftAgent({
      userId: session.user.id,
      instruction: parsed.data.instruction,
      task,
      demo,
    })
    return NextResponse.json({ draft, demo }, { status: 200 })
  } catch (err) {
    console.error('Email draft agent failed:', err)
    if (isQuotaError(err)) {
      return NextResponse.json(
        { error: 'AI quota reached for now — please try again in a bit.' },
        { status: 429 },
      )
    }
    return NextResponse.json(
      { error: 'The agent failed to draft the email. Please try again.' },
      { status: 502 },
    )
  }
}
