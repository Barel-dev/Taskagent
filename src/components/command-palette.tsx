'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  ListTodo,
  CalendarDays,
  LayoutDashboard,
  Settings,
  Hash,
  CornerDownLeft,
  Plus,
  Upload,
} from 'lucide-react'

type Task = { id: string; title: string; status: string }
type Item = { key: string; label: string; sub?: string; icon: React.ReactNode; run: () => void }

const NAV = [
  { label: 'Go to Tasks', href: '/tasks', Icon: ListTodo },
  { label: 'Go to Calendar', href: '/calendar', Icon: CalendarDays },
  { label: 'Go to Dashboard', href: '/dashboard', Icon: LayoutDashboard },
  { label: 'Go to Settings', href: '/settings', Icon: Settings },
]

// Actions deep-link to the tasks page with a flag TaskList reads to open a dialog.
const ACTIONS = [
  { label: 'New task', href: '/tasks?new=1', Icon: Plus },
  { label: 'Import tasks', href: '/tasks?import=1', Icon: Upload },
]

// "g then key" navigation, like Gmail/Linear.
const GOTO: Record<string, string> = {
  t: '/tasks',
  c: '/calendar',
  d: '/dashboard',
  s: '/settings',
}

// A ⌘K / Ctrl+K command palette: jump between views and search tasks. Renders
// both the trigger pill (for the header) and the overlay. Additive — it just
// navigates (selecting a task opens it via /tasks?task=<id>).
export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [tasks, setTasks] = useState<Task[]>([])
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let lastG = 0
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      // Ignore while typing (this also covers the palette's own input).
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return
      if (e.key === 'g') {
        lastG = Date.now()
        return
      }
      // A destination key within ~1.2s of "g" navigates.
      if (Date.now() - lastG > 1200) return
      const dest = GOTO[e.key]
      if (dest) {
        e.preventDefault()
        lastG = 0
        router.push(dest)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  useEffect(() => {
    if (!open) return
    setQuery('')
    setActive(0)
    fetch('/api/tasks')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.tasks)
          setTasks(d.tasks.map((t: Task) => ({ id: t.id, title: t.title, status: t.status })))
      })
      .catch(() => {})
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  const q = query.trim().toLowerCase()
  const navItems = NAV.filter((n) => !q || n.label.toLowerCase().includes(q))
  const actionItems = ACTIONS.filter((a) => !q || a.label.toLowerCase().includes(q))
  const taskItems = (q ? tasks.filter((t) => t.title.toLowerCase().includes(q)) : tasks).slice(0, 8)

  const items: Item[] = [
    ...actionItems.map((a) => ({
      key: `action-${a.href}`,
      label: a.label,
      icon: <a.Icon className="h-4 w-4 text-violet-300" />,
      run: () => {
        router.push(a.href)
        setOpen(false)
      },
    })),
    ...navItems.map((n) => ({
      key: `nav-${n.href}`,
      label: n.label,
      icon: <n.Icon className="h-4 w-4 text-violet-300" />,
      run: () => {
        router.push(n.href)
        setOpen(false)
      },
    })),
    ...taskItems.map((t) => ({
      key: `task-${t.id}`,
      label: t.title,
      sub: t.status.toLowerCase().replace('_', ' '),
      icon: <Hash className="h-4 w-4 text-white/40" />,
      run: () => {
        router.push(`/tasks?task=${t.id}`)
        setOpen(false)
      },
    })),
  ]
  const activeIdx = Math.min(active, Math.max(0, items.length - 1))

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      items[activeIdx]?.run()
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs text-white/45 transition-colors hover:bg-white/[0.08] hover:text-white/70"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search…</span>
        <kbd className="hidden rounded bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50 sm:inline">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e1a]/95 shadow-2xl backdrop-blur-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-white/10 px-3">
              <Search className="h-4 w-4 shrink-0 text-white/40" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActive(0)
                }}
                onKeyDown={onKeyDown}
                placeholder="Search tasks or jump to a view…"
                className="flex-1 bg-transparent py-3 text-sm text-white placeholder:text-white/35 focus:outline-none"
              />
            </div>
            <div className="max-h-80 overflow-y-auto p-1.5">
              {items.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-white/40">No results</div>
              ) : (
                items.map((it, i) => (
                  <button
                    key={it.key}
                    type="button"
                    onClick={it.run}
                    onMouseEnter={() => setActive(i)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm ${
                      i === activeIdx ? 'bg-white/10 text-white' : 'text-white/75 hover:bg-white/5'
                    }`}
                  >
                    {it.icon}
                    <span className="min-w-0 flex-1 truncate">{it.label}</span>
                    {it.sub && <span className="text-[10px] text-white/35">{it.sub}</span>}
                    {i === activeIdx && <CornerDownLeft className="h-3.5 w-3.5 text-white/30" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
