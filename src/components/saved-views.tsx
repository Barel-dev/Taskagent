'use client'

import { useEffect, useState } from 'react'
import { Bookmark, Plus, X } from 'lucide-react'
import type { PriorityFilter, SortKey, DueFilter } from '@/lib/task-filter'

export type ViewState = {
  query: string
  priority: PriorityFilter
  due: DueFilter
  tagId: string
  sort: SortKey
}
type SavedView = ViewState & { id: string; name: string }

const KEY = 'taskagent:views'

// Saved filter/sort combos, persisted in localStorage and shown as one-click
// chips. Self-contained — the parent passes the current filter state and an
// apply callback.
export function SavedViews({
  current,
  filtering,
  onApply,
}: {
  current: ViewState
  filtering: boolean
  onApply: (v: ViewState) => void
}) {
  const [views, setViews] = useState<SavedView[]>([])
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setViews(JSON.parse(raw))
    } catch {
      /* ignore corrupt storage */
    }
  }, [])

  function persist(next: SavedView[]) {
    setViews(next)
    localStorage.setItem(KEY, JSON.stringify(next))
  }
  function save() {
    const n = name.trim()
    setSaving(false)
    setName('')
    if (!n) return
    persist([...views, { id: `${Date.now()}`, name: n, ...current }])
  }
  function isActive(v: SavedView) {
    return (
      v.query === current.query &&
      v.priority === current.priority &&
      v.due === current.due &&
      v.tagId === current.tagId &&
      v.sort === current.sort
    )
  }

  if (views.length === 0 && !filtering) return null

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Bookmark className="h-3.5 w-3.5 text-white/35" />
      {views.map((v) => (
        <span
          key={v.id}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs ${
            isActive(v)
              ? 'border-violet-400/50 bg-violet-500/15 text-white'
              : 'border-white/10 bg-white/[0.04] text-white/65 hover:bg-white/10'
          }`}
        >
          <button type="button" onClick={() => onApply(v)}>
            {v.name}
          </button>
          <button
            type="button"
            onClick={() => persist(views.filter((x) => x.id !== v.id))}
            aria-label={`Delete view ${v.name}`}
            className="text-white/30 hover:text-rose-300"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      {filtering &&
        (saving ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                save()
              } else if (e.key === 'Escape') {
                setSaving(false)
                setName('')
              }
            }}
            onBlur={save}
            placeholder="View name…"
            className="h-7 rounded-full border border-white/10 bg-white/5 px-2.5 text-xs text-white placeholder:text-white/35 focus:border-violet-400/40 focus:outline-none"
          />
        ) : (
          <button
            type="button"
            onClick={() => setSaving(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-white/15 px-2.5 py-1 text-xs text-white/50 hover:text-white/80"
          >
            <Plus className="h-3 w-3" />
            Save view
          </button>
        ))}
    </div>
  )
}
