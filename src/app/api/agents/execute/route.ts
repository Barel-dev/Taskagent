import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { executeRequestSchema } from '@/lib/validators'
import { getTaskForUser } from '@/lib/tasks'
import { runExecuteAgent } from '@/lib/agents/execute'

// Web search can take 10–20s; give the route room.
export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = executeRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const task = await getTaskForUser(session.user.id, parsed.data.taskId)
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 })

  // No API key → free demo mode. Real web search runs once GEMINI_API_KEY is set.
  const demo = !process.env.GEMINI_API_KEY

  try {
    const { result, sources } = await runExecuteAgent({
      userId: session.user.id,
      task,
      reply: parsed.data.reply,
      demo,
    })
    return NextResponse.json({ result, sources, demo }, { status: 200 })
  } catch (err) {
    console.error('Execute agent failed:', err)
    return NextResponse.json(
      { error: 'The agent failed to run the task. Please try again.' },
      { status: 502 },
    )
  }
}
