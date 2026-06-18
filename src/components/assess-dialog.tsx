'use client'

import { useEffect, useState } from 'react'
import { ShieldAlert, Loader2, AlertTriangle, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

type Risk = { risk: string; mitigation: string }

// The Assess agent dialog: on open it asks the agent to surface this task's
// risks (each with a mitigation) and any blockers to resolve first. Read-only —
// it never changes the task.
export function AssessDialog({
  task,
  open,
  onOpenChange,
}: {
  task: { id: string; title: string }
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [demo, setDemo] = useState(false)
  const [assessment, setAssessment] = useState('')
  const [risks, setRisks] = useState<Risk[]>([])
  const [blockers, setBlockers] = useState<string[]>([])

  useEffect(() => {
    if (!open) {
      setLoading(false)
      setFailed(false)
      setDemo(false)
      setAssessment('')
      setRisks([])
      setBlockers([])
      return
    }
    let cancelled = false
    async function run() {
      setLoading(true)
      setFailed(false)
      try {
        const res = await fetch('/api/agents/assess', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id }),
        })
        const data = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok) {
          setFailed(true)
          toast.error(data?.error ?? 'Could not assess the task')
          return
        }
        setAssessment(data.assessment ?? '')
        setRisks(Array.isArray(data.risks) ? data.risks : [])
        setBlockers(Array.isArray(data.blockers) ? data.blockers : [])
        setDemo(Boolean(data.demo))
      } catch {
        if (!cancelled) {
          setFailed(true)
          toast.error('Could not assess the task')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [open, task.id])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/10 bg-[#0b0e1a]/95 backdrop-blur-xl">
        <DialogTitle className="flex items-center gap-2 text-white">
          <ShieldAlert className="h-4 w-4 text-violet-300" />
          Risks &amp; blockers
        </DialogTitle>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/55">
            <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
            Assessing this task…
          </div>
        ) : failed ? (
          <div className="py-10 text-center text-sm text-white/55">
            Couldn’t assess. Close and try again.
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-4 overflow-y-auto">
            {demo && (
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                Demo output — add a GEMINI_API_KEY for a real assessment.
              </div>
            )}
            {assessment && <p className="text-sm leading-relaxed text-white/75">{assessment}</p>}

            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-medium tracking-wider text-white/40 uppercase">
                <AlertTriangle className="h-3.5 w-3.5" />
                Risks
              </div>
              {risks.length ? (
                <ul className="space-y-2">
                  {risks.map((r, i) => (
                    <li key={i} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                      <div className="text-sm text-white/85">{r.risk}</div>
                      <div className="mt-1 text-xs text-emerald-300/80">→ {r.mitigation}</div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-white/45">No notable risks flagged.</p>
              )}
            </div>

            {blockers.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-medium tracking-wider text-white/40 uppercase">
                  <Lock className="h-3.5 w-3.5" />
                  Resolve first
                </div>
                <ul className="space-y-1">
                  {blockers.map((b, i) => (
                    <li key={i} className="flex gap-2 text-sm text-white/75">
                      <span className="text-white/30">•</span>
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
