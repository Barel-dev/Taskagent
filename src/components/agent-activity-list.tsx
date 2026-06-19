'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bot } from 'lucide-react'
import { AgentRunRow } from '@/components/agent-run-row'
import { agentColor, agentLabel } from '@/lib/agent-labels'

type Run = {
  id: string
  agentType: string
  status: string
  tokensUsed: number | null
  createdAt: string
  taskId: string | null
  input: unknown
  output: unknown
  error: string | null
}

const STATUS_STYLE: Record<string, string> = {
  SUCCESS: 'text-emerald-300 bg-emerald-500/10',
  ERROR: 'text-rose-300 bg-rose-500/10',
  PENDING: 'text-amber-300 bg-amber-500/10',
}

// The full agent-jobs log with a by-agent filter. Reuses the dashboard's
// AgentRunRow so a row reads identically wherever it appears.
export function AgentActivityList({
  runs,
  summary,
}: {
  runs: Run[]
  summary: { total: number; success: number; tokens: number }
}) {
  const [filter, setFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const successRate = summary.total ? Math.round((summary.success / summary.total) * 100) : 0

  // Agent types present in the log, ordered by how often they appear.
  const counts = new Map<string, number>()
  for (const r of runs) counts.set(r.agentType, (counts.get(r.agentType) ?? 0) + 1)
  const types = [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))
  const successCount = runs.filter((r) => r.status === 'SUCCESS').length
  const errorCount = runs.filter((r) => r.status === 'ERROR').length

  const shown = runs.filter(
    (r) =>
      (filter ? r.agentType === filter : true) && (statusFilter ? r.status === statusFilter : true),
  )

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6">
        <p className="text-[11px] font-medium tracking-[0.25em] text-violet-300/70 uppercase">
          Agent jobs
        </p>
        <h2 className="mt-1.5 flex items-center gap-2 text-3xl font-semibold tracking-tight text-white">
          <Bot className="h-6 w-6 text-violet-300" />
          Agent activity
        </h2>
        <p className="mt-1.5 text-sm text-white/50">
          Every job your agents have run, newest first — expand a row to inspect what went in and
          out.
        </p>
        <Link
          href="/dashboard"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>
      </header>

      {summary.total > 0 && (
        <div className="mb-5 grid grid-cols-3 gap-3">
          <SummaryStat label="Total runs" value={summary.total.toLocaleString()} />
          <SummaryStat label="Success" value={`${successRate}%`} />
          <SummaryStat label="Tokens" value={summary.tokens.toLocaleString()} />
        </div>
      )}

      {runs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <Bot className="mx-auto h-6 w-6 text-violet-300/60" />
          <p className="mt-3 text-sm text-white/60">No agent runs yet.</p>
          <p className="mt-1 text-xs text-white/40">
            Run an agent on a task and it’ll show up here.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-2">
            <Chip active={filter === null} onClick={() => setFilter(null)}>
              All {runs.length}
            </Chip>
            {types.map((t) => (
              <Chip key={t} active={filter === t} onClick={() => setFilter(t)}>
                <span className={`h-2 w-2 rounded-full ${agentColor(t)}`} />
                {agentLabel(t)} {counts.get(t)}
              </Chip>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/40">Status</span>
            <Chip active={statusFilter === null} onClick={() => setStatusFilter(null)}>
              All
            </Chip>
            <Chip active={statusFilter === 'SUCCESS'} onClick={() => setStatusFilter('SUCCESS')}>
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Success {successCount}
            </Chip>
            {errorCount > 0 && (
              <Chip active={statusFilter === 'ERROR'} onClick={() => setStatusFilter('ERROR')}>
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                Errors {errorCount}
              </Chip>
            )}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-2 backdrop-blur-sm">
            {shown.length === 0 ? (
              <p className="px-2 py-8 text-center text-sm text-white/40">No matching jobs.</p>
            ) : (
              shown.map((r) => (
                <AgentRunRow
                  key={r.id}
                  run={r}
                  label={agentLabel(r.agentType)}
                  statusClass={STATUS_STYLE[r.status] ?? 'text-white/60 bg-white/10'}
                  dotClass={agentColor(r.agentType)}
                  taskHref={r.taskId ? `/tasks?task=${r.taskId}` : undefined}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  )
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4 backdrop-blur-sm">
      <div className="text-2xl font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-0.5 text-xs text-white/50">{label}</div>
    </div>
  )
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-violet-400/40 bg-violet-500/15 text-white'
          : 'border-white/10 bg-white/5 text-white/60 hover:text-white/85'
      }`}
    >
      {children}
    </button>
  )
}
