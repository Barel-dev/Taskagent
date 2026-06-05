import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { scheduleCommitSchema } from '@/lib/validators'
import { getTaskForUser, setTaskSchedule } from '@/lib/tasks'
import { getGoogleAccessToken, createCalendarEvent, GoogleAuthError } from '@/lib/google'

// Create the calendar event for the slot the user picked and approved, then
// record it on the task. Only ever hit when the user clicks "Add to calendar".
export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = scheduleCommitSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const { taskId, start, end, timeZone } = parsed.data
  if (end <= start) {
    return NextResponse.json({ error: 'End must be after start' }, { status: 400 })
  }

  const task = await getTaskForUser(session.user.id, taskId)
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  try {
    const accessToken = await getGoogleAccessToken(session.user.id)
    const event = await createCalendarEvent({
      accessToken,
      summary: task.title,
      description: task.description ?? undefined,
      start: start.toISOString(),
      end: end.toISOString(),
      timeZone: timeZone ?? 'UTC',
    })
    await setTaskSchedule(session.user.id, taskId, {
      scheduledStart: start,
      scheduledEnd: end,
      calendarEventId: event.id,
    })
    return NextResponse.json({ ok: true, htmlLink: event.htmlLink }, { status: 200 })
  } catch (err) {
    if (err instanceof GoogleAuthError) {
      return NextResponse.json({ error: err.message, needsReconnect: true }, { status: 403 })
    }
    console.error('Calendar event create failed:', err)
    return NextResponse.json(
      { error: 'Could not add the event to your calendar. Please try again.' },
      { status: 502 },
    )
  }
}
