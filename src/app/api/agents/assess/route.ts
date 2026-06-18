import { assessRequestSchema } from '@/lib/validators'
import { getTaskForUser } from '@/lib/tasks'
import { runAssessAgent } from '@/lib/agents/assess'
import { agentRoute, AgentHttpError } from '@/lib/agent-route'

export const POST = agentRoute({
  schema: assessRequestSchema,
  errorMessage: 'The agent failed to assess the task. Please try again.',
  handler: async ({ userId, input, demo }) => {
    const task = await getTaskForUser(userId, input.taskId)
    if (!task) throw new AgentHttpError(404, 'Task not found')
    const result = await runAssessAgent({ userId, taskId: input.taskId, demo })
    return { ...result, demo }
  },
})
