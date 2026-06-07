import { planRequestSchema } from '@/lib/validators'
import { runPlanAgent } from '@/lib/agents/plan'
import { agentRoute } from '@/lib/agent-route'

// The Gemini call can take several seconds; give the route room to run.
export const maxDuration = 60

export const POST = agentRoute({
  schema: planRequestSchema,
  status: 201,
  errorMessage: 'The Planner agent failed. Please try again.',
  handler: async ({ userId, input, demo }) => {
    const { task } = await runPlanAgent({ userId, goal: input.goal, demo })
    // Serialize Date fields for the client component.
    const serialized = {
      ...task,
      dueDate: task.dueDate?.toISOString() ?? null,
      children: task.children.map((c) => ({ ...c, dueDate: c.dueDate?.toISOString() ?? null })),
    }
    return { task: serialized, demo }
  },
})
