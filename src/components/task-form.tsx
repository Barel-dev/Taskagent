'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { tagChipClass } from '@/lib/tag-colors'

type Tag = { id: string; name: string; color: string }

type Recurrence = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'

type Task = {
  id: string
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: string | Date | null
  recurrence?: Recurrence
  tags?: Tag[]
}

export function TaskForm({ task, onDone }: { task?: Task; onDone: () => void }) {
  const router = useRouter()
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [priority, setPriority] = useState<Task['priority']>(task?.priority ?? 'MEDIUM')
  const [dueDate, setDueDate] = useState(
    task?.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
  )
  const [recurrence, setRecurrence] = useState<Recurrence>(task?.recurrence ?? 'NONE')
  const [saving, setSaving] = useState(false)

  // Tags: the user's full tag list, plus which ids are selected for this task.
  const [allTags, setAllTags] = useState<Tag[]>(task?.tags ?? [])
  const [selectedIds, setSelectedIds] = useState<string[]>((task?.tags ?? []).map((t) => t.id))
  const [newTag, setNewTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)

  // For a brand-new task, honor the default priority set in Settings.
  useEffect(() => {
    if (task) return
    const p = localStorage.getItem('taskagent:defaultPriority')
    if (p === 'LOW' || p === 'MEDIUM' || p === 'HIGH' || p === 'URGENT') setPriority(p)
  }, [task])

  useEffect(() => {
    fetch('/api/tags')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.tags) {
          // Merge fetched tags with any already on the task (keeps order stable).
          setAllTags((prev) => {
            const map = new Map<string, Tag>(prev.map((t) => [t.id, t]))
            for (const t of data.tags as Tag[]) map.set(t.id, t)
            return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name))
          })
        }
      })
      .catch(() => {})
  }, [])

  function toggleTag(id: string) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }

  async function addTag() {
    const name = newTag.trim()
    if (!name || addingTag) return
    setAddingTag(true)
    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? 'Could not add tag')
        return
      }
      const tag = data.tag as Tag
      setAllTags((prev) => (prev.some((t) => t.id === tag.id) ? prev : [...prev, tag]))
      setSelectedIds((ids) => (ids.includes(tag.id) ? ids : [...ids, tag.id]))
      setNewTag('')
    } finally {
      setAddingTag(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const body = {
        title,
        description: description || null,
        priority,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        recurrence,
        tagIds: selectedIds,
      }
      const url = task ? `/api/tasks/${task.id}` : '/api/tasks'
      const method = task ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Save failed')
        return
      }
      toast.success(task ? 'Task updated' : 'Task created')
      onDone()
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description ?? ''}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="priority">Priority</Label>
          <select
            id="priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Task['priority'])}
            className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="URGENT">Urgent</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="dueDate">Due date</Label>
          <Input
            id="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="recurrence">Repeat</Label>
        <select
          id="recurrence"
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as Recurrence)}
          className="border-input bg-background w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="NONE">Does not repeat</option>
          <option value="DAILY">Daily</option>
          <option value="WEEKLY">Weekly</option>
          <option value="MONTHLY">Monthly</option>
          <option value="YEARLY">Yearly</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label>Tags</Label>
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {allTags.map((t) => {
              const on = selectedIds.includes(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  aria-pressed={on}
                  className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity ${
                    on
                      ? tagChipClass(t.color)
                      : 'border-border text-muted-foreground opacity-60 hover:opacity-100'
                  }`}
                >
                  {t.name}
                </button>
              )
            })}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addTag()
              }
            }}
            placeholder="New tag…"
            maxLength={40}
            className="h-9"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTag}
            disabled={addingTag || !newTag.trim()}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onDone} disabled={saving}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || !title.trim()}>
          {saving ? 'Saving…' : task ? 'Save' : 'Create'}
        </Button>
      </div>
    </form>
  )
}
