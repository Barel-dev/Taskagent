'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

type Task = {
  id: string
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: string | Date | null
}

export function TaskItem({ task, onEdit }: { task: Task; onEdit: (t: Task) => void }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [optimisticDone, setOptimisticDone] = useState(task.status === 'DONE')

  async function toggleDone() {
    const next = optimisticDone ? 'TODO' : 'DONE'
    setOptimisticDone(!optimisticDone)
    start(async () => {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: next,
          completedAt: next === 'DONE' ? new Date().toISOString() : null,
        }),
      })
      if (!res.ok) {
        setOptimisticDone(optimisticDone) // rollback
        toast.error('Failed to update')
        return
      }
      router.refresh()
    })
  }

  async function remove() {
    if (!confirm('Delete this task?')) return
    start(async () => {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Failed to delete')
        return
      }
      toast.success('Task deleted')
      router.refresh()
    })
  }

  return (
    <Card className="flex items-start gap-3 p-4">
      <input
        type="checkbox"
        checked={optimisticDone}
        onChange={toggleDone}
        disabled={pending}
        className="mt-1 h-4 w-4"
      />
      <div className="flex-1">
        <div className={optimisticDone ? 'text-muted-foreground line-through' : 'font-medium'}>
          {task.title}
        </div>
        {task.description && (
          <p className="text-muted-foreground mt-1 text-sm">{task.description}</p>
        )}
        <div className="text-muted-foreground mt-2 flex gap-2 text-xs">
          <span>{task.priority}</span>
          {task.dueDate && <span>· due {new Date(task.dueDate).toLocaleDateString()}</span>}
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => onEdit(task)} disabled={pending}>
          Edit
        </Button>
        <Button size="sm" variant="destructive" onClick={remove} disabled={pending}>
          Delete
        </Button>
      </div>
    </Card>
  )
}
