'use client'

import { useEffect, useState } from 'react'
import { Play, Pause, RotateCcw, Timer } from 'lucide-react'
import { toast } from 'sonner'
import { confetti } from '@/lib/confetti'

const FOCUS_SECONDS = 25 * 60

// A compact 25-minute Pomodoro for the open task. Completing a session bumps a
// per-task counter (localStorage) and celebrates. Runs while the detail is open.
export function FocusTimer({ taskId }: { taskId: string }) {
  const key = `taskagent:focus:${taskId}`
  const [left, setLeft] = useState(FOCUS_SECONDS)
  const [running, setRunning] = useState(false)
  const [sessions, setSessions] = useState(0)

  useEffect(() => {
    setSessions(Number(localStorage.getItem(key) ?? 0))
  }, [key])

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (left !== 0 || !running) return
    setRunning(false)
    setLeft(FOCUS_SECONDS)
    const n = Number(localStorage.getItem(key) ?? 0) + 1
    localStorage.setItem(key, String(n))
    setSessions(n)
    if (localStorage.getItem('taskagent:confetti') !== 'off') confetti()
    toast.success('Focus session complete! 🍅')
  }, [left, running, key])

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-white/70">
      <Timer className={`h-3.5 w-3.5 ${running ? 'text-violet-300' : 'text-white/40'}`} />
      <span className="tabular-nums">
        {mm}:{ss}
      </span>
      <button
        type="button"
        onClick={() => setRunning((r) => !r)}
        title={running ? 'Pause' : 'Start focus'}
        aria-label={running ? 'Pause' : 'Start focus'}
        className="text-white/55 hover:text-white"
      >
        {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      {(running || left !== FOCUS_SECONDS) && (
        <button
          type="button"
          onClick={() => {
            setRunning(false)
            setLeft(FOCUS_SECONDS)
          }}
          title="Reset"
          aria-label="Reset timer"
          className="text-white/40 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      )}
      {sessions > 0 && <span className="text-white/35">🍅 {sessions}</span>}
    </span>
  )
}
