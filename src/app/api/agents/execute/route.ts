import { executeRequestSchema } from '@/lib/validators'
import { getTaskForUser } from '@/lib/tasks'
import { runExecuteAgent } from '@/lib/agents/execute'
import { agentRoute, AgentHttpError } from '@/lib/agent-route'

// Web search can take 10–20s; give the route room.
export const maxDuration = 60

export const POST = agentRoute({
  schema: executeRequestSchema,
  errorMessage: 'The agent failed to run the task. Please try again.',
  handler: async ({ userId, input, demo }) => {
    const task = await getTaskForUser(userId, input.taskId)
    if (!task) throw new AgentHttpError(404, 'Task not found')
    const { result, sources } = await runExecuteAgent({ userId, task, reply: input.reply, demo })
    return { result, sources, demo }
  },
})
