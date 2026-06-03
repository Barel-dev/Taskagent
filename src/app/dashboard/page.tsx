import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { ShaderBackground } from '@/components/ui/shader-background'
import { Zap, CheckCircle2, Coins, Bot } from 'lucide-react'
import type { AgentType, AgentRunStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const TYPE_LABEL: Record<AgentType, string> = {
  BREAKDOWN: 'Plan / Breakdown',
  EXECUTE: 'Do it',
  PRIORITIZER: 'Prioritizer',
  BRIEFING: 'Summary / Briefing',
  SCHEDULE: 'Schedule',
  EMAIL: 'Email',
}

const STATUS_STYLE: Record<AgentRunStatus, string> = {
  SUCCESS: 'text-emerald-300 bg-emerald-500/10',
  ERROR: 'text-rose-300 bg-rose-500/10',
  PENDING: 'text-amber-300 bg-amber-500/10',
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')
  const userId = session.user.id

  const [total, success, tokensAgg, byType, recent] = await Promise.all([
    prisma.agentRun.count({ where: { userId } }),
    prisma.agentRun.count({ where: { userId, status: 'SUCCESS' } }),
    prisma.agentRun.aggregate({ where: { userId }, _sum: { tokensUsed: true } }),
    prisma.agentRun.groupBy({
      by: ['agentType'],
      where: { userId },
      _count: { _all: true },
      _sum: { tokensUsed: true },
    }),
    prisma.agentRun.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 12 }),
  ])

  const tokens = tokensAgg._sum.tokensUsed ?? 0
  const successRate = total ? Math.round((success / total) * 100) : 0
  const byTypeSorted = [...byType].sort((a, b) => b._count._all - a._count._all)

  const stats = [
    { label: 'Agent runs', value: total.toLocaleString(), Icon: Zap },
    { label: 'Success rate', value: `${successRate}%`, Icon: CheckCircle2 },
    { label: 'Tokens used', value: tokens.toLocaleString(), Icon: Coins },
    { label: 'Agent types', value: String(byType.length), Icon: Bot },
  ]

  return (
    <div className="relative isolate min-h-screen">
      <ShaderBackground opacity={0.35} />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-black/55" />
      <Header />

      <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <header>
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-violet-300/70">
            Agent activity
          </p>
          <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-white">
            Your <span className="text-violet-300">agents</span> at work
          </h2>
          <p className="mt-1.5 text-sm text-white/50">
            Every agent run is logged — what ran, whether it succeeded, and how many tokens it used.
          </p>
        </header>

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm"
            >
              <s.Icon className="h-5 w-5 text-violet-300" />
              <div className="mt-3 text-3xl font-semibold tracking-tight text-white">{s.value}</div>
              <div className="mt-1 text-xs text-white/50">{s.label}</div>
            </div>
          ))}
        </div>

        {total === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
            <Bot className="mx-auto h-6 w-6 text-violet-300/60" />
            <p className="mt-3 text-sm text-white/60">No agent runs yet.</p>
            <p className="mt-1 text-xs text-white/40">
              Head to your tasks and run an agent — it’ll show up here.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* By type */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-white/80">By agent</h3>
              <div className="mt-4 space-y-3">
                {byTypeSorted.map((t) => {
                  const pct = total ? Math.round((t._count._all / total) * 100) : 0
                  return (
                    <div key={t.agentType}>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/75">{TYPE_LABEL[t.agentType]}</span>
                        <span className="tabular-nums text-white/45">
                          {t._count._all} run{t._count._all === 1 ? '' : 's'} ·{' '}
                          {(t._sum.tokensUsed ?? 0).toLocaleString()} tok
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-violet-400/70"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Recent runs */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-white/80">Recent runs</h3>
              <div className="mt-4 space-y-2">
                {recent.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 text-xs">
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[r.status]}`}
                    >
                      {r.status.toLowerCase()}
                    </span>
                    <span className="text-white/75">{TYPE_LABEL[r.agentType]}</span>
                    <span className="ml-auto tabular-nums text-white/40">
                      {(r.tokensUsed ?? 0).toLocaleString()} tok
                    </span>
                    <span className="w-20 text-right tabular-nums text-white/35">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
