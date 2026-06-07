import { scheduleRequestSchema } from '@/lib/validators'
import { getTaskForUser } from '@/lib/tasks'
import { runScheduleAgent } from '@/lib/agents/schedule'
import {
  getGoogleAccessToken,
  getCalendarBusy,
  GoogleAuthError,
  type BusyInterval,
} from '@/lib/google'
import { agentRoute, AgentHttpError } from '@/lib/agent-route'

// Propose calendar slots for a task. Proposing never writes to the calendar —
// creating the event is a separate, user-approved step at .../schedule/commit.
export const POST = agentRoute({
  schema: scheduleRequestSchema,
  errorMessage: 'The agent failed to propose times. Please try again.',
  handler: async ({ userId, input, demo }) => {
    const task = await getTaskForUser(userId, input.taskId)
    if (!task) throw new AgentHttpError(404, 'Task not found')

    const timeZone = input.timeZone ?? 'UTC'

    // Read busy times best-effort: if Calendar access isn't granted yet, still
    // propose slots (with no busy data) and flag needsReconnect so the UI can
    // warn — the user only strictly needs Calendar access at the commit step.
    let busy: BusyInterval[] = []
    let needsReconnect = false
    try {
      const accessToken = await getGoogleAccessToken(userId)
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

    const { slots } = await runScheduleAgent({ userId, task, busy, timeZone, demo })
    return { slots, demo, needsReconnect }
  },
})
