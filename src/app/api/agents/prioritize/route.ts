import { runPrioritizeAgent } from '@/lib/agents/prioritize'
import { agentRoute } from '@/lib/agent-route'

export const maxDuration = 60

export const POST = agentRoute({
  errorMessage: 'Could not prioritize. Please try again.',
  handler: async ({ userId, demo }) => {
    const { rationale, updated } = await runPrioritizeAgent({ userId, demo })
    return { rationale, updated, demo }
  },
})
