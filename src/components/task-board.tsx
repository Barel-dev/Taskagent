'use client'

import { useState } from 'react'
import { Clock, CalendarDays, CheckCircle2, GripVertical, Plus, X } from 'lucide-react'
import type { TaskNodeUI } from '@/components/task-list'
import { TagChips } from '@/components/tag-chip'
import { formatDue, dueToneClass } from '@/lib/format-due'

type Status = TaskNodeUI['status']
type PriorityKey = TaskNodeUI['priority']

const PRIORITY_ORDER: PriorityKey[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
function nextPriority(p: PriorityKey): PriorityKey {
  return PRIORITY_ORDER[(PRIORITY_ORDER.indexOf(p) + 1) % PRIORITY_ORDER.length]
}

const COLUMNS: { status: Status; label: string }[] = [
  { status: 'TODO', label: 'To do' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'DONE', label: 'Done' },
]

const PRIORITY: Record<TaskNodeUI['priority'], { dot: string; label: string; bar: string }> = {
  LOW: { dot: 'bg-slate-400', label: 'text-slate-300', bar: 'bg-slate-400/70' },
  MEDIUM: { dot: 'bg-sky-400', label: 'text-sky-300', bar: 'bg-sky-400/70' },
  HIGH: { dot: 'bg-amber-400', label: 'text-amber-300', bar: 'bg-amber-400/70' },
  URGENT: { dot: 'bg-rose-500', label: 'text-rose-300', bar: 'bg-rose-500/70' },
}

// Kanban board over the user's top-level tasks. Cards drag between the three
// status columns (native HTML5 DnD — no library); a per-card status select is
// the keyboard-accessible fallback. Both call onMove, which persists the change.
export function TaskBoard({
  tasks,
  onOpen,
  onMove,
  onAddTask,
  onPriorityChange,
  onDueChange,
}: {
  tasks: TaskNodeUI[]
  onOpen: (t: TaskNodeUI) => void
  onMove: (taskId: string, status: Status) => void
  /** Quick-add a task with the column's status. */
  onAddTask?: (status: Status, title: string) => void
  /** When provided, clicking a card's priority cycles it. */
  onPriorityChange?: (taskId: string, priority: PriorityKey) => void
  /** When provided, a card's due date becomes editable inline. */
  onDueChange?: (taskId: string, dueDate: string | null) => void
}) {
  const [dragOver, setDragOver] = useState<Status | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  function handleDrop(status: Status) {
    const id = draggingId
    setDragOver(null)
    setDraggingId(null)
    // No-op when dropped back on the same column.
    if (id && tasks.find((t) => t.id === id)?.status !== status) onMove(id, status)
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {COLUMNS.map((col) => {
        const items = tasks.filter((t) => t.status === col.status)
        const over = dragOver === col.status
        return (
          <div
            key={col.status}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(col.status)
            }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) setDragOver(null)
            }}
            onDrop={() => handleDrop(col.status)}
            className={`rounded-2xl border p-3 transition-colors ${
              over ? 'border-violet-400/50 bg-violet-500/[0.06]' : 'border-white/10 bg-white/[0.02]'
            }`}
          >
            <header className="mb-3 flex items-center justify-between px-1">
              <span className="text-xs font-medium tracking-wider text-white/45 uppercase">
                {col.label}
              </span>
              <span className="text-[11px] text-white/35 tabular-nums">{items.length}</span>
            </header>
            <div className="space-y-2">
              {items.map((t) => (
                <BoardCard
                  key={t.id}
                  task={t}
                  dragging={draggingId === t.id}
                  onOpen={() => onOpen(t)}
                  onMove={onMove}
                  onPriorityChange={onPriorityChange}
                  onDueChange={onDueChange}
                  onDragStart={() => setDraggingId(t.id)}
                  onDragEnd={() => {
                    setDraggingId(null)
                    setDragOver(null)
                  }}
                />
              ))}
              {items.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/10 px-3 py-6 text-center text-[11px] text-white/30">
                  Drop here
                </div>
              )}
              {onAddTask && <ColumnAdd onAdd={(title) => onAddTask(col.status, title)} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BoardCard({
  task,
  dragging,
  onOpen,
  onMove,
  onPriorityChange,
  onDueChange,
  onDragStart,
  onDragEnd,
}: {
  task: TaskNodeUI
  dragging: boolean
  onOpen: () => void
  onMove: (taskId: string, status: Status) => void
  onPriorityChange?: (taskId: string, priority: PriorityKey) => void
  onDueChange?: (taskId: string, dueDate: string | null) => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const pr = PRIORITY[task.priority]
  const total = task.children?.length ?? 0
  const done = task.children?.filter((c) => c.status === 'DONE').length ?? 0
  const pct = total ? Math.round((done / total) * 100) : 0
  const isDone = task.status === 'DONE'
  const due = formatDue(task.dueDate, task.status)

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', task.id)
        onDragStart()
      }}
      onDragEnd={onDragEnd}
      className={`task-card group cursor-grab rounded-xl border border-white/10 bg-white/[0.035] p-3 active:cursor-grabbing ${
        dragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-2">
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
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          {onPriorityChange ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onPriorityChange(task.id, nextPriority(task.priority))
              }}
              title="Click to change priority"
              className="inline-flex items-center gap-1.5 rounded text-[11px] transition-opacity hover:opacity-80"
            >
              <span className={`h-1.5 w-1.5 rounded-full ${pr.dot}`} />
              <span className={`font-medium ${pr.label}`}>{task.priority}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px]">
              <span className={`h-1.5 w-1.5 rounded-full ${pr.dot}`} />
              <span className={`font-medium ${pr.label}`}>{task.priority}</span>
            </span>
          )}
          <h4
            className={`mt-1.5 line-clamp-2 text-sm leading-snug font-medium ${
              isDone ? 'text-white/55 line-through' : 'text-white'
            }`}
          >
            {task.title}
          </h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-white/40">
            {onDueChange ? (
              <DueEditor
                dueDate={task.dueDate}
                status={task.status}
                onChange={(d) => onDueChange(task.id, d)}
              />
            ) : (
              due && (
                <span className={`inline-flex items-center gap-1 ${dueToneClass(due)}`}>
                  <CalendarDays className="h-3 w-3" />
                  {due.label}
                </span>
              )
            )}
            {total > 0 && (
              <span className="inline-flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {done}/{total}
              </span>
            )}
            {task.estimatedMinutes != null && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />~{task.estimatedMinutes}m
              </span>
            )}
          </div>
          {total > 0 && (
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${pr.bar} transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
          <TagChips tags={task.tags} className="mt-2" />
        </div>
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 text-white/20" />
      </div>

      <select
        value={task.status}
        onChange={(e) => onMove(task.id, e.target.value as Status)}
        aria-label={`Status for ${task.title}`}
        className="mt-2.5 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/70 focus:border-violet-400/40 focus:outline-none"
      >
        <option value="TODO">To do</option>
        <option value="IN_PROGRESS">In progress</option>
        <option value="DONE">Done</option>
      </select>
    </div>
  )
}

function ColumnAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')

  function submit() {
    const t = title.trim()
    if (!t) return
    onAdd(t)
    setTitle('')
    setAdding(false)
  }

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="flex w-full items-center gap-1 rounded-lg px-2 py-1.5 text-left text-xs text-white/40 hover:bg-white/5 hover:text-white/70"
      >
        <Plus className="h-3.5 w-3.5" />
        Add task
      </button>
    )
  }

  return (
    <input
      autoFocus
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          submit()
        } else if (e.key === 'Escape') {
          setTitle('')
          setAdding(false)
        }
      }}
      onBlur={submit}
      placeholder="Task title…"
      className="w-full rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-white placeholder:text-white/35 focus:border-violet-400/40 focus:outline-none"
    />
  )
}

// Inline due-date control for a board card. Clicks stop propagation so they
// don't open the task. Shows the due chip (or a faint "Due" on hover).
function DueEditor({
  dueDate,
  status,
  onChange,
}: {
  dueDate: TaskNodeUI['dueDate']
  status: Status
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
          className="rounded border border-white/15 bg-white/10 px-1 py-0.5 text-[10px] text-white [color-scheme:dark] focus:outline-none"
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
