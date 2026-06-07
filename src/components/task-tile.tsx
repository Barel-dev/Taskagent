'use client'

import { useState } from 'react'
import {
  Clock,
  CalendarDays,
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Pin,
  Repeat,
  Check,
  X,
  CalendarClock,
} from 'lucide-react'
import type { TaskNodeUI } from '@/components/task-list'
import { TagChips } from '@/components/tag-chip'
import { Highlighted } from '@/components/highlight'
import { formatDue, dueToneClass } from '@/lib/format-due'

const PRIORITY: Record<TaskNodeUI['priority'], { dot: string; label: string; bar: string }> = {
  LOW: { dot: 'bg-slate-400', label: 'text-slate-300', bar: 'bg-slate-400/70' },
  MEDIUM: { dot: 'bg-sky-400', label: 'text-sky-300', bar: 'bg-sky-400/70' },
  HIGH: { dot: 'bg-amber-400', label: 'text-amber-300', bar: 'bg-amber-400/70' },
  URGENT: { dot: 'bg-rose-500', label: 'text-rose-300', bar: 'bg-rose-500/70' },
}

const PRIORITY_ORDER: TaskNodeUI['priority'][] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
function nextPriority(p: TaskNodeUI['priority']): TaskNodeUI['priority'] {
  return PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(p) + 1) % PRIORITY_ORDER.length]
}

