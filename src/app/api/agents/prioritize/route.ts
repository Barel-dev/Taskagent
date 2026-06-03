import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runPrioritizeAgent } from '@/lib/agents/prioritize'
import { agentRateLimitOk, isQuotaError } from '@/lib/rate-limit'

export const maxDuration = 60

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await agentRateLimitOk(session.user.id))) {
    return NextResponse.json(
      { error: 'You’re going too fast — give the agents a moment.' },
      { status: 429 },
    )
  }

  const demo = !process.env.GEMINI_API_KEY

  try {
    const { rationale, updated } = await runPrioritizeAgent({ userId: session.user.id, demo })
    return NextResponse.json({ rationale, updated, demo }, { status: 200 })
  } catch (err) {
    console.error('Prioritizer agent failed:', err)
    if (isQuotaError(err)) {
      return NextResponse.json(
        { error: 'AI quota reached for now — please try again in a bit.' },
        { status: 429 },
      )
    }
    return NextResponse.json({ error: 'Could not prioritize. Please try again.' }, { status: 502 })
  }
}
