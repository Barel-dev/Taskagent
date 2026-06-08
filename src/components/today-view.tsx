'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Circle,
  AlertTriangle,
  CalendarClock,
  CalendarDays,
  Sun,
  AlarmClock,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import type { TaskNodeUI } from '@/components/task-list'
import { formatDue, dueToneClass } from '@/lib/format-due'
import { parseQuickAdd } from '@/lib/quick-add'

const PRIORITY_DOT: Record<TaskNodeUI['priority'], string> = {
  LOW: 'bg-slate-400',
  MEDIUM: 'bg-sky-400',
  HIGH: 'bg-amber-400',
  URGENT: 'bg-rose-500',
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}
function sameDay(a: Date, b: Date): boolean {
  return startOfDay(a) === startOfDay(b)
}

// A focused "what needs attention today" view: overdue, due today, and
// time-blocked today, with one-click complete. Links open the task on /tasks.
export function TodayView({
  tasks: initial,
  userName,
}: {
  tasks: TaskNodeUI[]
  userName?: string
}) {
  const router = useRouter()
  const [tasks, setTasks] = useState(initial)
  const [draft, setDraft] = useState('')
  useEffect(() => setTasks(initial), [initial])

  // Capture a task here; with no date token it defaults to due today.
  async function addTask() {
    const raw = draft.trim()
    if (!raw) return
    const { title, priority, dueDate } = parseQuickAdd(raw)
    const d = new Date()
    const todayIso = new Date(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate(),
      ).padStart(2, '0')}`,
    ).toISOString()
    setDraft('')
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, priority, dueDate: dueDate ?? todayIso }),
    })
    if (!res.ok) toast.error('Could not add task')
    else router.refresh()
  }

  const now = new Date()
  const todayStart = startOfDay(now)
  const open = tasks.filter((t) => t.status !== 'DONE')
  const overdue = open
    .filter((t) => t.dueDate && startOfDay(new Date(t.dueDate)) < todayStart)
    .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
  const dueToday = open.filter((t) => t.dueDate && sameDay(new Date(t.dueDate), now))
  const scheduledToday = open
    .filter((t) => t.scheduledStart && sameDay(new Date(t.scheduledStart), now))
    .sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime())

  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const totalFocus = overdue.length + dueToday.length + scheduledToday.length

  async function complete(id: string) {
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, status: 'DONE' } : t)))
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE', completedAt: new Date().toISOString() }),
    })
    if (!res.ok) toast.error('Could not complete task')
    router.refresh()
  }

  // Push a task's due date forward by N days (drops it off today's list).
  async function snooze(id: string, days: number) {
    const d = new Date()
    d.setDate(d.getDate() + days)
    const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate(),
    ).padStart(2, '0')}`
    const iso = new Date(ymd).toISOString()
    setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, dueDate: iso } : t)))
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueDate: iso }),
    })
    if (!res.ok) {
      toast.error('Could not snooze')
      router.refresh()
    } else {
      toast.success(days === 1 ? 'Snoozed to tomorrow' : `Snoozed ${days} days`)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-6 py-10">
      <header className="tl-rise">
        <p className="text-[11px] font-medium tracking-[0.25em] text-violet-300/70 uppercase">
          Today
        </p>
        <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-white">
          {greeting}
          {userName ? `, ${userName.split(' ')[0]}` : ''}
        </h2>
        <p className="mt-1.5 text-sm text-white/50">
          {totalFocus === 0
            ? 'Nothing needs your attention today.'
            : `${totalFocus} thing${totalFocus === 1 ? '' : 's'} to focus on today.`}
        </p>
      </header>

      <div className="tl-rise flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
        <Plus className="h-4 w-4 shrink-0 text-white/35" />
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTask()
            }
          }}
          placeholder="Add something for today — e.g. “Call the bank !high”"
          aria-label="Add a task for today"
          className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
        />
      </div>

      {totalFocus === 0 ? (
        <div className="tl-rise rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <Sun className="mx-auto h-7 w-7 text-amber-300/70" />
          <p className="mt-3 text-sm text-white/60">All clear for today.</p>
          <p className="mt-1 text-xs text-white/40">
            Nothing overdue, due today, or scheduled. Enjoy it — or{' '}
            <Link href="/tasks" className="text-violet-300 hover:text-violet-200">
              plan ahead
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <Section
            title="Overdue"
            icon={<AlertTriangle className="h-4 w-4 text-rose-300" />}
            items={overdue}
            onComplete={complete}
            onSnooze={snooze}
          />
          <Section
            title="Due today"
            icon={<CalendarDays className="h-4 w-4 text-amber-300" />}
            items={dueToday}
            onComplete={complete}
            onSnooze={snooze}
          />
          <Section
            title="Scheduled today"
            icon={<CalendarClock className="h-4 w-4 text-violet-300" />}
            items={scheduledToday}
            onComplete={complete}
            showTime
          />
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  icon,
  items,
  onComplete,
  onSnooze,
  showTime,
}: {
  title: string
  icon: React.ReactNode
  items: TaskNodeUI[]
  onComplete: (id: string) => void
  onSnooze?: (id: string, days: number) => void
  showTime?: boolean
}) {
  if (items.length === 0) return null
  return (
    <section className="tl-rise">
      <h3 className="mb-2 inline-flex items-center gap-1.5 text-sm font-semibold text-white/80">
        {icon}
        {title}
        <span className="ml-1 text-xs text-white/35 tabular-nums">{items.length}</span>
      </h3>
      <div className="divide-y divide-white/5 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
        {items.map((t) => {
          const due = formatDue(t.dueDate, t.status)
          const time =
            showTime && t.scheduledStart
              ? new Date(t.scheduledStart).toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : null
          return (
            <div key={t.id} className="flex items-center gap-3 px-4 py-3">
              <button
                type="button"
                onClick={() => onComplete(t.id)}
                title="Mark done"
                aria-label="Mark done"
                className="text-white/35 hover:text-violet-300"
              >
                <Circle className="h-5 w-5" />
              </button>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[t.priority]}`} />
              <Link
                href={`/tasks?task=${t.id}`}
                className="min-w-0 flex-1 truncate text-sm text-white/85 hover:text-white"
              >
                {t.title}
              </Link>
              {time && (
                <span className="shrink-0 text-xs text-violet-300/80 tabular-nums">{time}</span>
              )}
              {!time && due && (
                <span className={`shrink-0 text-xs ${dueToneClass(due)}`}>{due.label}</span>
              )}
              {onSnooze && <SnoozeButton id={t.id} onSnooze={onSnooze} />}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function SnoozeButton({
  id,
  onSnooze,
}: {
  id: string
  onSnooze: (id: string, days: number) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Snooze"
        aria-label="Snooze"
        className="text-white/30 hover:text-violet-300"
      >
        <AlarmClock className="h-4 w-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-32 overflow-hidden rounded-lg border border-white/10 bg-[#0b0e1a]/95 p-1 shadow-2xl backdrop-blur-xl">
            {(
              [
                ['Tomorrow', 1],
                ['In 3 days', 3],
                ['Next week', 7],
              ] as const
            ).map(([label, days]) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onSnooze(id, days)
                  setOpen(false)
                }}
                className="block w-full rounded px-2 py-1.5 text-left text-xs text-white/75 hover:bg-white/10"
              >
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </span>
  )
}
