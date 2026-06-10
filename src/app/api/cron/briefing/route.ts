import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { runBriefingAgent } from '@/lib/agents/briefing'

export const maxDuration = 60

// Vercel Cron hits this every morning (schedule in vercel.json) and generates
// a fresh daily briefing for each user with open tasks; the Today page shows
// the latest one. Vercel sends "Authorization: Bearer <CRON_SECRET>" with the
// request when the CRON_SECRET env var is set — without it this route is off.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured' }, { status: 503 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const demo = !process.env.GEMINI_API_KEY

  // One briefing per user who has anything open. Capped so a big user base
  // can't push the function past its time limit.
  const users = await prisma.task.groupBy({
    by: ['userId'],
    where: { status: { not: 'DONE' } },
  })

  let generated = 0
  let failed = 0
  for (const u of users.slice(0, 25)) {
    try {
      await runBriefingAgent({ userId: u.userId, demo })
      generated++
    } catch (err) {
      console.error('Cron briefing failed for a user:', err)
      failed++
    }
  }

  return NextResponse.json({ generated, failed, demo })
}
