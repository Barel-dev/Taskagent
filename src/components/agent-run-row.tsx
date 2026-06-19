'use client'

import { useState } from 'react'
import { ChevronRight } from 'lucide-react'

type Run = {
  id: string
  status: string
  tokensUsed: number | null
  createdAt: string | Date
  input: unknown
  output: unknown
  error: string | null
}

function relativeTime(d: Date): string {
  const s = Math.floor((Date.now() - d.getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const days = Math.floor(h / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// A recent-run ("job") row on the dashboard that expands to show the agent's
// input, output, and any error — makes the "shipped AI agents" claim inspectable.
export function AgentRunRow({
  run,
  label,
  statusClass,
  dotClass = 'bg-white/40',
}: {
  run: Run
  label: string
  statusClass: string
  dotClass?: string
}) {
  const [open, setOpen] = useState(false)
  const hasDetail = run.input != null || run.output != null || !!run.error

  return (
    <div className="rounded-lg transition-colors hover:bg-white/[0.03]">
      <button
        type="button"
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-xs ${
          hasDetail ? 'cursor-pointer' : 'cursor-default'
        }`}
      >
        <ChevronRight
          className={`h-3 w-3 shrink-0 text-white/40 transition-transform ${
            open ? 'rotate-90' : ''
          } ${hasDetail ? '' : 'opacity-0'}`}
        />
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
        <span className="font-medium text-white/80">{label}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass}`}>
          {run.status.toLowerCase()}
        </span>
        <span className="ml-auto shrink-0 text-white/35 tabular-nums">
          {(run.tokensUsed ?? 0).toLocaleString()} tok
        </span>
        <span className="w-16 shrink-0 text-right text-white/30 tabular-nums">
          {relativeTime(new Date(run.createdAt))}
        </span>
      </button>
      {open && (
        <div className="mt-1 mb-2 ml-7 space-y-2 rounded-lg border border-white/10 bg-black/30 p-2 text-[11px]">
          {run.error && <pre className="whitespace-pre-wrap text-rose-300">{run.error}</pre>}
          {run.input != null && <Detail title="Input" data={run.input} />}
          {run.output != null && <Detail title="Output" data={run.output} />}
        </div>
      )}
    </div>
  )
}

function Detail({ title, data }: { title: string; data: unknown }) {
  return (
    <div>
      <div className="mb-0.5 tracking-wider text-white/40 uppercase">{title}</div>
      <pre className="max-h-48 overflow-auto break-words whitespace-pre-wrap text-white/65">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )
}