export function TaskTile({
  task,
  onOpen,
  onStatusChange,
  onPriorityChange,
  onPin,
  onDueChange,
  onTagClick,
  highlight,
  selected,
  onToggleSelect,
}: {
  task: TaskNodeUI
  onOpen: () => void
  /** Search term to highlight within the title. */
  highlight?: string
  /** When provided, clicking a tag chip filters by it. */
  onTagClick?: (id: string) => void
  /** When provided, the tile shows a quick done/undone toggle. */
  onStatusChange?: (status: TaskNodeUI['status']) => void
  /** When provided, clicking the priority cycles it. */
  onPriorityChange?: (priority: TaskNodeUI['priority']) => void
  /** When provided, the tile shows a pin toggle. */
  onPin?: (pinned: boolean) => void
  /** When provided, the due date becomes editable inline. */
  onDueChange?: (dueDate: string | null) => void
  /** Bulk-selection state + toggle (shows a hover checkbox). */
  selected?: boolean
  onToggleSelect?: () => void
}) {
  const total = task.children?.length ?? 0
  const done = task.children?.filter((c) => c.status === 'DONE').length ?? 0
  const pct = total ? Math.round((done / total) * 100) : task.status === 'DONE' ? 100 : 0
  const pr = PRIORITY[task.priority]
  const isDone = task.status === 'DONE'
  const due = formatDue(task.dueDate, task.status)

  // Root is a div-as-button so the quick toggle below can be a real button
  // without nesting <button> inside <button>.
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpen()
        }
      }}
      className={`task-card group relative flex h-44 w-full cursor-pointer flex-col overflow-hidden rounded-2xl border bg-white/[0.035] p-4 text-left backdrop-blur-sm ${
        selected ? 'border-violet-400/60 ring-2 ring-violet-400/40' : 'border-white/10'
      } ${isDone ? 'opacity-60' : ''}`}
    >
      {/* top row: done toggle + priority + progress */}
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-[11px]">
          {onStatusChange && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onStatusChange(isDone ? 'TODO' : 'DONE')
              }}
              title={isDone ? 'Mark not done' : 'Mark done'}
              aria-label={isDone ? 'Mark not done' : 'Mark done'}
              className="-ml-0.5 text-white/40 hover:text-violet-300"
            >
              {isDone ? (
                <CheckCircle2 className="h-4 w-4 text-violet-400" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </button>
          )}
          {onPriorityChange ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onPriorityChange(nextPriority(task.priority))
              }}
              title="Click to change priority"
              className="inline-flex items-center gap-1.5 rounded transition-opacity hover:opacity-80"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${pr.dot}`} />
              <span className={`font-medium ${pr.label}`}>{task.priority}</span>
            </button>
          ) : (
            <>
              <span className={`h-1.5 w-1.5 rounded-full ${pr.dot}`} />
              <span className={`font-medium ${pr.label}`}>{task.priority}</span>
            </>
          )}
        </span>
        <span className="flex items-center gap-2">
          {onToggleSelect && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleSelect()
              }}
              title={selected ? 'Deselect' : 'Select'}
              aria-label={selected ? 'Deselect' : 'Select'}
              className={`flex h-4 w-4 items-center justify-center rounded border transition-opacity ${
                selected
                  ? 'border-violet-400 bg-violet-500 text-white opacity-100'
                  : 'border-white/30 text-transparent opacity-0 group-hover:opacity-100'
              }`}
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </button>
          )}
          {total > 0 && (
            <span className="text-[11px] text-white/40 tabular-nums">
              {done}/{total}
            </span>
          )}
          {onPin && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onPin(!task.pinned)
              }}
              title={task.pinned ? 'Unpin' : 'Pin to top'}
              aria-label={task.pinned ? 'Unpin' : 'Pin to top'}
              className={task.pinned ? 'text-violet-300' : 'text-white/25 hover:text-white/60'}
            >
              <Pin className={`h-3.5 w-3.5 ${task.pinned ? 'fill-violet-300' : ''}`} />
            </button>
          )}
        </span>
      </div>

      {/* title + description */}
      <h3
        className={`mt-2.5 line-clamp-2 leading-snug font-medium ${
          isDone ? 'text-white/60 line-through' : 'text-white'
        }`}
      >
        <Highlighted text={task.title} query={highlight ?? ''} />
      </h3>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/45">
          {task.description}
        </p>
      )}

      <TagChips tags={task.tags} className="mt-2" onTagClick={onTagClick} />

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
          {task.scheduledStart && (
            <span className="inline-flex items-center gap-1 text-violet-300/80" title="Scheduled">
              <CalendarClock className="h-3 w-3" />
              {new Date(task.scheduledStart).toLocaleString(undefined, {
                weekday: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          )}
          {task.estimatedMinutes != null && (
            <span
              className="inline-flex items-center gap-1"
              title="Estimated time to do it yourself"
            >
              <Clock className="h-3 w-3" />~{task.estimatedMinutes}m
            </span>
          )}
          {onDueChange ? (
            <DueEditor dueDate={task.dueDate} status={task.status} onChange={onDueChange} />
          ) : (
            due && (
              <span className={`inline-flex items-center gap-1 ${dueToneClass(due)}`}>
                <CalendarDays className="h-3 w-3" />
                {due.label}
              </span>
            )
          )}
          {total > 0 ? (
            <span className="inline-flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              {total} subtasks
            </span>
          ) : null}
          {task.recurrence && task.recurrence !== 'NONE' && (
            <span className="inline-flex items-center gap-1" title="Repeats">
              <Repeat className="h-3 w-3" />
              {task.recurrence.toLowerCase()}
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-0.5 text-violet-300/70 transition-colors group-hover:text-violet-200">
            Open
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </div>
      </div>
    </div>
  )
}

// Inline due-date control for the tile footer. Shows the due chip (or a faint
// "Due" affordance on hover) and, on click, a native date picker. All clicks
// stop propagation so they don't open the task.
function DueEditor({
  dueDate,
  status,
  onChange,
}: {
  dueDate: TaskNodeUI['dueDate']
  status: TaskNodeUI['status']
  onChange: (dueDate: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const due = formatDue(dueDate, status)
  const value = dueDate ? new Date(dueDate).toISOString().slice(0, 10) : ''

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          type="date"
          autoFocus
          defaultValue={value}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => {
            onChange(e.target.value ? new Date(e.target.value).toISOString() : null)
            setEditing(false)
          }}
          onBlur={() => setEditing(false)}
          className="rounded border border-white/15 bg-white/10 px-1 py-0.5 text-[11px] text-white [color-scheme:dark] focus:outline-none"
        />
        {due && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange(null)
              setEditing(false)
            }}
            aria-label="Clear due date"
            className="text-white/40 hover:text-rose-300"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        setEditing(true)
      }}
      title="Set due date"
      className={`inline-flex items-center gap-1 rounded transition-opacity hover:bg-white/5 ${
        due ? dueToneClass(due) : 'text-white/30 opacity-0 group-hover:opacity-100'
      }`}
    >
      <CalendarDays className="h-3 w-3" />
      {due ? due.label : 'Due'}
    </button>
  )
}
