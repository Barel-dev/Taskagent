'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Check, Tag as TagIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { tagChipClass, TAG_COLORS } from '@/lib/tag-colors'
import type { TagUI } from '@/components/tag-chip'

const SWATCH: Record<string, string> = {
  violet: 'bg-violet-400',
  sky: 'bg-sky-400',
  amber: 'bg-amber-400',
  emerald: 'bg-emerald-400',
  rose: 'bg-rose-400',
  slate: 'bg-slate-400',
}

// Rename or delete the user's tags. Changes hit /api/tags/[id] and then
// router.refresh() so chips/filters everywhere update.
export function ManageTagsDialog({
  tags,
  open,
  onOpenChange,
}: {
  tags: TagUI[]
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const router = useRouter()
  const [names, setNames] = useState<Record<string, string>>({})
  const [busyId, setBusyId] = useState<string | null>(null)

  // Keep the editable names in sync with the latest tags from the server.
  useEffect(() => {
    setNames(Object.fromEntries(tags.map((t) => [t.id, t.name])))
  }, [tags])

  async function rename(t: TagUI) {
    const name = (names[t.id] ?? '').trim()
    if (!name || name === t.name || busyId) return
    setBusyId(t.id)
    try {
      const res = await fetch(`/api/tags/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? 'Could not rename tag')
        return
      }
      toast.success('Tag renamed')
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function setColor(t: TagUI, color: string) {
    if (busyId || color === t.color) return
    setBusyId(t.id)
    try {
      const res = await fetch(`/api/tags/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ color }),
      })
      if (!res.ok) {
        toast.error('Could not recolor tag')
        return
      }
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function remove(t: TagUI) {
    if (busyId) return
    if (!confirm(`Delete tag “${t.name}”? It will be removed from all tasks.`)) return
    setBusyId(t.id)
    try {
      const res = await fetch(`/api/tags/${t.id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Could not delete tag')
        return
      }
      toast.success('Tag deleted')
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-[#0b0e1a]/95 backdrop-blur-xl">
        <DialogTitle className="flex items-center gap-2 text-white">
          <TagIcon className="h-4 w-4 text-violet-300" />
          Manage tags
        </DialogTitle>

        {tags.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/50">No tags yet.</p>
        ) : (
          <div className="space-y-2">
            {tags.map((t) => {
              const value = names[t.id] ?? ''
              const changed = value.trim() !== '' && value.trim() !== t.name
              return (
                <div key={t.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full border ${tagChipClass(t.color)}`}
                    />
                    <Input
                      value={value}
                      onChange={(e) => setNames((n) => ({ ...n, [t.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          rename(t)
                        }
                      }}
                      maxLength={40}
                      disabled={busyId === t.id}
                      className="h-9 border-white/10 bg-white/5 text-sm text-white"
                    />
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => rename(t)}
                      disabled={!changed || busyId === t.id}
                      title="Rename"
                      className="text-white/60 hover:text-white"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => remove(t)}
                      disabled={busyId === t.id}
                      title="Delete"
                      className="text-white/50 hover:text-rose-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-1.5 pl-[18px]">
                    {TAG_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(t, c)}
                        disabled={busyId === t.id}
                        aria-label={`Color ${c}`}
                        title={c}
                        className={`h-4 w-4 rounded-full ${SWATCH[c]} transition-transform hover:scale-110 ${
                          t.color === c
                            ? 'ring-2 ring-white/70 ring-offset-1 ring-offset-[#0b0e1a]'
                            : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
