import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { breakdownRequestSchema } from '@/lib/validators'
import { getTaskForUser } from '@/lib/tasks'
import { runBreakdownAgent } from '@/lib/agents/breakdown'

// The Anthropic call can take several seconds; give the route room to run.
export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = breakdownRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const task = await getTaskForUser(session.user.id, parsed.data.taskId)
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  if (task.parentId) {
    return NextResponse.json({ error: 'A subtask can’t be broken down.' }, { status: 400 })
  }

  // No API key → free demo mode (deterministic placeholder subtasks). The real
  // Claude breakdown runs automatically as soon as ANTHROPIC_API_KEY is set.
  const demo = !process.env.ANTHROPIC_API_KEY

  try {
    const { subtasks } = await runBreakdownAgent({
      userId: session.user.id,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
      },
      demo,
    })
    return NextResponse.json({ subtasks, demo }, { status: 201 })
  } catch (err) {
    console.error('Breakdown agent failed:', err)
    return NextResponse.json(
      { error: 'The Breakdown agent failed. Please try again.' },
      { status: 502 },
    )
  }
}
