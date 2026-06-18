'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Archive, RotateCcw, Trash2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

type Item = {
  id: string
  title: string
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  archivedAt: string | null
  childCount: number
}

const DOT: Record<Item['priority'], string> = {
  LOW: 'bg-slate-400',
  MEDIUM: 'bg-sky-400',
  HIGH: 'bg-amber-400',
  URGENT: 'bg-rose-500',
}

export function ArchiveList({ items }: { items: Item[] }) {
  const [list, setList] = useState(items)

  async function unarchive(id: string) {
    const prev = list
    setList((l) => l.filter((i) => i.id !== id))
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ archivedAt: null }),
    })
    if (!res.ok) {
      setList(prev)
      toast.error('Could not restore the task')
    } else {
      toast.success('Task restored')
    }
  }

  async function remove(id: string) {
    if (!confirm('Permanently delete this task and its steps?')) return
    const prev = list
    setList((l) => l.filter((i) => i.id !== id))
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      setList(prev)
      toast.error('Could not delete the task')
    } else {
      toast.success('Deleted')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-6">
        <p className="text-[11px] font-medium tracking-[0.25em] text-violet-300/70 uppercase">
          Archive
        </p>
        <h2 className="mt-1.5 flex items-center gap-2 text-3xl font-semibold tracking-tight text-white">
          <Archive className="h-6 w-6 text-violet-300" />
          Archived tasks
        </h2>
        <p className="mt-1.5 text-sm text-white/50">
          Hidden from your lists but kept here. Restore one to bring it back, or delete it for good.
        </p>
        <Link
          href="/tasks"
          className="mt-3 inline-flex items-center gap-1.5 text-sm text-white/55 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to tasks
        </Link>
      </header>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <Archive className="mx-auto h-6 w-6 text-violet-300/60" />
          <p className="mt-3 text-sm text-white/60">Nothing archived.</p>
          <p className="mt-1 text-xs text-white/40">
            Archive a task from its detail view to tuck it away here.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {list.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-4 py-3 backdrop-blur-sm"
            >
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[t.priority]}`} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm text-white/85">{t.title}</div>
                <div className="mt-0.5 text-[11px] text-white/40">
                  {t.childCount > 0
                    ? `${t.childCount} step${t.childCount === 1 ? '' : 's'} · `
                    : ''}
                  archived {t.archivedAt ? new Date(t.archivedAt).toLocaleDateString() : ''}
                </div>
              </div>
              <button
                type="button"
                onClick={() => unarchive(t.id)}
                title="Restore to your tasks"
                className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2.5 py-1.5 text-xs text-white/75 hover:bg-white/5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Restore
              </button>
              <button
                type="button"
                onClick={() => remove(t.id)}
                title="Delete permanently"
                className="text-white/40 hover:text-rose-300"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
