import { runBriefingAgent } from '@/lib/agents/briefing'
import { agentRoute } from '@/lib/agent-route'

export const maxDuration = 60

export const POST = agentRoute({
  errorMessage: 'Could not build a briefing. Please try again.',
  handler: async ({ userId, demo }) => {
    const { briefing } = await runBriefingAgent({ userId, demo })
    return { briefing, demo }
  },
})
