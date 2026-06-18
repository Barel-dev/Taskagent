'use client'

import { useEffect, useState } from 'react'
import { History, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { agentLabel } from '@/lib/agent-labels'

type Run = {
  id: string
  agentType: string
  status: 'PENDING' | 'SUCCESS' | 'ERROR'
  tokensUsed: number | null
  createdAt: string
}

// A compact, read-only audit trail of the agent runs recorded against this
// task, newest first. Lazy-loads from /api/tasks/[id]/runs on mount and renders
// nothing until there's at least one run.
export function TaskActivity({ taskId }: { taskId: string }) {
  const [runs, setRuns] = useState<Run[] | null>(null)

  useEffect(() => {
    let active = true
    fetch(`/api/tasks/${taskId}/runs`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (active) setRuns(d?.runs ?? [])
      })
      .catch(() => {
        if (active) setRuns([])
      })
    return () => {
      active = false
    }
  }, [taskId])

  if (!runs || runs.length === 0) return null

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-medium tracking-wider text-white/40 uppercase">
        <History className="h-3.5 w-3.5" />
        Activity
      </div>
      <ul className="space-y-1.5">
        {runs.map((run) => (
          <li key={run.id} className="flex items-center gap-2.5 text-xs">
            <StatusIcon status={run.status} />
            <span className="text-white/75">{agentLabel(run.agentType)}</span>
            {run.tokensUsed ? (
              <span className="text-white/30 tabular-nums">
                {run.tokensUsed.toLocaleString()} tok
              </span>
            ) : null}
            <span className="ml-auto shrink-0 text-white/35 tabular-nums">
              {new Date(run.createdAt).toLocaleString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function StatusIcon({ status }: { status: Run['status'] }) {
  if (status === 'SUCCESS')
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-300/80" />
  if (status === 'ERROR') return <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-300/80" />
  return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-300/80" />
}
