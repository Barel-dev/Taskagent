import { runWeeklyReviewAgent } from '@/lib/agents/weekly-review'
import { agentRoute } from '@/lib/agent-route'

export const maxDuration = 60

export const POST = agentRoute({
  errorMessage: 'Could not build your weekly review. Please try again.',
  handler: async ({ userId, demo }) => {
    const { review } = await runWeeklyReviewAgent({ userId, demo })
    return { review, demo }
  },
})
