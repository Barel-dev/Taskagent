'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

// Client-side preferences, stored in localStorage and read by the rest of the
// app (default view/sort by task-list, default priority by the task form,
// confetti by the completion handler).
export function SettingsForm() {
  const [view, setView] = useState('list')
  const [sort, setSort] = useState('default')
  const [priority, setPriority] = useState('MEDIUM')
  const [confetti, setConfetti] = useState(true)

  useEffect(() => {
    setView(localStorage.getItem('taskagent:view') ?? 'list')
    setSort(localStorage.getItem('taskagent:sort') ?? 'default')
    setPriority(localStorage.getItem('taskagent:defaultPriority') ?? 'MEDIUM')
    setConfetti(localStorage.getItem('taskagent:confetti') !== 'off')
  }, [])

  function persist(key: string, value: string) {
    localStorage.setItem(key, value)
    toast.success('Saved')
  }

  const selectClass =
    'h-9 rounded-md border border-white/10 bg-white/5 px-2.5 text-sm text-white/80 focus:border-violet-400/40 focus:outline-none'

  return (
    <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.035] backdrop-blur-sm">
      <Row label="Default view" hint="Which view opens on the tasks page.">
        <select
          value={view}
          onChange={(e) => {
            setView(e.target.value)
            persist('taskagent:view', e.target.value)
          }}
          className={selectClass}
        >
          <option value="list">List</option>
          <option value="board">Board</option>
        </select>
      </Row>

      <Row label="Default sort" hint="How tasks are ordered by default.">
        <select
          value={sort}
          onChange={(e) => {
            setSort(e.target.value)
            persist('taskagent:sort', e.target.value)
          }}
          className={selectClass}
        >
          <option value="default">Smart</option>
          <option value="due">Due date</option>
          <option value="priority">Priority</option>
          <option value="title">Title</option>
        </select>
      </Row>

      <Row label="New-task priority" hint="The priority preselected for a new task.">
        <select
          value={priority}
          onChange={(e) => {
            setPriority(e.target.value)
            persist('taskagent:defaultPriority', e.target.value)
          }}
          className={selectClass}
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="URGENT">Urgent</option>
        </select>
      </Row>

      <Row label="Celebrate completions" hint="Confetti when you finish your last task.">
        <button
          type="button"
          onClick={() => {
            const next = !confetti
            setConfetti(next)
            persist('taskagent:confetti', next ? 'on' : 'off')
          }}
          role="switch"
          aria-checked={confetti}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            confetti ? 'bg-violet-500' : 'bg-white/15'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              confetti ? 'translate-x-5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </Row>
    </div>
  )
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-5">
      <div>
        <div className="text-sm font-medium text-white/85">{label}</div>
        <div className="mt-0.5 text-xs text-white/45">{hint}</div>
      </div>
      {children}
    </div>
  )
}
