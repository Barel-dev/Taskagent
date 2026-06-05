import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { scheduleRequestSchema } from '@/lib/validators'
import { getTaskForUser } from '@/lib/tasks'
import { runScheduleAgent } from '@/lib/agents/schedule'
import { getGoogleAccessToken, getCalendarBusy, GoogleAuthError } from '@/lib/google'
import { agentRateLimitOk, isQuotaError } from '@/lib/rate-limit'

// Propose calendar slots for a task. Proposing never writes to the calendar —
// creating the event is a separate, user-approved step at .../schedule/commit.
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
  const parsed = scheduleRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const task = await getTaskForUser(session.user.id, parsed.data.taskId)
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  const timeZone = parsed.data.timeZone ?? 'UTC'

  // Read busy times best-effort: if Calendar access isn't granted yet, still
  // propose slots (with no busy data) and flag needsReconnect so the UI can
  // warn — the user only strictly needs Calendar access at the commit step.
  let busy: { start: string; end: string }[] = []
  let needsReconnect = false
  try {
    const accessToken = await getGoogleAccessToken(session.user.id)
    const now = new Date()
    const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    busy = await getCalendarBusy({
      accessToken,
      timeMin: now.toISOString(),
      timeMax: weekAhead.toISOString(),
    })
  } catch (err) {
    if (err instanceof GoogleAuthError) needsReconnect = true
    else console.error('Calendar free/busy lookup failed:', err)
  }

  // No API key → free demo mode. Real slot proposals run once GEMINI_API_KEY is set.
  const demo = !process.env.GEMINI_API_KEY

  try {
    const { slots } = await runScheduleAgent({
      userId: session.user.id,
      task,
      busy,
      timeZone,
      demo,
    })
    return NextResponse.json({ slots, demo, needsReconnect }, { status: 200 })
  } catch (err) {
    console.error('Schedule agent failed:', err)
    if (isQuotaError(err)) {
      return NextResponse.json(
        { error: 'AI quota reached for now — please try again in a bit.' },
        { status: 429 },
      )
    }
    return NextResponse.json(
      { error: 'The agent failed to propose times. Please try again.' },
      { status: 502 },
    )
  }
}
