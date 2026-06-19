'use client'

import { useEffect, useState } from 'react'
import { History, CheckCircle2, XCircle, Loader2, Timer } from 'lucide-react'
import { agentLabel, agentColor } from '@/lib/agent-labels'

type Run = {
  id: string
  agentType: string
  status: 'PENDING' | 'SUCCESS' | 'ERROR'
  tokensUsed: number | null
  createdAt: string
}
type Focus = { count: number; minutes: number }

function focusLabel(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`
}

// A compact, read-only audit trail of the agent runs recorded against this
// task (newest first) plus the time focused on it. Lazy-loads from
// /api/tasks/[id]/runs and renders nothing until there's something to show.
export function TaskActivity({ taskId }: { taskId: string }) {
  const [runs, setRuns] = useState<Run[]>([])
  const [focus, setFocus] = useState<Focus>({ count: 0, minutes: 0 })
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let active = true
    fetch(`/api/tasks/${taskId}/runs`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active) return
        setRuns(Array.isArray(d?.runs) ? d.runs : [])
        setFocus(d?.focus ?? { count: 0, minutes: 0 })
        setLoaded(true)
      })
      .catch(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [taskId])

  if (!loaded || (runs.length === 0 && focus.count === 0)) return null

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-2 text-[11px] font-medium tracking-wider text-white/40 uppercase">
        <History className="h-3.5 w-3.5" />
        Activity
      </div>

      {focus.count > 0 && (
        <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-white/70">
          <Timer className="h-3.5 w-3.5 text-violet-300" />
          🍅 {focus.count} focus session
          {focus.count === 1 ? '' : 's'} · ~{focusLabel(focus.minutes)} focused
        </div>
      )}

      {runs.length > 0 && (
        <ul className="space-y-1.5">
          {runs.map((run) => (
            <li key={run.id} className="flex items-center gap-2.5 text-xs">
              <StatusIcon status={run.status} />
              <span className={`h-2 w-2 shrink-0 rounded-full ${agentColor(run.agentType)}`} />
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
      )}
    </div>
  )
}

function StatusIcon({ status }: { status: Run['status'] }) {
  if (status === 'SUCCESS')
    return <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-300/80" />
  if (status === 'ERROR') return <XCircle className="h-3.5 w-3.5 shrink-0 text-rose-300/80" />
  return <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-amber-300/80" />
}
