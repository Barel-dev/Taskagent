import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { runBriefingAgent } from '@/lib/agents/briefing'
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
    const { briefing } = await runBriefingAgent({ userId: session.user.id, demo })
    return NextResponse.json({ briefing, demo }, { status: 200 })
  } catch (err) {
    console.error('Briefing agent failed:', err)
    if (isQuotaError(err)) {
      return NextResponse.json(
        { error: 'AI quota reached for now — please try again in a bit.' },
        { status: 429 },
      )
    }
    return NextResponse.json({ error: 'Could not build a briefing. Please try again.' }, { status: 502 })
  }
}
