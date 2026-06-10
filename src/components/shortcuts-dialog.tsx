'use client'

import { useEffect, useState } from 'react'
import { Keyboard } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

const SHORTCUTS: { keys: string[]; what: string; where?: string }[] = [
  { keys: ['n'], what: 'New task / focus quick-add', where: 'Tasks · Today' },
  { keys: ['/'], what: 'Focus search', where: 'Tasks' },
  { keys: ['⌘K', 'Ctrl K'], what: 'Command palette' },
  { keys: ['←', '→'], what: 'Previous / next period', where: 'Calendar' },
  { keys: ['t'], what: 'Jump to today', where: 'Calendar' },
  { keys: ['w', 'm'], what: 'Week / month view', where: 'Calendar' },
  { keys: ['?'], what: 'This help' },
]

// Global "?" opens a cheat sheet of the app's keyboard shortcuts. Ignored
// while typing in an input.
export function ShortcutsDialog() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== '?' || e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return
      e.preventDefault()
      setOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-sm">
        <DialogTitle className="flex items-center gap-2">
          <Keyboard className="h-4 w-4 text-violet-300" />
          Keyboard shortcuts
        </DialogTitle>
        <div className="mt-1 space-y-1.5">
          {SHORTCUTS.map((s) => (
            <div key={s.what} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-white/70">
                {s.what}
                {s.where && <span className="ml-1.5 text-[11px] text-white/35">{s.where}</span>}
              </span>
              <span className="flex shrink-0 gap-1">
                {s.keys.map((k) => (
                  <kbd
                    key={k}
                    className="rounded border border-white/15 bg-white/[0.06] px-1.5 py-0.5 font-mono text-[11px] text-white/70"
                  >
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
