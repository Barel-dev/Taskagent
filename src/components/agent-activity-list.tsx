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
export function AgentActivityList({ runs }: { runs: Run[] }) {
  const [filter, setFilter] = useState<string | null>(null)

  // Agent types present in the log, ordered by how often they appear.
  const counts = new Map<string, number>()
  for (const r of runs) counts.set(r.agentType, (counts.get(r.agentType) ?? 0) + 1)
  const types = [...counts.keys()].sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0))

  const shown = filter ? runs.filter((r) => r.agentType === filter) : runs

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
          <div className="mb-4 flex flex-wrap gap-2">
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

          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-2 backdrop-blur-sm">
            {shown.map((r) => (
              <AgentRunRow
                key={r.id}
                run={r}
                label={agentLabel(r.agentType)}
                statusClass={STATUS_STYLE[r.status] ?? 'text-white/60 bg-white/10'}
                dotClass={agentColor(r.agentType)}
              />
            ))}
          </div>
        </>
      )}
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
