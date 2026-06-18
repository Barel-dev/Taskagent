'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'

// Preferences form. Most are on-device (localStorage, read by task-list, the
// task form, and the completion handler); the briefing email opt-in is
// server-backed because the morning cron needs it.
export function SettingsForm({ initialBriefingEmail = false }: { initialBriefingEmail?: boolean }) {
  const [view, setView] = useState('list')
  const [sort, setSort] = useState('default')
  const [priority, setPriority] = useState('MEDIUM')
  const [confetti, setConfetti] = useState(true)
  const [notify, setNotify] = useState(false)
  const [focusMinutes, setFocusMinutes] = useState('25')
  const [briefingEmail, setBriefingEmail] = useState(initialBriefingEmail)

  useEffect(() => {
    setView(localStorage.getItem('taskagent:view') ?? 'list')
    setSort(localStorage.getItem('taskagent:sort') ?? 'default')
    setPriority(localStorage.getItem('taskagent:defaultPriority') ?? 'MEDIUM')
    setConfetti(localStorage.getItem('taskagent:confetti') !== 'off')
    setNotify(localStorage.getItem('taskagent:notify') === 'on')
    setFocusMinutes(localStorage.getItem('taskagent:focusMinutes') ?? '25')
  }, [])

  function persist(key: string, value: string) {
    localStorage.setItem(key, value)
    toast.success('Saved')
  }

  // Turning reminders on requires the browser's Notification permission.
  async function toggleNotify() {
    if (notify) {
      setNotify(false)
      persist('taskagent:notify', 'off')
      return
    }
    if (!('Notification' in window)) {
      toast.error('This browser does not support notifications')
      return
    }
    let perm = Notification.permission
    if (perm === 'default') perm = await Notification.requestPermission()
    if (perm !== 'granted') {
      toast.error('Notifications are blocked in your browser settings')
      return
    }
    setNotify(true)
    persist('taskagent:notify', 'on')
  }

  // Server-backed opt-in for the morning briefing email.
  async function toggleBriefingEmail() {
    const next = !briefingEmail
    setBriefingEmail(next)
    const res = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ briefingEmail: next }),
    })
    if (!res.ok) {
      setBriefingEmail(!next)
      toast.error('Could not save — please try again')
      return
    }
    toast.success(
      next ? 'Morning briefing email on — make sure Google is connected' : 'Briefing email off',
    )
  }

  const selectClass =
    'h-9 rounded-md border border-white/10 bg-white/5 px-2.5 text-sm text-white/80 focus:border-violet-400/40 focus:outline-none'

  // Wipe every on-device preference (views, saved views, chat, settings).
  function resetLocal() {
    if (
      !confirm(
        'Reset all preferences and local data on this device? Saved views, chat history, and settings will be cleared.',
      )
    ) {
      return
    }
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('taskagent:')) localStorage.removeItem(k)
    }
    setView('list')
    setSort('default')
    setPriority('MEDIUM')
    setConfetti(true)
    setNotify(false)
    setFocusMinutes('25')
    toast.success('Local data cleared')
  }

  return (
    <div className="space-y-4">
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
            <option value="manual">Manual (drag)</option>
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

        <Row label="Focus session length" hint="Length of the Pomodoro timer in the task detail.">
          <select
            value={focusMinutes}
            onChange={(e) => {
              setFocusMinutes(e.target.value)
              persist('taskagent:focusMinutes', e.target.value)
            }}
            className={selectClass}
          >
            <option value="15">15 minutes</option>
            <option value="25">25 minutes</option>
            <option value="45">45 minutes</option>
            <option value="60">60 minutes</option>
          </select>
        </Row>

        <Row label="Celebrate completions" hint="Confetti when you finish your last task.">
          <Toggle
            on={confetti}
            onClick={() => {
              const next = !confetti
              setConfetti(next)
              persist('taskagent:confetti', next ? 'on' : 'off')
            }}
          />
        </Row>

        <Row
          label="Due-soon reminders"
          hint="Browser notifications for tasks due today or overdue, while a tab is open."
        >
          <Toggle on={notify} onClick={toggleNotify} />
        </Row>

        <Row
          label="Morning briefing email"
          hint="Each morning the briefing agent emails your daily brief to your inbox, from your own Gmail. Needs Google connected (Connect Google in the Email agent)."
        >
          <Toggle on={briefingEmail} onClick={toggleBriefingEmail} />
        </Row>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-2xl border border-rose-400/20 bg-rose-500/[0.04] p-5">
        <div>
          <div className="text-sm font-medium text-white/85">Reset local data</div>
          <div className="mt-0.5 text-xs text-white/45">
            Clears preferences, saved views, and chat history on this device. Your tasks are not
            affected.
          </div>
        </div>
        <button
          type="button"
          onClick={resetLocal}
          className="shrink-0 rounded-md border border-rose-400/30 px-3 py-1.5 text-sm text-rose-200 hover:bg-rose-500/10"
        >
          Reset
        </button>
      </div>
    </div>
  )
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative h-6 w-11 rounded-full transition-colors ${
        on ? 'bg-violet-500' : 'bg-white/15'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
          on ? 'translate-x-5' : 'translate-x-0.5'
        }`}
      />
    </button>
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
