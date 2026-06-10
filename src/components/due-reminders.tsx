'use client'

import { useEffect } from 'react'

// Fires browser notifications for tasks that are due today or overdue, at most
// once per task per day. Opt-in via Settings (sets `taskagent:notify` = 'on'
// and grants Notification permission). Runs only while a tab is open — checks
// on mount, every 15 minutes, and whenever the tab regains focus.
const NOTIFIED_KEY = 'taskagent:notified'
const CHECK_MS = 15 * 60 * 1000

type ApiTask = {
  id: string
  title: string
  status: string
  dueDate: string | null
  scheduledStart: string | null
  children?: ApiTask[]
}

// The API returns the task tree (roots with nested children); flatten it so a
// due subtask triggers a reminder too.
function flattenTasks(tasks: ApiTask[]): ApiTask[] {
  const out: ApiTask[] = []
  const walk = (list: ApiTask[]) => {
    for (const t of list) {
      out.push(t)
      if (t.children?.length) walk(t.children)
    }
  }
  walk(tasks)
  return out
}

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

export function DueReminders() {
  useEffect(() => {
    if (!('Notification' in window)) return

    // Keep only today's dedupe keys so old ones don't accumulate forever.
    function loadNotified(): Set<string> {
      try {
        const arr: string[] = JSON.parse(localStorage.getItem(NOTIFIED_KEY) ?? '[]')
        return new Set(arr.filter((k) => k.endsWith(todayKey())))
      } catch {
        return new Set()
      }
    }

    async function check() {
      if (localStorage.getItem('taskagent:notify') !== 'on') return
      if (Notification.permission !== 'granted') return

      const res = await fetch('/api/tasks').catch(() => null)
      if (!res?.ok) return
      const data = await res.json().catch(() => null)
      const tasks: ApiTask[] = flattenTasks(data?.tasks ?? [])

      const notified = loadNotified()
      const today = todayKey()
      const startOfToday = new Date().setHours(0, 0, 0, 0)
      const endOfToday = new Date().setHours(23, 59, 59, 999)
      let changed = false

      const nowMs = Date.now()
      for (const t of tasks) {
        if (t.status === 'DONE') continue

        // Due today / overdue (once per task per day).
        if (t.dueDate) {
          const due = new Date(t.dueDate).getTime()
          const key = `${t.id}:${today}`
          if (due <= endOfToday && !notified.has(key)) {
            const overdue = due < startOfToday
            const n = new Notification(overdue ? 'Overdue task' : 'Task due today', {
              body: t.title,
              tag: key,
            })
            n.onclick = () => {
              window.focus()
              window.location.href = `/tasks?task=${t.id}`
            }
            notified.add(key)
            changed = true
          }
        }

        // Scheduled block starting within the next 30 minutes (once per day).
        if (t.scheduledStart) {
          const start = new Date(t.scheduledStart).getTime()
          const mins = (start - nowMs) / 60000
          const key = `${t.id}:sched:${today}`
          if (mins >= 0 && mins <= 30 && !notified.has(key)) {
            const n = new Notification('Starting soon', {
              body: t.title,
              tag: key,
            })
            n.onclick = () => {
              window.focus()
              window.location.href = `/tasks?task=${t.id}`
            }
            notified.add(key)
            changed = true
          }
        }
      }

      if (changed) localStorage.setItem(NOTIFIED_KEY, JSON.stringify([...notified]))
    }

    check()
    const interval = setInterval(check, CHECK_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') check()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  return null
}
