import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { chatRequestSchema } from '@/lib/validators'
import { runChatAgent } from '@/lib/agents/chat'
import { agentRateLimitOk, isQuotaError } from '@/lib/rate-limit'

// Creating a task from chat may run the Planner (a Gemini call), so give it room.
export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await agentRateLimitOk(session.user.id))) {
    return NextResponse.json(
      { error: 'You’re going too fast — give the agents a moment.' },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = chatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const demo = !process.env.GEMINI_API_KEY

  try {
    const result = await runChatAgent({
      userId: session.user.id,
      message: parsed.data.message,
      history: parsed.data.history,
      demo,
    })
    return NextResponse.json({ ...result, demo }, { status: 200 })
  } catch (err) {
    console.error('Chat agent failed:', err)
    if (isQuotaError(err)) {
      return NextResponse.json(
        { error: 'AI quota reached for now — please try again in a bit.' },
        { status: 429 },
      )
    }
    return NextResponse.json(
      { error: 'The assistant failed to respond. Please try again.' },
      { status: 502 },
    )
  }
}
