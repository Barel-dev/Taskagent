'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Plus,
  Sun,
  ArrowDownUp,
  LayoutGrid,
  Columns3,
  Search,
  Settings2,
  Download,
  CheckCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { TaskTile } from '@/components/task-tile'
import { TaskBoard } from '@/components/task-board'
import { ChatSidebar } from '@/components/chat-sidebar'
import { ManageTagsDialog } from '@/components/manage-tags-dialog'
import { TaskDetail } from '@/components/task-detail'
import { TaskForm } from '@/components/task-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  filterTasks,
  sortTasks,
  type PriorityFilter,
  type SortKey,
  type DueFilter,
} from '@/lib/task-filter'

export type TaskNodeUI = {
  id: string
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: string | Date | null
  scheduledStart?: string | Date | null
  scheduledEnd?: string | Date | null
  estimatedMinutes?: number | null
  result?: string | null
  resultData?: { sources?: RichSourceUI[] } | null
  summary?: string | null
  tags?: { id: string; name: string; color: string }[]
  children?: TaskNodeUI[]
}

export type RichSourceUI = {
  uri: string
  title: string
  image?: string
  description?: string
  siteName?: string
}

// Quote a CSV cell when it contains a comma, quote, or newline.
function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
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

  // Local copy of the tasks so the board can update optimistically on drag.
  // Re-syncs whenever the server re-renders with fresh data (after refresh()).
  const [tasks, setTasks] = useState<TaskNodeUI[]>(initialTasks)
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  // View toggle (list grid vs kanban board), remembered across visits.
  const [view, setView] = useState<'list' | 'board'>('list')
  useEffect(() => {
    const saved = localStorage.getItem('taskagent:view')
    if (saved === 'board' || saved === 'list') setView(saved)
  }, [])
  useEffect(() => {
    localStorage.setItem('taskagent:view', view)
  }, [view])

  // Keyboard shortcuts: "n" opens a new task, "/" focuses search (or the goal
  // bar). Ignored while typing in a field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const el = e.target as HTMLElement | null
      const tag = el?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el?.isContentEditable) return
      if (e.key === 'n') {
        e.preventDefault()
        setCreating(true)
      } else if (e.key === '/') {
        e.preventDefault()
        const target = (document.getElementById('task-search') ??
          document.getElementById('goal-input')) as HTMLInputElement | null
        target?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Search + priority filter, applied to both views.
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState<PriorityFilter>('ALL')
  const [tagFilter, setTagFilter] = useState<string>('ALL')
  const [manageTagsOpen, setManageTagsOpen] = useState(false)
  // Unique tags across the user's tasks, for the filter dropdown.
  const allTags = Array.from(
    new Map(tasks.flatMap((t) => t.tags ?? []).map((tag) => [tag.id, tag])).values(),
  ).sort((a, b) => a.name.localeCompare(b.name))
  const [sort, setSort] = useState<SortKey>('default')
  const [dueFilter, setDueFilter] = useState<DueFilter>('ALL')
  const visible = sortTasks(
    filterTasks(tasks, { query, priority, tagId: tagFilter, due: dueFilter }),
    sort,
  )
  const filtering =
    query.trim() !== '' || priority !== 'ALL' || tagFilter !== 'ALL' || dueFilter !== 'ALL'
  const overdueCount = filterTasks(tasks, { due: 'overdue' }).length
  const todayCount = filterTasks(tasks, { due: 'today' }).length
  const doneCount = tasks.filter((t) => t.status === 'DONE').length

  function exportCsv() {
    const header = ['Title', 'Status', 'Priority', 'Due', 'Scheduled', 'Tags', 'Subtasks']
    const rows = tasks.map((t) => [
      t.title,
      t.status,
      t.priority,
      t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : '',
      t.scheduledStart ? new Date(t.scheduledStart).toISOString() : '',
      (t.tags ?? []).map((x) => x.name).join('; '),
      String(t.children?.length ?? 0),
    ])
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `taskagent-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function clearCompleted() {
    const done = tasks.filter((t) => t.status === 'DONE')
    if (done.length === 0) return
    if (
      !confirm(
        `Delete ${done.length} completed task${done.length === 1 ? '' : 's'}? This can't be undone.`,
      )
    ) {
      return
    }
    const results = await Promise.all(
      done.map((t) => fetch(`/api/tasks/${t.id}`, { method: 'DELETE' })),
    )
    if (results.some((r) => !r.ok)) toast.error('Some tasks could not be deleted')
    else toast.success(`Cleared ${done.length} completed`)
    router.refresh()
  }

  async function moveTask(taskId: string, status: TaskNodeUI['status']) {
    const prev = tasks
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, status } : t)))
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        completedAt: status === 'DONE' ? new Date().toISOString() : null,
      }),
    })
    if (!res.ok) {
      setTasks(prev) // roll back
      toast.error('Failed to move task')
      return
    }
    router.refresh()
  }

  async function changePriority(taskId: string, priority: TaskNodeUI['priority']) {
    const prev = tasks
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, priority } : t)))
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ priority }),
    })
    if (!res.ok) {
      setTasks(prev)
      toast.error('Failed to update priority')
      return
    }
    router.refresh()
  }

  async function addTask(status: TaskNodeUI['status'], title: string) {
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, status }),
    })
    if (!res.ok) {
      toast.error('Could not add task')
      return
    }
    router.refresh()
  }

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
        <p className="text-[11px] font-medium tracking-[0.25em] text-violet-300/70 uppercase">
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
            id="goal-input"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Describe a goal — e.g. “plan a weekend trip to Lisbon”"
            disabled={planning}
            aria-label="Describe a goal for the agent"
            className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
          />
          <Button
            type="submit"
            size="sm"
            disabled={planning || !goal.trim()}
            className="btn-accent"
          >
            <Sparkles className={`mr-1 h-3.5 w-3.5 ${planning ? 'animate-spin' : ''}`} />
            {planning ? 'Planning…' : 'Plan with AI'}
          </Button>
        </div>
      </form>

      {tasks.length > 0 && (
        <div
          className="tl-rise flex flex-wrap items-center gap-2"
          style={{ animationDelay: '100ms' }}
        >
          <div className="relative min-w-[180px] flex-1">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
            <Input
              id="task-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks…"
              aria-label="Search tasks"
              className="h-9 border-white/10 bg-white/5 pl-9 text-sm text-white placeholder:text-white/35"
            />
          </div>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as PriorityFilter)}
            aria-label="Filter by priority"
            className="h-9 rounded-md border border-white/10 bg-white/5 px-2.5 text-sm text-white/75 focus:border-violet-400/40 focus:outline-none"
          >
            <option value="ALL">All priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          <select
            value={dueFilter}
            onChange={(e) => setDueFilter(e.target.value as DueFilter)}
            aria-label="Filter by due date"
            className="h-9 rounded-md border border-white/10 bg-white/5 px-2.5 text-sm text-white/75 focus:border-violet-400/40 focus:outline-none"
          >
            <option value="ALL">Any time</option>
            <option value="overdue">Overdue</option>
            <option value="today">Due today</option>
            <option value="week">Due this week</option>
          </select>
          {allTags.length > 0 && (
            <>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                aria-label="Filter by tag"
                className="h-9 rounded-md border border-white/10 bg-white/5 px-2.5 text-sm text-white/75 focus:border-violet-400/40 focus:outline-none"
              >
                <option value="ALL">All tags</option>
                {allTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
              <Button
                size="icon-sm"
                variant="outline"
                onClick={() => setManageTagsOpen(true)}
                title="Manage tags"
                aria-label="Manage tags"
                className="h-9 w-9 border-white/15 text-white/70 hover:bg-white/5"
              >
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            aria-label="Sort tasks"
            className="h-9 rounded-md border border-white/10 bg-white/5 px-2.5 text-sm text-white/75 focus:border-violet-400/40 focus:outline-none"
          >
            <option value="default">Sort: Smart</option>
            <option value="due">Sort: Due date</option>
            <option value="priority">Sort: Priority</option>
            <option value="title">Sort: Title</option>
          </select>
          <div className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
            <button
              type="button"
              onClick={() => setView('list')}
              aria-pressed={view === 'list'}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors ${
                view === 'list' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              List
            </button>
            <button
              type="button"
              onClick={() => setView('board')}
              aria-pressed={view === 'board'}
              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors ${
                view === 'board' ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white/80'
              }`}
            >
              <Columns3 className="h-3.5 w-3.5" />
              Board
            </button>
          </div>
        </div>
      )}

      <div
        className="tl-rise flex items-center justify-between"
        style={{ animationDelay: '120ms' }}
      >
        <span className="text-xs text-white/40">
          {filtering ? `${visible.length} of ${tasks.length}` : tasks.length}{' '}
          {tasks.length === 1 && !filtering ? 'task' : 'tasks'}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {tasks.length > 0 && (
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
                <ArrowDownUp
                  className={`mr-1 h-3.5 w-3.5 ${prioritizing ? 'animate-pulse' : ''}`}
                />
                {prioritizing ? 'Prioritizing…' : 'Prioritize'}
              </Button>
              {doneCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={clearCompleted}
                  className="border-white/15 text-white/75 hover:bg-white/5"
                  title="Delete all completed tasks"
                >
                  <CheckCheck className="mr-1 h-3.5 w-3.5" />
                  Clear done
                </Button>
              )}
              <Button
                size="icon-sm"
                variant="outline"
                onClick={exportCsv}
                title="Export tasks as CSV"
                aria-label="Export tasks as CSV"
                className="h-8 w-8 border-white/15 text-white/70 hover:bg-white/5"
              >
                <Download className="h-3.5 w-3.5" />
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

      {(overdueCount > 0 || todayCount > 0) && (
        <div className="tl-rise flex flex-wrap gap-2">
          {overdueCount > 0 && (
            <button
              type="button"
              onClick={() => setDueFilter((d) => (d === 'overdue' ? 'ALL' : 'overdue'))}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                dueFilter === 'overdue'
                  ? 'border-rose-400/50 bg-rose-500/20 text-rose-100'
                  : 'border-rose-400/25 bg-rose-500/10 text-rose-200 hover:bg-rose-500/20'
              }`}
            >
              {overdueCount} overdue
            </button>
          )}
          {todayCount > 0 && (
            <button
              type="button"
              onClick={() => setDueFilter((d) => (d === 'today' ? 'ALL' : 'today'))}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                dueFilter === 'today'
                  ? 'border-amber-400/50 bg-amber-500/20 text-amber-100'
                  : 'border-amber-400/25 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20'
              }`}
            >
              {todayCount} due today
            </button>
          )}
        </div>
      )}

      {tasks.length === 0 && (
        <div className="tl-rise rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <Sparkles className="mx-auto h-6 w-6 text-violet-300/60" />
          <p className="mt-3 text-sm text-white/60">No tasks yet.</p>
          <p className="mt-1 text-xs text-white/40">
            Describe a goal above and let the agent build one for you.
          </p>
        </div>
      )}

      {tasks.length > 0 && visible.length === 0 && (
        <div className="tl-rise rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
          <Search className="mx-auto h-6 w-6 text-white/40" />
          <p className="mt-3 text-sm text-white/60">No tasks match your filters.</p>
        </div>
      )}

      {visible.length > 0 &&
        (view === 'board' ? (
          <div className="tl-rise" style={{ animationDelay: '150ms' }}>
            <TaskBoard tasks={visible} onOpen={setSelected} onMove={moveTask} onAddTask={addTask} />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((t, i) => (
              <div key={t.id} className="tl-rise" style={{ animationDelay: `${160 + i * 45}ms` }}>
                <TaskTile
                  task={t}
                  onOpen={() => setSelected(t)}
                  onStatusChange={(s) => moveTask(t.id, s)}
                  onPriorityChange={(p) => changePriority(t.id, p)}
                />
              </div>
            ))}
          </div>
        ))}

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
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/80">{briefing}</p>
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

      <ManageTagsDialog tags={allTags} open={manageTagsOpen} onOpenChange={setManageTagsOpen} />
      <ChatSidebar />
    </div>
  )
}
