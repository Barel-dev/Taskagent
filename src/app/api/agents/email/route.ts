import { draftEmailRequestSchema } from '@/lib/validators'
import { getTaskForUser } from '@/lib/tasks'
import { runEmailDraftAgent } from '@/lib/agents/email'
import { agentRoute, AgentHttpError } from '@/lib/agent-route'

// Draft an email with the Email agent. Drafting never sends — sending is a
// separate, user-approved step at /api/agents/email/send.
export const POST = agentRoute({
  schema: draftEmailRequestSchema,
  errorMessage: 'The agent failed to draft the email. Please try again.',
  handler: async ({ userId, input, demo }) => {
    // If the email is about a task, load it (and verify ownership) for context.
    let task = undefined
    if (input.taskId) {
      const found = await getTaskForUser(userId, input.taskId)
      if (!found) throw new AgentHttpError(404, 'Task not found')
      task = { id: found.id, title: found.title, description: found.description }
    }
    const { draft } = await runEmailDraftAgent({
      userId,
      instruction: input.instruction,
      task,
      demo,
    })
    return { draft, demo }
  },
})
