'use client'

import { useState } from 'react'
import { Clock, CalendarDays, CheckCircle2, GripVertical } from 'lucide-react'
import type { TaskNodeUI } from '@/components/task-list'

type Status = TaskNodeUI['status']

const COLUMNS: { status: Status; label: string }[] = [
  { status: 'TODO', label: 'To do' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'DONE', label: 'Done' },
]

const PRIORITY: Record<TaskNodeUI['priority'], { dot: string; label: string }> = {
  LOW: { dot: 'bg-slate-400', label: 'text-slate-300' },
  MEDIUM: { dot: 'bg-sky-400', label: 'text-sky-300' },
  HIGH: { dot: 'bg-amber-400', label: 'text-amber-300' },
  URGENT: { dot: 'bg-rose-500', label: 'text-rose-300' },
}

// Kanban board over the user's top-level tasks. Cards drag between the three
// status columns (native HTML5 DnD — no library); a per-card status select is
// the keyboard-accessible fallback. Both call onMove, which persists the change.
export function TaskBoard({
  tasks,
  onOpen,
  onMove,
}: {
  tasks: TaskNodeUI[]
  onOpen: (t: TaskNodeUI) => void
  onMove: (taskId: string, status: Status) => void
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
  onDragStart,
  onDragEnd,
}: {
  task: TaskNodeUI
  dragging: boolean
  onOpen: () => void
  onMove: (taskId: string, status: Status) => void
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const pr = PRIORITY[task.priority]
  const total = task.children?.length ?? 0
  const done = task.children?.filter((c) => c.status === 'DONE').length ?? 0
  const isDone = task.status === 'DONE'

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
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 text-left">
          <span className="inline-flex items-center gap-1.5 text-[11px]">
            <span className={`h-1.5 w-1.5 rounded-full ${pr.dot}`} />
            <span className={`font-medium ${pr.label}`}>{task.priority}</span>
          </span>
          <h4
            className={`mt-1.5 line-clamp-2 text-sm leading-snug font-medium ${
              isDone ? 'text-white/55 line-through' : 'text-white'
            }`}
          >
            {task.title}
          </h4>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[10px] text-white/40">
            {task.dueDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
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
        </button>
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
