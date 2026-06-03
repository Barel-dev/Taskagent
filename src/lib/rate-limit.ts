import { prisma } from '@/lib/prisma'

// Simple DB-backed rate limit for the agent endpoints. Counts the user's
// AgentRun rows in the last minute — robust across serverless cold starts
// (no in-memory state) and protects the shared free Gemini quota from spam.
const MAX_RUNS_PER_MINUTE = 30

export async function agentRateLimitOk(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - 60_000)
  const count = await prisma.agentRun.count({ where: { userId, createdAt: { gte: since } } })
  return count < MAX_RUNS_PER_MINUTE
}

/** True if an error looks like an AI provider quota / rate-limit failure. */
export function isQuotaError(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase()
  return (
    msg.includes('429') ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit')
  )
}
