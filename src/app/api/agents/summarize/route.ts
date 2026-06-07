import { breakdownRequestSchema } from '@/lib/validators' // also just { taskId }
import { runSummarizeAgent } from '@/lib/agents/summarize'
import { agentRoute } from '@/lib/agent-route'

export const maxDuration = 60

export const POST = agentRoute({
  schema: breakdownRequestSchema,
  errorMessage: 'The summary failed. Please try again.',
  handler: async ({ userId, input, demo }) => {
    const { summary } = await runSummarizeAgent({ userId, taskId: input.taskId, demo })
    return { summary, demo }
  },
})
