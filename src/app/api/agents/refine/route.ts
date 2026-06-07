import { refineRequestSchema } from '@/lib/validators'
import { getTaskForUser } from '@/lib/tasks'
import { runRefineAgent } from '@/lib/agents/refine'
import { agentRoute, AgentHttpError } from '@/lib/agent-route'

export const POST = agentRoute({
  schema: refineRequestSchema,
  errorMessage: 'The agent failed to refine the task. Please try again.',
  handler: async ({ userId, input, demo }) => {
    const task = await getTaskForUser(userId, input.taskId)
    if (!task) throw new AgentHttpError(404, 'Task not found')
    const result = await runRefineAgent({ task, demo })
    return { ...result, demo }
  },
})
