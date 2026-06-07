import { chatRequestSchema } from '@/lib/validators'
import { runChatAgent } from '@/lib/agents/chat'
import { agentRoute } from '@/lib/agent-route'

// Creating a task from chat may run the Planner (a Gemini call), so give it room.
export const maxDuration = 60

export const POST = agentRoute({
  schema: chatRequestSchema,
  errorMessage: 'The assistant failed to respond. Please try again.',
  handler: async ({ userId, input, demo }) => {
    const result = await runChatAgent({
      userId,
      message: input.message,
      history: input.history,
      demo,
    })
    return { ...result, demo }
  },
})
