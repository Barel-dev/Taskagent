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

// A recent-run row on the dashboard that expands to show the agent's input,
// output, and any error — makes the "shipped AI agents" claim inspectable.
export function AgentRunRow({
  run,
  label,
  statusClass,
}: {
  run: Run
  label: string
  statusClass: string
}) {
  const [open, setOpen] = useState(false)
  const hasDetail = run.input != null || run.output != null || !!run.error

  return (
    <div>
      <button
        type="button"
        onClick={() => hasDetail && setOpen((o) => !o)}
        className={`flex w-full items-center gap-3 rounded-lg px-1 py-1 text-xs ${
          hasDetail ? 'hover:bg-white/5' : 'cursor-default'
        }`}
      >
        <ChevronRight
          className={`h-3 w-3 shrink-0 text-white/40 transition-transform ${
            open ? 'rotate-90' : ''
          } ${hasDetail ? '' : 'opacity-0'}`}
        />
        <span className={`rounded-full px-2 py-0.5 font-medium ${statusClass}`}>
          {run.status.toLowerCase()}
        </span>
        <span className="text-white/75">{label}</span>
        <span className="ml-auto text-white/40 tabular-nums">
          {(run.tokensUsed ?? 0).toLocaleString()} tok
        </span>
        <span className="w-20 text-right text-white/35 tabular-nums">
          {new Date(run.createdAt).toLocaleDateString()}
        </span>
      </button>
      {open && (
        <div className="mt-1 mb-2 ml-6 space-y-2 rounded-lg border border-white/10 bg-black/30 p-2 text-[11px]">
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
