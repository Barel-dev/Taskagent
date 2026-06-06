'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Inbox,
  CalendarRange,
  Grid3x3,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { TaskDetail } from '@/components/task-detail'
import type { TaskNodeUI } from '@/components/task-list'
import type { PriorityFilter } from '@/lib/task-filter'

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// Priority → card style (the highlighted purple look from the landing mockup).
const CARD: Record<TaskNodeUI['priority'], string> = {
  URGENT: 'border-rose-400/30 bg-gradient-to-br from-rose-500/25 to-rose-500/[0.04] text-rose-50',
  HIGH: 'border-violet-400/30 bg-gradient-to-br from-violet-500/25 to-fuchsia-500/[0.06] text-violet-50',
  MEDIUM: 'border-sky-400/25 bg-gradient-to-br from-sky-500/15 to-sky-500/[0.03] text-sky-50',
  LOW: 'border-white/10 bg-white/[0.05] text-white/80',
}
// Compact priority dot for month-cell chips.
const DOT: Record<TaskNodeUI['priority'], string> = {
  URGENT: 'bg-rose-400',
  HIGH: 'bg-violet-400',
  MEDIUM: 'bg-sky-400',
  LOW: 'bg-slate-400',
}

function mondayOf(base: Date, weekOffset: number): Date {
  const d = new Date(base)
  d.setHours(0, 0, 0, 0)
  const dow = (d.getDay() + 6) % 7 // 0 = Mon … 6 = Sun
  d.setDate(d.getDate() - dow + weekOffset * 7)
  return d
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
// A task sits on its scheduled day if the Schedule agent placed it, else its due day.
function effectiveDate(t: TaskNodeUI): string | Date | null {
  return t.scheduledStart ?? t.dueDate ?? null
}
function scheduledTime(t: TaskNodeUI): string | null {
  if (!t.scheduledStart) return null
  return new Date(t.scheduledStart).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })
}

type View = 'week' | 'month'

