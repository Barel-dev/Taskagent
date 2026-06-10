import { z } from 'zod'
import { runDayPlanAgent } from '@/lib/agents/day-plan'
import { agentRoute } from '@/lib/agent-route'

export const maxDuration = 60

const schema = z.object({
  timeZone: z.string().min(1).max(64).optional(),
})

export const POST = agentRoute({
  schema,
  errorMessage: 'Could not plan your day. Please try again.',
  handler: async ({ userId, input, demo }) => {
    const { summary, blocks } = await runDayPlanAgent({
      userId,
      timeZone: input.timeZone ?? 'UTC',
      demo,
    })
    return { summary, blocks, demo }
  },
})
