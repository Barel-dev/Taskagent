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

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'The Breakdown agent is not configured (missing ANTHROPIC_API_KEY).' },
      { status: 503 },
    )
  }

  const task = await getTaskForUser(session.user.id, parsed.data.taskId)
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  if (task.parentId) {
    return NextResponse.json({ error: 'A subtask can’t be broken down.' }, { status: 400 })
  }

  try {
    const { subtasks } = await runBreakdownAgent({
      userId: session.user.id,
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
      },
    })
    return NextResponse.json({ subtasks }, { status: 201 })
  } catch (err) {
    console.error('Breakdown agent failed:', err)
    return NextResponse.json(
      { error: 'The Breakdown agent failed. Please try again.' },
      { status: 502 },
    )
  }
}
