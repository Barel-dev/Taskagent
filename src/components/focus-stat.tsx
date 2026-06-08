'use client'

import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'

// Sums the per-task Pomodoro session counts kept in localStorage by FocusTimer.
// Renders nothing until there's at least one completed session.
export function FocusStat() {
  const [total, setTotal] = useState(0)

  useEffect(() => {
    let sum = 0
    for (const k of Object.keys(localStorage)) {
      if (k.startsWith('taskagent:focus:')) sum += Number(localStorage.getItem(k) ?? 0)
    }
    setTotal(sum)
  }, [])

  if (total <= 0) return null
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70">
      <Timer className="h-4 w-4 text-violet-300" />
      🍅 {total} focus session{total === 1 ? '' : 's'} completed
    </div>
  )
}