export function Calendar({ tasks }: { tasks: TaskNodeUI[] }) {
  const router = useRouter()
  const [view, setView] = useState<View>('month')
  const [weekOffset, setWeekOffset] = useState(0)
  const [monthOffset, setMonthOffset] = useState(0)
  const [selected, setSelected] = useState<TaskNodeUI | null>(null)
  const [priority, setPriority] = useState<PriorityFilter>('ALL')
  const [hideDone, setHideDone] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('taskagent:calview')
    if (saved === 'week' || saved === 'month') setView(saved)
  }, [])
  useEffect(() => {
    localStorage.setItem('taskagent:calview', view)
  }, [view])

  const today = new Date()
  const filtered = tasks.filter(
    (t) => (priority === 'ALL' || t.priority === priority) && (!hideDone || t.status !== 'DONE'),
  )
  const placed = filtered.filter((t) => effectiveDate(t))
  const unscheduled = filtered.filter((t) => !t.scheduledStart && !t.dueDate)
  const tasksOn = (day: Date) =>
    placed.filter((t) => sameDay(new Date(effectiveDate(t) as string), day))

  function goPrev() {
    if (view === 'week') setWeekOffset((w) => w - 1)
    else setMonthOffset((m) => m - 1)
  }
  function goNext() {
    if (view === 'week') setWeekOffset((w) => w + 1)
    else setMonthOffset((m) => m + 1)
  }
  function goToday() {
    setWeekOffset(0)
    setMonthOffset(0)
  }

  async function addOnDay(date: Date, title: string) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, dueDate: date.toISOString() }),
    })
    if (!res.ok) {
      toast.error('Could not add task')
      return
    }
    toast.success('Task added')
    router.refresh()
  }

  // Range label depends on the active view.
  const monthBase = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1)
  const monday = mondayOf(today, weekOffset)
  const sunday = addDays(monday, 6)
  const rangeLabel =
    view === 'week'
      ? `${monday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${sunday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
      : monthBase.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <header className="tl-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium tracking-[0.25em] text-violet-300/70 uppercase">
            Calendar
          </p>
          <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-white">
            Your <span className="text-violet-300">{view === 'week' ? 'week' : 'month'}</span>
          </h2>
          <p className="mt-1.5 text-sm text-white/50">
            Tasks by due date and scheduled time. Click any task to open its agents.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as PriorityFilter)}
            aria-label="Filter by priority"
            className="h-8 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white/75 focus:border-violet-400/40 focus:outline-none"
          >
            <option value="ALL">All priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <button
            type="button"
            onClick={() => setHideDone((v) => !v)}
            className={`rounded-md border px-2.5 py-1 text-xs transition-colors ${
              hideDone
                ? 'border-violet-400/40 bg-violet-500/15 text-white'
                : 'border-white/15 text-white/70 hover:bg-white/5'
            }`}
          >
            Hide done
          </button>
          <div className="mr-1 inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
            <button
              type="button"
              onClick={() => setView('week')}
              aria-pressed={view === 'week'}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors ${
                view === 'week' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              <CalendarRange className="h-3.5 w-3.5" />
              Week
            </button>
            <button
              type="button"
              onClick={() => setView('month')}
              aria-pressed={view === 'month'}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors ${
                view === 'month' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Grid3x3 className="h-3.5 w-3.5" />
              Month
            </button>
          </div>
          <span className="mr-1 text-sm text-white/60 tabular-nums">{rangeLabel}</span>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={goPrev}
            className="border-white/15 text-white/70 hover:bg-white/5"
            title={view === 'week' ? 'Previous week' : 'Previous month'}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={goToday}
            className="border-white/15 text-white/70 hover:bg-white/5"
          >
            Today
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={goNext}
            className="border-white/15 text-white/70 hover:bg-white/5"
            title={view === 'week' ? 'Next week' : 'Next month'}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {view === 'week' ? (
        <WeekGrid
          days={Array.from({ length: 7 }, (_, i) => addDays(monday, i))}
          today={today}
          tasksOn={tasksOn}
          onOpen={setSelected}
        />
      ) : (
        <MonthGrid
          monthBase={monthBase}
          today={today}
          tasksOn={tasksOn}
          onOpen={setSelected}
          onAddOnDay={addOnDay}
        />
      )}

      {/* Unscheduled */}
      {unscheduled.length > 0 && (
        <div className="tl-rise">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium tracking-wider text-white/35 uppercase">
            <Inbox className="h-3.5 w-3.5" />
            No due date
          </div>
          <div className="flex flex-wrap gap-2">
            {unscheduled.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setSelected(t)}
                className={`rounded-lg border px-3 py-1.5 text-left text-xs font-medium transition-transform hover:-translate-y-0.5 ${
                  CARD[t.priority]
                } ${t.status === 'DONE' ? 'opacity-50' : ''}`}
              >
                {t.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {placed.length === 0 && unscheduled.length === 0 && (
        <div className="tl-rise rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <CalendarDays className="mx-auto h-6 w-6 text-violet-300/60" />
          <p className="mt-3 text-sm text-white/60">Nothing scheduled.</p>
          <p className="mt-1 text-xs text-white/40">
            Add a due date to a task and it’ll appear here.
          </p>
        </div>
      )}

      {selected && (
        <TaskDetail
          task={selected}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setSelected(null)
            router.push('/tasks')
          }}
        />
      )}
    </div>
  )
}

/* ───────── Week view ───────── */
function WeekGrid({
  days,
  today,
  tasksOn,
  onOpen,
}: {
  days: Date[]
  today: Date
  tasksOn: (d: Date) => TaskNodeUI[]
  onOpen: (t: TaskNodeUI) => void
}) {
  return (
    <div className="tl-rise overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025] p-3 backdrop-blur-sm">
      <div className="grid min-w-[760px] grid-cols-7 gap-2">
        {days.map((day, i) => {
          const isToday = sameDay(day, today)
          const items = tasksOn(day)
          return (
            <div key={i} className="flex flex-col">
              <div className="mb-2 text-center">
                <div className="text-[10px] font-medium tracking-widest text-white/35 uppercase">
                  {DAY_LABELS[i]}
                </div>
                <div
                  className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums ${
                    isToday ? 'bg-violet-500 text-white' : 'text-white/70'
                  }`}
                >
                  {day.getDate()}
                </div>
              </div>
              <div
                className={`flex min-h-[60vh] flex-col gap-2 rounded-xl p-2 ${
                  isToday ? 'bg-violet-500/[0.06]' : 'bg-white/[0.015]'
                }`}
              >
                {items.length === 0 ? (
                  <div className="mt-2 text-center text-[11px] text-white/20">—</div>
                ) : (
                  items.map((t) => {
                    const done = t.status === 'DONE'
                    const subN = t.children?.length ?? 0
                    const time = scheduledTime(t)
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => onOpen(t)}
                        className={`rounded-lg border p-2 text-left transition-transform hover:-translate-y-0.5 ${
                          CARD[t.priority]
                        } ${done ? 'opacity-50' : ''}`}
                      >
                        {time && (
                          <div className="mb-0.5 text-[10px] font-semibold tabular-nums opacity-80">
                            {time}
                          </div>
                        )}
                        <div
                          className={`line-clamp-3 text-xs leading-snug font-medium ${done ? 'line-through' : ''}`}
                        >
                          {t.title}
                        </div>
                        {subN > 0 && (
                          <div className="mt-1.5 text-[10px] text-white/55">{subN} steps</div>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ───────── Month view ───────── */
function MonthGrid({
  monthBase,
  today,
  tasksOn,
  onOpen,
  onAddOnDay,
}: {
  monthBase: Date
  today: Date
  tasksOn: (d: Date) => TaskNodeUI[]
  onOpen: (t: TaskNodeUI) => void
  onAddOnDay: (date: Date, title: string) => void
}) {
  const [addKey, setAddKey] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const month = monthBase.getMonth()
  const leading = (monthBase.getDay() + 6) % 7 // Mon-start offset of the 1st
  const daysInMonth = new Date(monthBase.getFullYear(), month + 1, 0).getDate()
  const weeks = Math.ceil((leading + daysInMonth) / 7)
  const gridStart = addDays(monthBase, -leading)
  const cells = Array.from({ length: weeks * 7 }, (_, i) => addDays(gridStart, i))
  const MAX_CHIPS = 3

  return (
    <div className="tl-rise overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025] p-3 backdrop-blur-sm">
      <div className="min-w-[760px]">
        <div className="mb-2 grid grid-cols-7 gap-2">
          {DAY_LABELS.map((d) => (
            <div
              key={d}
              className="text-center text-[10px] font-medium tracking-widest text-white/35 uppercase"
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {cells.map((day, i) => {
            const inMonth = day.getMonth() === month
            const isToday = sameDay(day, today)
            const items = tasksOn(day)
            const key = day.toISOString().slice(0, 10)
            return (
              <div
                key={i}
                className={`group flex min-h-[104px] flex-col gap-1 rounded-xl border p-1.5 ${
                  isToday
                    ? 'border-violet-400/40 bg-violet-500/[0.07]'
                    : 'border-white/5 bg-white/[0.015]'
                } ${inMonth ? '' : 'opacity-40'}`}
              >
                <div
                  className={`ml-auto flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold tabular-nums ${
                    isToday ? 'bg-violet-500 text-white' : 'text-white/55'
                  }`}
                >
                  {day.getDate()}
                </div>
                {items.slice(0, MAX_CHIPS).map((t) => {
                  const done = t.status === 'DONE'
                  const time = scheduledTime(t)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onOpen(t)}
                      title={time ? `${time} · ${t.title}` : t.title}
                      className={`flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-left text-[10px] font-medium transition-colors hover:bg-white/10 ${
                        CARD[t.priority]
                      } ${done ? 'opacity-50' : ''}`}
                    >
                      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[t.priority]}`} />
                      {time && <span className="shrink-0 tabular-nums opacity-80">{time}</span>}
                      <span className={`truncate ${done ? 'line-through' : ''}`}>{t.title}</span>
                    </button>
                  )
                })}
                {items.length > MAX_CHIPS && (
                  <button
                    type="button"
                    onClick={() => onOpen(items[MAX_CHIPS])}
                    className="px-1.5 text-left text-[10px] text-white/45 hover:text-white/70"
                  >
                    +{items.length - MAX_CHIPS} more
                  </button>
                )}
                {inMonth &&
                  (addKey === key ? (
                    <input
                      autoFocus
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const t = title.trim()
                          setAddKey(null)
                          setTitle('')
                          if (t) onAddOnDay(day, t)
                        } else if (e.key === 'Escape') {
                          setAddKey(null)
                          setTitle('')
                        }
                      }}
                      onBlur={() => {
                        setAddKey(null)
                        setTitle('')
                      }}
                      placeholder="New task…"
                      className="mt-auto w-full rounded-md border border-white/10 bg-white/10 px-1.5 py-0.5 text-[10px] text-white placeholder:text-white/35 focus:border-violet-400/40 focus:outline-none"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setTitle('')
                        setAddKey(key)
                      }}
                      className="mt-auto px-1.5 text-left text-[10px] text-white/0 transition-colors group-hover:text-white/40 hover:!text-white/70"
                    >
                      + add
                    </button>
                  ))}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
