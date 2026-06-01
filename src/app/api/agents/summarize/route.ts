import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { breakdownRequestSchema } from '@/lib/validators' // also just { taskId }
import { runSummarizeAgent } from '@/lib/agents/summarize'

export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = breakdownRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const demo = !process.env.GEMINI_API_KEY

  try {
    const { summary } = await runSummarizeAgent({
      userId: session.user.id,
      taskId: parsed.data.taskId,
      demo,
    })
    return NextResponse.json({ summary, demo }, { status: 200 })
  } catch (err) {
    console.error('Summarize agent failed:', err)
    return NextResponse.json({ error: 'The summary failed. Please try again.' }, { status: 502 })
  }
}
