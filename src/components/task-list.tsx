'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { TaskItem } from '@/components/task-item'
import { TaskForm } from '@/components/task-form'
import { Button } from '@/components/ui/button'
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
        data?.demo ? { description: 'Demo mode — add a Gemini API key for real AI.' } : undefined,
      )
      router.refresh()
    } catch {
      toast.error('Planning failed')
    } finally {
      setPlanning(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-10">
      {/* Header */}
      <header className="tl-rise">
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-violet-300/70">
          TaskAgent
        </p>
        <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-white">
          Your{' '}
          <span className="bg-gradient-to-r from-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
            tasks
          </span>
        </h2>
        <p className="mt-1.5 text-sm text-white/50">
          Describe a goal and an agent builds it — or hit <span className="text-white/70">Do it</span>{' '}
          to have an agent actually carry a task out.
        </p>
      </header>

      {/* AI command bar */}
      <form onSubmit={planWithAi} className="tl-rise" style={{ animationDelay: '60ms' }}>
        <div className="ai-bar relative flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 backdrop-blur-sm transition-colors focus-within:border-violet-400/40">
          <Sparkles className="ml-2 h-4 w-4 shrink-0 text-violet-300" />
          <input
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Describe a goal — e.g. “plan a weekend trip to Lisbon”"
            disabled={planning}
            aria-label="Describe a goal for the agent"
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
          />
          <Button type="submit" size="sm" disabled={planning || !goal.trim()} className="btn-gradient">
            <Sparkles className={`mr-1 h-3.5 w-3.5 ${planning ? 'animate-spin' : ''}`} />
            {planning ? 'Planning…' : 'Plan with AI'}
          </Button>
        </div>
      </form>

      {/* Toolbar */}
      <div className="flex items-center justify-between tl-rise" style={{ animationDelay: '120ms' }}>
        <span className="text-xs text-white/40">
          {initialTasks.length} {initialTasks.length === 1 ? 'task' : 'tasks'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCreating(true)}
          className="text-white/60 hover:text-white"
        >
          <Plus className="mr-1 h-3.5 w-3.5" />
          New task
        </Button>
      </div>

      {initialTasks.length === 0 && (
        <div className="tl-rise rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-violet-300/60" />
          <p className="mt-3 text-sm text-white/60">No tasks yet.</p>
          <p className="mt-1 text-xs text-white/40">
            Describe a goal above and let the agent build one for you.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {initialTasks.map((t, i) => (
          <div key={t.id} className="tl-rise" style={{ animationDelay: `${160 + i * 50}ms` }}>
            <TaskItem task={t} onEdit={setEditing} />
          </div>
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
