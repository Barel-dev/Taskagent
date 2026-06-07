import { breakdownRequestSchema } from '@/lib/validators'
import { getTaskForUser } from '@/lib/tasks'
import { runBreakdownAgent } from '@/lib/agents/breakdown'
import { agentRoute, AgentHttpError } from '@/lib/agent-route'

// The Gemini call can take several seconds; give the route room to run.
export const maxDuration = 60

export const POST = agentRoute({
  schema: breakdownRequestSchema,
  status: 201,
  errorMessage: 'The Breakdown agent failed. Please try again.',
  handler: async ({ userId, input, demo }) => {
    const task = await getTaskForUser(userId, input.taskId)
    if (!task) throw new AgentHttpError(404, 'Task not found')
    const { subtasks } = await runBreakdownAgent({
      userId,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
      },
      demo,
    })
    return { subtasks, demo }
  },
})
