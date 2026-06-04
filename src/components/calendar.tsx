'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, CalendarDays, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TaskDetail } from '@/components/task-detail'
import type { TaskNodeUI } from '@/components/task-list'

const DAY_LABELS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

// Priority → card style (the highlighted purple look from the landing mockup).
const CARD: Record<TaskNodeUI['priority'], string> = {
  URGENT: 'border-rose-400/30 bg-gradient-to-br from-rose-500/25 to-rose-500/[0.04] text-rose-50',
  HIGH: 'border-violet-400/30 bg-gradient-to-br from-violet-500/25 to-fuchsia-500/[0.06] text-violet-50',
  MEDIUM: 'border-sky-400/25 bg-gradient-to-br from-sky-500/15 to-sky-500/[0.03] text-sky-50',
  LOW: 'border-white/10 bg-white/[0.05] text-white/80',
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

export function Calendar({ tasks }: { tasks: TaskNodeUI[] }) {
  const router = useRouter()
  const [weekOffset, setWeekOffset] = useState(0)
  const [selected, setSelected] = useState<TaskNodeUI | null>(null)

  const today = new Date()
  const monday = mondayOf(today, weekOffset)
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const sunday = days[6]

  const dated = tasks.filter((t) => t.dueDate)
  const byDay = days.map((day) =>
    dated.filter((t) => sameDay(new Date(t.dueDate as string), day)),
  )
  const unscheduled = tasks.filter((t) => !t.dueDate)

  const rangeLabel = `${monday.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} – ${sunday.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <header className="tl-rise flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-violet-300/70">
            Calendar
          </p>
          <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-white">
            Your <span className="text-violet-300">week</span>
          </h2>
          <p className="mt-1.5 text-sm text-white/50">
            Tasks laid out by due date. Click any task to open its agents.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="mr-1 text-sm tabular-nums text-white/60">{rangeLabel}</span>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => setWeekOffset((w) => w - 1)}
            className="border-white/15 text-white/70 hover:bg-white/5"
            title="Previous week"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setWeekOffset(0)}
            className="border-white/15 text-white/70 hover:bg-white/5"
          >
            Today
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => setWeekOffset((w) => w + 1)}
            className="border-white/15 text-white/70 hover:bg-white/5"
            title="Next week"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Week grid */}
      <div className="tl-rise overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.025] p-3 backdrop-blur-sm">
        <div className="grid min-w-[760px] grid-cols-7 gap-2">
          {days.map((day, i) => {
            const isToday = sameDay(day, today)
            return (
              <div key={i} className="flex flex-col">
                <div className="mb-2 text-center">
                  <div className="text-[10px] font-medium uppercase tracking-widest text-white/35">
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
                  {byDay[i].length === 0 ? (
                    <div className="mt-2 text-center text-[11px] text-white/20">—</div>
                  ) : (
                    byDay[i].map((t) => {
                      const done = t.status === 'DONE'
                      const subN = t.children?.length ?? 0
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setSelected(t)}
                          className={`rounded-lg border p-2 text-left transition-transform hover:-translate-y-0.5 ${
                            CARD[t.priority]
                          } ${done ? 'opacity-50' : ''}`}
                        >
                          <div
                            className={`line-clamp-3 text-xs font-medium leading-snug ${
                              done ? 'line-through' : ''
                            }`}
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

      {/* Unscheduled */}
      {unscheduled.length > 0 && (
        <div className="tl-rise">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-white/35">
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

      {dated.length === 0 && unscheduled.length === 0 && (
        <div className="tl-rise rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <CalendarDays className="mx-auto h-6 w-6 text-violet-300/60" />
          <p className="mt-3 text-sm text-white/60">Nothing scheduled.</p>
          <p className="mt-1 text-xs text-white/40">Add a due date to a task and it’ll appear here.</p>
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
