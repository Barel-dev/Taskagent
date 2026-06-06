'use client'

import { Clock, CalendarDays, ArrowUpRight, CheckCircle2 } from 'lucide-react'
import type { TaskNodeUI } from '@/components/task-list'
import { TagChips } from '@/components/tag-chip'
import { formatDue, dueToneClass } from '@/lib/format-due'

const PRIORITY: Record<TaskNodeUI['priority'], { dot: string; label: string; bar: string }> = {
  LOW: { dot: 'bg-slate-400', label: 'text-slate-300', bar: 'bg-slate-400/70' },
  MEDIUM: { dot: 'bg-sky-400', label: 'text-sky-300', bar: 'bg-sky-400/70' },
  HIGH: { dot: 'bg-amber-400', label: 'text-amber-300', bar: 'bg-amber-400/70' },
  URGENT: { dot: 'bg-rose-500', label: 'text-rose-300', bar: 'bg-rose-500/70' },
}

export function TaskTile({ task, onOpen }: { task: TaskNodeUI; onOpen: () => void }) {
  const total = task.children?.length ?? 0
  const done = task.children?.filter((c) => c.status === 'DONE').length ?? 0
  const pct = total ? Math.round((done / total) * 100) : task.status === 'DONE' ? 100 : 0
  const pr = PRIORITY[task.priority]
  const isDone = task.status === 'DONE'
  const due = formatDue(task.dueDate, task.status)

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`task-card group relative flex h-44 w-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left backdrop-blur-sm ${
        isDone ? 'opacity-60' : ''
      }`}
    >
      {/* top row: priority + progress */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px]">
          <span className={`h-1.5 w-1.5 rounded-full ${pr.dot}`} />
          <span className={`font-medium ${pr.label}`}>{task.priority}</span>
        </span>
        {total > 0 && (
          <span className="text-[11px] text-white/40 tabular-nums">
            {done}/{total}
          </span>
        )}
      </div>

      {/* title + description */}
      <h3
        className={`mt-2.5 line-clamp-2 leading-snug font-medium ${
          isDone ? 'text-white/60 line-through' : 'text-white'
        }`}
      >
        {task.title}
      </h3>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/45">
          {task.description}
        </p>
      )}

      <TagChips tags={task.tags} className="mt-2" />

      {/* footer */}
      <div className="mt-auto">
        {total > 0 && (
          <div className="mb-2 h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${pr.bar} transition-all`}
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
        <div className="flex items-center gap-2.5 text-[11px] text-white/45">
          {task.estimatedMinutes != null && (
            <span
              className="inline-flex items-center gap-1"
              title="Estimated time to do it yourself"
            >
              <Clock className="h-3 w-3" />~{task.estimatedMinutes}m
            </span>
          )}
          {due && (
            <span className={`inline-flex items-center gap-1 ${dueToneClass(due)}`}>
              <CalendarDays className="h-3 w-3" />
              {due.label}
            </span>
          )}
          {total > 0 ? (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {total} subtasks
            </span>
          ) : null}
          <span className="ml-auto inline-flex items-center gap-0.5 text-violet-300/70 transition-colors group-hover:text-violet-200">
            Open
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </button>
  )
}
