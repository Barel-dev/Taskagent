'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { TaskItem } from '@/components/task-item'
import { TaskForm } from '@/components/task-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Task = Parameters<typeof TaskItem>[0]['task']

export function TaskList({ initialTasks }: { initialTasks: Task[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<Task | null>(null)
  const [creating, setCreating] = useState(false)
  const [goal, setGoal] = useState('')
  const [planning, setPlanning] = useState(false)

  async function planWithAi(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = goal.trim()
    if (!trimmed || planning) return
    setPlanning(true)
    try {
      const res = await fetch('/api/agents/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: trimmed }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? 'Planning failed')
        return
      }
      setGoal('')
      toast.success(
        'The agent created your task',
        data?.demo
          ? { description: 'Demo mode — add a Gemini API key for real AI.' }
          : undefined,
      )
      router.refresh()
    } catch {
      toast.error('Planning failed')
    } finally {
      setPlanning(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Tasks</h2>
        <Button variant="outline" onClick={() => setCreating(true)}>
          New task
        </Button>
      </div>

      {/* Let the agent create a whole task from a plain-language goal. */}
      <form onSubmit={planWithAi} className="flex gap-2">
        <Input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="Describe a goal — e.g. “search for the best laptop deals”"
          disabled={planning}
          aria-label="Describe a goal for the agent"
        />
        <Button type="submit" disabled={planning || !goal.trim()}>
          <Sparkles className={`mr-1 h-4 w-4 ${planning ? 'animate-spin' : ''}`} />
          {planning ? 'Planning…' : 'Plan with AI'}
        </Button>
      </form>

      {initialTasks.length === 0 && (
        <p className="text-muted-foreground">
          No tasks yet. Describe a goal above and let the agent build one — or add one manually.
        </p>
      )}

      <div className="space-y-2">
        {initialTasks.map((t) => (
          <TaskItem key={t.id} task={t} onEdit={setEditing} />
        ))}
      </div>

      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New task</DialogTitle>
          </DialogHeader>
          <TaskForm onDone={() => setCreating(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit task</DialogTitle>
          </DialogHeader>
          {editing && <TaskForm task={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
