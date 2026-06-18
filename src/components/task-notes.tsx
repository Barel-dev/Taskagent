'use client'

import { useEffect, useRef, useState } from 'react'
import { StickyNote } from 'lucide-react'
import { toast } from 'sonner'

// Free-form working notes for a task — links, context, scratch thoughts kept
// apart from the description. Self-contained: loads its value from the task and
// saves on blur, so the parent detail doesn't need to thread notes through.
export function TaskNotes({ taskId }: { taskId: string }) {
  const [notes, setNotes] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const savedRef = useRef('')

  useEffect(() => {
    let active = true
    fetch(`/api/tasks/${taskId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!active) return
        const n = d?.task?.notes ?? ''
        setNotes(n)
        savedRef.current = n
        setLoaded(true)
      })
      .catch(() => {
        if (active) setLoaded(true)
      })
    return () => {
      active = false
    }
  }, [taskId])

  async function save() {
    if (notes === savedRef.current) return
    setSaving(true)
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes: notes || null }),
    })
    setSaving(false)
    if (res.ok) savedRef.current = notes
    else toast.error('Could not save notes')
  }

  if (!loaded) return null

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-medium tracking-wider text-white/40 uppercase">
        <StickyNote className="h-3.5 w-3.5" />
        Notes
        {saving && <span className="text-white/30 normal-case">saving…</span>}
      </div>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={save}
        rows={4}
        placeholder="Jot down notes, links, or context… (saved when you click away)"
        className="w-full resize-y rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-violet-400/40 focus:outline-none"
      />
    </div>
  )
}
