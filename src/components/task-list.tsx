'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Plus, Sun, ArrowDownUp } from 'lucide-react'
import { toast } from 'sonner'
import { TaskTile } from '@/components/task-tile'
import { TaskDetail } from '@/components/task-detail'
import { TaskForm } from '@/components/task-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export type TaskNodeUI = {
  id: string
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: string | Date | null
  estimatedMinutes?: number | null
  result?: string | null
  resultData?: { sources?: RichSourceUI[] } | null
  summary?: string | null
  children?: TaskNodeUI[]
}

export type RichSourceUI = {
  uri: string
  title: string
  image?: string
  description?: string
  siteName?: string
}

export function TaskList({ initialTasks }: { initialTasks: TaskNodeUI[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<TaskNodeUI | null>(null)
  const [editing, setEditing] = useState<TaskNodeUI | null>(null)
  const [creating, setCreating] = useState(false)
  const [goal, setGoal] = useState('')
  const [planning, setPlanning] = useState(false)
  const [prioritizing, setPrioritizing] = useState(false)
  const [briefingLoading, setBriefingLoading] = useState(false)
  const [briefing, setBriefing] = useState<string | null>(null)
  const [briefingOpen, setBriefingOpen] = useState(false)

  async function prioritize() {
    setPrioritizing(true)
    try {
      const res = await fetch('/api/agents/prioritize', { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? 'Could not prioritize')
        return
      }
      toast.success('Reprioritized your day', { description: data?.rationale })
      router.refresh()
    } catch {
      toast.error('Could not prioritize')
    } finally {
      setPrioritizing(false)
    }
  }

  async function dailyBriefing() {
    setBriefingLoading(true)
    try {
      const res = await fetch('/api/agents/briefing', { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? 'Could not build a briefing')
        return
      }
      setBriefing(data?.briefing ?? '')
      setBriefingOpen(true)
    } catch {
      toast.error('Could not build a briefing')
    } finally {
      setBriefingLoading(false)
    }
  }

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
    <div className="mx-auto max-w-5xl space-y-6 px-6 py-10">
      <header className="tl-rise">
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-violet-300/70">
          TaskAgent
        </p>
        <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-white">
          Your <span className="text-violet-300">tasks</span>
        </h2>
        <p className="mt-1.5 text-sm text-white/50">
          Describe a goal and an agent builds it. Open any task to run, summarize, and answer its
          agents.
        </p>
      </header>

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
          <Button type="submit" size="sm" disabled={planning || !goal.trim()} className="btn-accent">
            <Sparkles className={`mr-1 h-3.5 w-3.5 ${planning ? 'animate-spin' : ''}`} />
            {planning ? 'Planning…' : 'Plan with AI'}
          </Button>
        </div>
      </form>

      <div
        className="flex items-center justify-between tl-rise"
        style={{ animationDelay: '120ms' }}
      >
        <span className="text-xs text-white/40">
          {initialTasks.length} {initialTasks.length === 1 ? 'task' : 'tasks'}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {initialTasks.length > 0 && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={dailyBriefing}
                disabled={briefingLoading}
                className="border-white/15 text-white/75 hover:bg-white/5"
              >
                <Sun className={`mr-1 h-3.5 w-3.5 ${briefingLoading ? 'animate-pulse' : ''}`} />
                {briefingLoading ? '…' : 'Daily briefing'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={prioritize}
                disabled={prioritizing}
                className="border-white/15 text-white/75 hover:bg-white/5"
              >
                <ArrowDownUp className={`mr-1 h-3.5 w-3.5 ${prioritizing ? 'animate-pulse' : ''}`} />
                {prioritizing ? 'Prioritizing…' : 'Prioritize'}
              </Button>
            </>
          )}
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
      </div>

      {initialTasks.length === 0 && (
        <div className="tl-rise rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-violet-300/60" />
          <p className="mt-3 text-sm text-white/60">No tasks yet.</p>
          <p className="mt-1 text-xs text-white/40">
            Describe a goal above and let the agent build one for you.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {initialTasks.map((t, i) => (
          <div key={t.id} className="tl-rise" style={{ animationDelay: `${160 + i * 45}ms` }}>
            <TaskTile task={t} onOpen={() => setSelected(t)} />
          </div>
        ))}
      </div>

      {selected && (
        <TaskDetail
          task={selected}
          onClose={() => setSelected(null)}
          onEdit={(t) => {
            setSelected(null)
            setEditing(t)
          }}
        />
      )}

      <Dialog open={briefingOpen} onOpenChange={setBriefingOpen}>
        <DialogContent className="max-w-lg border-white/10 bg-[#0b0e1a]/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sun className="h-4 w-4 text-amber-300" />
              Daily briefing
            </DialogTitle>
          </DialogHeader>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{briefing}</p>
        </DialogContent>
      </Dialog>

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
