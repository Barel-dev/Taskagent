'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CalendarPlus, CalendarCheck, Clock, Loader2, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { connectGoogle } from '@/lib/connect-google'

type Slot = { start: string; end: string; reason: string }

function formatSlot(slot: Slot): string {
  const start = new Date(slot.start)
  const end = new Date(slot.end)
  const day = start.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const startT = start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  const endT = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  return `${day} · ${startT} – ${endT}`
}

// The Schedule agent dialog: when opened it asks the agent to propose time
// slots (reading the user's calendar busy times), the user picks one, and only
// on "Add to calendar" does it create the event. No event is created without
// that explicit click.
export function ScheduleAgentDialog({
  task,
  open,
  onOpenChange,
}: {
  task: { id: string; title: string }
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [slots, setSlots] = useState<Slot[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const [committing, setCommitting] = useState(false)
  const [demo, setDemo] = useState(false)
  const [needsReconnect, setNeedsReconnect] = useState(false)
  const [failed, setFailed] = useState(false)

  const timeZone =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'UTC'

  useEffect(() => {
    if (!open) {
      // Reset when closed so the next open re-proposes fresh.
      setLoading(false)
      setSlots([])
      setSelected(null)
      setCommitting(false)
      setDemo(false)
      setNeedsReconnect(false)
      setFailed(false)
      return
    }

    let cancelled = false
    async function propose() {
      setLoading(true)
      setFailed(false)
      try {
        const res = await fetch('/api/agents/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id, timeZone }),
        })
        const data = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok) {
          setFailed(true)
          toast.error(data?.error ?? 'Could not propose times')
          return
        }
        setSlots(data?.slots ?? [])
        setSelected(data?.slots?.length ? 0 : null)
        setDemo(Boolean(data?.demo))
        setNeedsReconnect(Boolean(data?.needsReconnect))
      } catch {
        if (!cancelled) {
          setFailed(true)
          toast.error('Could not propose times')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    propose()
    return () => {
      cancelled = true
    }
  }, [open, task.id, timeZone])

  async function addToCalendar() {
    if (selected === null || committing) return
    const slot = slots[selected]
    setCommitting(true)
    try {
      const res = await fetch('/api/agents/schedule/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, start: slot.start, end: slot.end, timeZone }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        if (data?.needsReconnect) {
          setNeedsReconnect(true)
          toast.error('Connect Google to grant Calendar access')
        } else {
          toast.error(data?.error ?? 'Could not add to calendar')
        }
        return
      }
      toast.success(
        'Added to your calendar',
        data?.htmlLink
          ? {
              action: {
                label: 'View',
                onClick: () => window.open(data.htmlLink, '_blank', 'noopener,noreferrer'),
              },
            }
          : undefined,
      )
      onOpenChange(false)
      router.refresh()
    } catch {
      toast.error('Could not add to calendar')
    } finally {
      setCommitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/10 bg-[#0b0e1a]/95 backdrop-blur-xl">
        <DialogTitle className="flex items-center gap-2 text-white">
          <CalendarPlus className="h-4 w-4 text-violet-300" />
          Schedule “{task.title}”
        </DialogTitle>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/55">
            <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
            Finding open times…
          </div>
        ) : failed ? (
          <div className="py-10 text-center text-sm text-white/55">
            Couldn’t propose times. Close and try again.
          </div>
        ) : (
          <div className="space-y-4">
            {demo && (
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                Demo slots — add a GEMINI_API_KEY for AI-chosen times.
              </div>
            )}
            {needsReconnect && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2.5 text-xs text-amber-200">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <div>
                  <p>
                    Calendar access isn’t granted yet — these times don’t account for your existing
                    events, and adding to the calendar needs access.
                  </p>
                  <button
                    type="button"
                    onClick={() => connectGoogle()}
                    className="mt-2 rounded-md border border-amber-300/40 bg-amber-400/10 px-2.5 py-1 font-medium text-amber-100 hover:bg-amber-400/20"
                  >
                    Connect Google
                  </button>
                </div>
              </div>
            )}

            <p className="text-sm text-white/55">
              Pick a slot, then add it to your Google Calendar.
            </p>

            <div className="space-y-2">
              {slots.map((slot, i) => {
                const active = selected === i
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelected(i)}
                    className={`flex w-full items-start gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                      active
                        ? 'border-violet-400/50 bg-violet-500/15'
                        : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'
                    }`}
                  >
                    <Clock
                      className={`mt-0.5 h-4 w-4 shrink-0 ${active ? 'text-violet-200' : 'text-white/40'}`}
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-white">
                        {formatSlot(slot)}
                      </span>
                      <span className="mt-0.5 block text-xs text-white/50">{slot.reason}</span>
                    </span>
                  </button>
                )
              })}
            </div>

            <div className="flex justify-end border-t border-white/10 pt-4">
              <Button
                size="sm"
                onClick={addToCalendar}
                disabled={committing || selected === null}
                className="btn-accent"
              >
                <CalendarCheck
                  className={`mr-1 h-3.5 w-3.5 ${committing ? 'animate-pulse' : ''}`}
                />
                {committing ? 'Adding…' : 'Add to calendar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
