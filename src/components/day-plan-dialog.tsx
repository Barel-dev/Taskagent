'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarClock, Check, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

type Block = { taskId: string; title: string; start: string; end: string; reason: string }

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// The Day Planner dialog: on open the agent proposes time blocks for today's
// most important open tasks; the user unchecks any they don't want and applies
// the rest. Applying never happens automatically.
export function DayPlanDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [failed, setFailed] = useState(false)
  const [summary, setSummary] = useState('')
  const [blocks, setBlocks] = useState<Block[]>([])
  const [excluded, setExcluded] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) {
      setLoading(false)
      setApplying(false)
      setFailed(false)
      setSummary('')
      setBlocks([])
      setExcluded(new Set())
      return
    }
    let cancelled = false
    async function plan() {
      setLoading(true)
      setFailed(false)
      try {
        const res = await fetch('/api/agents/day-plan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        })
        const data = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok) {
          setFailed(true)
          toast.error(data?.error ?? 'Could not plan your day')
          return
        }
        setSummary(data.summary ?? '')
        setBlocks(data.blocks ?? [])
      } catch {
        if (!cancelled) {
          setFailed(true)
          toast.error('Could not plan your day')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    plan()
    return () => {
      cancelled = true
    }
  }, [open])

  const included = blocks.filter((b) => !excluded.has(b.taskId))

  async function apply() {
    if (!included.length || applying) return
    setApplying(true)
    try {
      const res = await fetch('/api/agents/day-plan/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blocks: included.map((b) => ({ taskId: b.taskId, start: b.start, end: b.end })),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? 'Could not apply the plan')
        return
      }
      toast.success(`Planned ${data.applied} block${data.applied === 1 ? '' : 's'} for today`)
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setApplying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogTitle className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-violet-300" />
          Plan my day
        </DialogTitle>

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-white/55">
            <Loader2 className="h-4 w-4 animate-spin" />
            Planning your day around what matters…
          </div>
        ) : failed ? (
          <p className="py-6 text-sm text-white/55">The planner failed — close and try again.</p>
        ) : (
          <div className="space-y-4">
            {summary && <p className="text-sm text-white/65">{summary}</p>}

            {blocks.length > 0 && (
              <div className="space-y-2">
                {blocks.map((b) => {
                  const off = excluded.has(b.taskId)
                  return (
                    <button
                      key={b.taskId}
                      type="button"
                      onClick={() =>
                        setExcluded((prev) => {
                          const next = new Set(prev)
                          if (next.has(b.taskId)) next.delete(b.taskId)
                          else next.add(b.taskId)
                          return next
                        })
                      }
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${
                        off
                          ? 'border-white/5 bg-white/[0.01] opacity-45'
                          : 'border-violet-400/20 bg-violet-500/[0.07] hover:bg-violet-500/[0.12]'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          off ? 'border-white/20' : 'border-violet-300/60 bg-violet-500/40'
                        }`}
                      >
                        {!off && <Check className="h-3 w-3 text-white" />}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-white/85">
                          {fmtTime(b.start)} – {fmtTime(b.end)} · {b.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-white/45">{b.reason}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            )}

            {blocks.length === 0 && !summary && (
              <p className="text-sm text-white/55">Nothing to plan right now.</p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              {blocks.length > 0 && (
                <Button
                  size="sm"
                  className="btn-accent"
                  onClick={apply}
                  disabled={!included.length || applying}
                >
                  {applying ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  Apply{' '}
                  {included.length
                    ? `${included.length} block${included.length === 1 ? '' : 's'}`
                    : 'plan'}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
