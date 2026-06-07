'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Files, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { loadTemplates, removeTemplate, type TaskTemplate } from '@/lib/templates'

// Browse saved task templates and create a fresh task (with its steps) from one.
export function TemplatesDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [templates, setTemplates] = useState<TaskTemplate[]>([])
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    if (open) setTemplates(loadTemplates())
  }, [open])

  async function use(t: TaskTemplate) {
    if (busyId) return
    setBusyId(t.id)
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: t.title, description: t.description, priority: t.priority }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.task) {
        toast.error('Could not create from template')
        return
      }
      // Create the steps in order under the new task.
      for (const step of t.steps) {
        await fetch('/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: step, parentId: data.task.id }),
        })
      }
      toast.success(`Created “${t.title}”`, {
        description: t.steps.length ? `${t.steps.length} steps` : undefined,
      })
      onOpenChange(false)
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  function remove(t: TaskTemplate) {
    removeTemplate(t.id)
    setTemplates(loadTemplates())
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-white/10 bg-[#0b0e1a]/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Files className="h-4 w-4 text-violet-300" />
            Templates
          </DialogTitle>
        </DialogHeader>

        {templates.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/50">
            No templates yet. Open a task and choose{' '}
            <span className="text-white/70">Save as template</span> to reuse it later.
          </p>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-white/85">{t.name}</div>
                  <div className="mt-0.5 text-xs text-white/45">
                    {t.priority.toLowerCase()}
                    {t.steps.length > 0 && ` · ${t.steps.length} steps`}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => use(t)}
                  disabled={busyId === t.id}
                  className="btn-accent"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {busyId === t.id ? 'Creating…' : 'Use'}
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => remove(t)}
                  title="Delete template"
                  className="text-white/40 hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
