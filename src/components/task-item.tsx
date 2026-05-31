'use client'

import { useState, useTransition } from 'react'
import { Sparkles } from 'lucide-react'
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
  estimatedMinutes?: number | null
  children?: Task[]
}

export function TaskItem({
  task,
  onEdit,
  isSubtask = false,
}: {
  task: Task
  onEdit: (t: Task) => void
  isSubtask?: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [optimisticDone, setOptimisticDone] = useState(task.status === 'DONE')
  const [children, setChildren] = useState<Task[]>(task.children ?? [])
  const [breakingDown, setBreakingDown] = useState(false)

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
    if (!confirm(isSubtask ? 'Delete this subtask?' : 'Delete this task?')) return
    start(async () => {
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast.error('Failed to delete')
        return
      }
      toast.success('Deleted')
      router.refresh()
    })
  }

  async function breakDown() {
    setBreakingDown(true)
    try {
      const res = await fetch('/api/agents/breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? 'Breakdown failed')
        return
      }
      const newSubtasks: Task[] = data?.subtasks ?? []
      setChildren((prev) => [...prev, ...newSubtasks])
      toast.success(
        `Added ${newSubtasks.length} subtask${newSubtasks.length === 1 ? '' : 's'}`,
        data?.demo
          ? { description: 'Demo mode — add a Gemini API key for real AI breakdowns.' }
          : undefined,
      )
    } catch {
      toast.error('Breakdown failed')
    } finally {
      setBreakingDown(false)
    }
  }

  return (
    <div>
      <Card className={`flex items-start gap-3 ${isSubtask ? 'p-3' : 'p-4'}`}>
        <input
          type="checkbox"
          checked={optimisticDone}
          onChange={toggleDone}
          disabled={pending}
          className="mt-1 h-4 w-4"
        />
        <div className="flex-1">
          <div
            className={
              optimisticDone
                ? 'text-muted-foreground line-through'
                : isSubtask
                  ? 'text-sm font-medium'
                  : 'font-medium'
            }
          >
            {task.title}
          </div>
          {task.description && (
            <p className="text-muted-foreground mt-1 text-sm">{task.description}</p>
          )}
          <div className="text-muted-foreground mt-2 flex gap-2 text-xs">
            <span>{task.priority}</span>
            {task.estimatedMinutes != null && <span>· ~{task.estimatedMinutes} min</span>}
            {task.dueDate && <span>· due {new Date(task.dueDate).toLocaleDateString()}</span>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {!isSubtask && (
            <Button
              size="sm"
              variant="outline"
              onClick={breakDown}
              disabled={pending || breakingDown}
              title="Break this task into subtasks with AI"
            >
              <Sparkles className={`mr-1 h-3.5 w-3.5 ${breakingDown ? 'animate-spin' : ''}`} />
              {breakingDown ? 'Breaking down…' : 'Break down'}
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => onEdit(task)} disabled={pending}>
            Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={remove} disabled={pending}>
            Delete
          </Button>
        </div>
      </Card>

      {children.length > 0 && (
        <div className="mt-2 ml-5 space-y-2 border-l border-white/10 pl-4">
          {children.map((child) => (
            <TaskItem key={child.id} task={child} onEdit={onEdit} isSubtask />
          ))}
        </div>
      )}
    </div>
  )
}
