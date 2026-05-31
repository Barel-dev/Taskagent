import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { planRequestSchema } from '@/lib/validators'
import { runPlanAgent } from '@/lib/agents/plan'

// The Gemini call can take several seconds; give the route room to run.
export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = planRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  // No API key → free demo mode. Real Gemini runs once GEMINI_API_KEY is set.
  const demo = !process.env.GEMINI_API_KEY

  try {
    const { task } = await runPlanAgent({ userId: session.user.id, goal: parsed.data.goal, demo })
    // Serialize Date fields for the client component.
    const serialized = {
      ...task,
      dueDate: task.dueDate?.toISOString() ?? null,
      children: task.children.map((c) => ({ ...c, dueDate: c.dueDate?.toISOString() ?? null })),
    }
    return NextResponse.json({ task: serialized, demo }, { status: 201 })
  } catch (err) {
    console.error('Planner agent failed:', err)
    return NextResponse.json(
      { error: 'The Planner agent failed. Please try again.' },
      { status: 502 },
    )
  }
}
