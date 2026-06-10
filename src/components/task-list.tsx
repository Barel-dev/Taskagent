'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Plus,
  Sun,
  ArrowDownUp,
  Search,
  Download,
  FileJson,
  FileText,
  Upload,
  CheckCheck,
  Trash2,
  Files,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { TaskTile } from '@/components/task-tile'
import { TaskBoard } from '@/components/task-board'
import { TaskToolbar } from '@/components/task-toolbar'
import { SavedViews } from '@/components/saved-views'
import { ChatSidebar } from '@/components/chat-sidebar'
import { ManageTagsDialog } from '@/components/manage-tags-dialog'
import { CsvImportDialog } from '@/components/csv-import-dialog'
import { TemplatesDialog } from '@/components/templates-dialog'
import { TaskDetail } from '@/components/task-detail'
import { TaskForm } from '@/components/task-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  filterTasks,
  sortTasks,
  type PriorityFilter,
  type SortKey,
  type DueFilter,
} from '@/lib/task-filter'
import { confetti } from '@/lib/confetti'
import { parseQuickAdd } from '@/lib/quick-add'

export type TaskNodeUI = {
  id: string
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  pinned?: boolean
  recurrence?: 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  dueDate: string | Date | null
  completedAt?: string | Date | null
  scheduledStart?: string | Date | null
  scheduledEnd?: string | Date | null
  estimatedMinutes?: number | null
  order?: number
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

export function TaskList({
  initialTasks,
  openTaskId,
  userName,
  initialPriority,
  initialDue,
  openNew,
  openImport,
  openTemplates,
}: {
  initialTasks: TaskNodeUI[]
  openTaskId?: string
  userName?: string
  initialPriority?: PriorityFilter
  initialDue?: DueFilter
  /** Open the new-task form on mount (command-palette deep link). */
  openNew?: boolean
  /** Open the import dialog on mount (command-palette deep link). */
  openImport?: boolean
  /** Open the templates dialog on mount (command-palette deep link). */
  openTemplates?: boolean
}) {
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
  const [showHelp, setShowHelp] = useState(false)

  // Local copy of the tasks so the board can update optimistically on drag.
  // Re-syncs whenever the server re-renders with fresh data (after refresh()).
  const [tasks, setTasks] = useState<TaskNodeUI[]>(initialTasks)
  useEffect(() => {
    setTasks(initialTasks)
  }, [initialTasks])

  // Open a task deep-linked from the command palette (/tasks?task=<id>), once
  // per distinct id so closing it doesn't reopen on the next refresh.
  const lastOpened = useRef<string | null>(null)
  useEffect(() => {
    if (!openTaskId || openTaskId === lastOpened.current) return
    const found = tasks.find((t) => t.id === openTaskId)
    if (found) {
      setSelected(found)
      lastOpened.current = openTaskId
    }
  }, [openTaskId, tasks])

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
        // Prefer the inline quick-add bar; fall back to the full form dialog.
        const quick = document.getElementById('quick-add-input') as HTMLInputElement | null
        if (quick) quick.focus()
        else setCreating(true)
      } else if (e.key === '/') {
        e.preventDefault()
        const target = (document.getElementById('task-search') ??
          document.getElementById('goal-input')) as HTMLInputElement | null
        target?.focus()
      } else if (e.key === 'b') {
        e.preventDefault()
        setView((v) => (v === 'list' ? 'board' : 'list'))
      } else if (e.key === '?') {
        e.preventDefault()
        setShowHelp(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Search + priority filter, applied to both views.
  const [query, setQuery] = useState('')
  const [priority, setPriority] = useState<PriorityFilter>(initialPriority ?? 'ALL')
  const [tagFilter, setTagFilter] = useState<string>('ALL')
  const [manageTagsOpen, setManageTagsOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [templatesOpen, setTemplatesOpen] = useState(false)
  // Open a dialog when deep-linked from the command palette (/tasks?new / ?import).
  useEffect(() => {
    if (openNew) setCreating(true)
    if (openImport) setImportOpen(true)
    if (openTemplates) setTemplatesOpen(true)
  }, [openNew, openImport, openTemplates])
  // Unique tags across the user's tasks, for the filter dropdown.
  const allTags = Array.from(
    new Map(tasks.flatMap((t) => t.tags ?? []).map((tag) => [tag.id, tag])).values(),
  ).sort((a, b) => a.name.localeCompare(b.name))
  const [sort, setSort] = useState<SortKey>('default')
  useEffect(() => {
    const s = localStorage.getItem('taskagent:sort')
    if (s === 'default' || s === 'due' || s === 'priority' || s === 'title' || s === 'manual') {
      setSort(s)
    }
  }, [])
  useEffect(() => {
    localStorage.setItem('taskagent:sort', sort)
  }, [sort])
  const [dueFilter, setDueFilter] = useState<DueFilter>(initialDue ?? 'ALL')
  const [hideDone, setHideDone] = useState(false)
  useEffect(() => {
    setHideDone(localStorage.getItem('taskagent:hideDone') === 'on')
  }, [])
  useEffect(() => {
    localStorage.setItem('taskagent:hideDone', hideDone ? 'on' : 'off')
  }, [hideDone])
  const visible = sortTasks(
    filterTasks(tasks, { query, priority, tagId: tagFilter, due: dueFilter }).filter(
      (t) => !hideDone || t.status !== 'DONE',
    ),
    sort,
  )
  const filtering =
    query.trim() !== '' || priority !== 'ALL' || tagFilter !== 'ALL' || dueFilter !== 'ALL'
  const overdueCount = filterTasks(tasks, { due: 'overdue' }).length
  const todayCount = filterTasks(tasks, { due: 'today' }).length
  const doneCount = tasks.filter((t) => t.status === 'DONE').length
  const donePct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0

  // Greeting computed on the client to avoid SSR/timezone hydration mismatch.
  const [greeting, setGreeting] = useState('TaskAgent')
  useEffect(() => {
    const h = new Date().getHours()
    const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
    const first = userName?.trim().split(' ')[0]
    setGreeting(first ? `${part}, ${first}` : part)
  }, [userName])

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
    download(csv, 'text/csv', 'csv')
  }

  function exportJson() {
    download(JSON.stringify(tasks, null, 2), 'application/json', 'json')
  }

  function exportMarkdown() {
    const lines: string[] = ['# TaskAgent export', '']
    for (const t of tasks) {
      lines.push(`## ${t.title}`)
      const meta = [t.priority.toLowerCase(), t.status.toLowerCase().replace('_', ' ')]
      if (t.dueDate) meta.push(`due ${new Date(t.dueDate).toISOString().slice(0, 10)}`)
      lines.push(`_${meta.join(' · ')}_`)
      if (t.description) lines.push('', t.description)
      if (t.children?.length) {
        lines.push('')
        for (const c of t.children) lines.push(`- [${c.status === 'DONE' ? 'x' : ' '}] ${c.title}`)
      }
      lines.push('')
    }
    download(lines.join('\n'), 'text/markdown', 'md')
  }

  function download(content: string, type: string, ext: string) {
    const url = URL.createObjectURL(new Blob([content], { type }))
    const a = document.createElement('a')
    a.href = url
    a.download = `taskagent-${new Date().toISOString().slice(0, 10)}.${ext}`
    a.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Delete with a grace window: remove the tasks from the list immediately,
   * show an Undo toast, and only call the API after ~5s if the user didn't
   * undo. Undo simply restores the local list — nothing was deleted yet.
   */
  function deleteWithUndo(ids: string[], label: string) {
    const prev = tasks
    const idSet = new Set(ids)
    setTasks((ts) => ts.filter((t) => !idSet.has(t.id)))
    let undone = false
    const timer = setTimeout(async () => {
      if (undone) return
      const res = await Promise.all(
        ids.map((id) => fetch(`/api/tasks/${id}`, { method: 'DELETE' })),
      )
      if (res.some((r) => !r.ok)) toast.error('Some deletes failed')
      router.refresh()
    }, 5200)
    toast(label, {
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          undone = true
          clearTimeout(timer)
          setTasks(prev)
        },
      },
    })
  }

  function clearCompleted() {
    const done = tasks.filter((t) => t.status === 'DONE')
    if (done.length === 0) return
    deleteWithUndo(
      done.map((t) => t.id),
      `Cleared ${done.length} completed`,
    )
  }

  async function moveTask(taskId: string, status: TaskNodeUI['status']) {
    const prev = tasks
    const projected = tasks.map((t) => (t.id === taskId ? { ...t, status } : t))
    setTasks(projected)
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
    // Celebrate finishing the last open task.
    const allDoneNow = projected.length > 0 && projected.every((t) => t.status === 'DONE')
    const wasAllDone = prev.length > 0 && prev.every((t) => t.status === 'DONE')
    if (status === 'DONE' && allDoneNow && !wasAllDone) {
      if (localStorage.getItem('taskagent:confetti') !== 'off') confetti()
      toast.success('All tasks done — nice work! 🎉')
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

  async function changePinned(taskId: string, pinned: boolean) {
    const prev = tasks
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, pinned } : t)))
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pinned }),
    })
    if (!res.ok) {
      setTasks(prev)
      toast.error('Failed to pin')
      return
    }
    router.refresh()
  }

  async function changeDue(taskId: string, dueDate: string | null) {
    const prev = tasks
    setTasks((ts) => ts.map((t) => (t.id === taskId ? { ...t, dueDate } : t)))
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueDate }),
    })
    if (!res.ok) {
      setTasks(prev)
      toast.error('Failed to update due date')
      return
    }
    toast.success(dueDate ? 'Due date set' : 'Due date cleared')
    router.refresh()
  }

  // Manual drag-to-reorder of top-level tasks (only when sort is 'manual' and no
  // filters are narrowing the list, so the visible order is the full order).
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  function reorderTop(fromId: string, toId: string) {
    if (fromId === toId) return
    const arr = [...visible]
    const from = arr.findIndex((t) => t.id === fromId)
    const to = arr.findIndex((t) => t.id === toId)
    if (from < 0 || to < 0) return
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    const ids = arr.map((t) => t.id)
    const orderMap = new Map(ids.map((id, i) => [id, i]))
    setTasks((ts) => ts.map((t) => (orderMap.has(t.id) ? { ...t, order: orderMap.get(t.id) } : t)))
    fetch('/api/tasks/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
      .then((res) => {
        if (!res.ok) {
          toast.error('Could not reorder')
          router.refresh()
        }
      })
      .catch(() => {
        toast.error('Could not reorder')
        router.refresh()
      })
  }

  async function addTask(status: TaskNodeUI['status'], rawTitle: string) {
    // Natural-language quick-add: "Email Dan tomorrow !high" sets due + priority.
    const { title, priority, dueDate } = parseQuickAdd(rawTitle)
    const res = await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, status, priority, dueDate }),
    })
    if (!res.ok) {
      toast.error('Could not add task')
      return
    }
    // Confirm what the parser picked up, so quick-add feels predictable.
    const bits: string[] = []
    if (priority) bits.push(priority.toLowerCase())
    if (dueDate) {
      bits.push(
        `due ${new Date(dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
      )
    }
    toast.success(`Added “${title}”`, bits.length ? { description: bits.join(' · ') } : undefined)
    router.refresh()
  }

  // ── Bulk selection (list view) ──
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  function toggleSelect(id: string) {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]))
  }
  async function bulkPatch(data: Record<string, unknown>) {
    const ids = selectedIds
    const res = await Promise.all(
      ids.map((id) =>
        fetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }),
      ),
    )
    if (res.some((r) => !r.ok)) toast.error('Some updates failed')
    else toast.success(`Updated ${ids.length} task${ids.length === 1 ? '' : 's'}`)
    setSelectedIds([])
    router.refresh()
  }
  function bulkDelete() {
    const ids = selectedIds
    if (!ids.length) return
    setSelectedIds([])
    deleteWithUndo(ids, `Deleted ${ids.length} task${ids.length === 1 ? '' : 's'}`)
  }
  // Add a tag to every selected task, keeping each one's existing tags.
  async function bulkAddTag(tagId: string) {
    const ids = selectedIds
    const res = await Promise.all(
      ids.map((id) => {
        const t = tasks.find((x) => x.id === id)
        const existing = (t?.tags ?? []).map((tg) => tg.id)
        const tagIds = existing.includes(tagId) ? existing : [...existing, tagId]
        return fetch(`/api/tasks/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tagIds }),
        })
      }),
    )
    if (res.some((r) => !r.ok)) toast.error('Some updates failed')
    else toast.success(`Tagged ${ids.length} task${ids.length === 1 ? '' : 's'}`)
    setSelectedIds([])
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

  async function planWithAi(e?: React.FormEvent, preset?: string) {
    e?.preventDefault()
    const trimmed = (preset ?? goal).trim()
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
          {greeting}
        </p>
        <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-white">
          Your <span className="text-violet-300">tasks</span>
        </h2>
        <p className="mt-1.5 text-sm text-white/50">
          Describe a goal and an agent builds it. Open any task to run, summarize, and answer its
          agents.
        </p>
        {tasks.length > 0 && (
          <div className="mt-3 flex items-center gap-3">
            <div className="h-1.5 w-full max-w-[220px] overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400 transition-all"
                style={{ width: `${donePct}%` }}
              />
            </div>
            <span className="text-xs text-white/45 tabular-nums">
              {doneCount}/{tasks.length} done · {donePct}%
            </span>
          </div>
        )}
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
        <TaskToolbar
          query={query}
          setQuery={setQuery}
          priority={priority}
          setPriority={setPriority}
          dueFilter={dueFilter}
          setDueFilter={setDueFilter}
          tagFilter={tagFilter}
          setTagFilter={setTagFilter}
          allTags={allTags}
          onManageTags={() => setManageTagsOpen(true)}
          sort={sort}
          setSort={setSort}
          hideDone={hideDone}
          setHideDone={setHideDone}
          view={view}
          setView={setView}
        />
      )}

      {tasks.length > 0 && (
        <SavedViews
          current={{ query, priority, due: dueFilter, tagId: tagFilter, sort }}
          filtering={filtering}
          onApply={(v) => {
            setQuery(v.query)
            setPriority(v.priority)
            setDueFilter(v.due)
            setTagFilter(v.tagId)
            setSort(v.sort)
          }}
        />
      )}

      <div
        className="tl-rise flex items-center justify-between"
        style={{ animationDelay: '120ms' }}
      >
        <span className="inline-flex items-center gap-2 text-xs text-white/40">
          {filtering ? `${visible.length} of ${tasks.length}` : tasks.length}{' '}
          {tasks.length === 1 && !filtering ? 'task' : 'tasks'}
          {filtering && (
            <button
              type="button"
              onClick={() => {
                setQuery('')
                setPriority('ALL')
                setDueFilter('ALL')
                setTagFilter('ALL')
              }}
              className="inline-flex items-center gap-0.5 rounded text-violet-300/80 hover:text-violet-200"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
          {view === 'list' && visible.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const allSelected = visible.every((t) => selectedIds.includes(t.id))
                setSelectedIds(allSelected ? [] : visible.map((t) => t.id))
              }}
              className="rounded text-white/40 hover:text-white/70"
            >
              {visible.every((t) => selectedIds.includes(t.id)) ? 'Select none' : 'Select all'}
            </button>
          )}
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
              <Button
                size="icon-sm"
                variant="outline"
                onClick={exportJson}
                title="Export tasks as JSON"
                aria-label="Export tasks as JSON"
                className="h-8 w-8 border-white/15 text-white/70 hover:bg-white/5"
              >
                <FileJson className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="outline"
                onClick={exportMarkdown}
                title="Export tasks as Markdown"
                aria-label="Export tasks as Markdown"
                className="h-8 w-8 border-white/15 text-white/70 hover:bg-white/5"
              >
                <FileText className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => setImportOpen(true)}
            title="Import tasks from CSV"
            aria-label="Import tasks from CSV"
            className="h-8 w-8 border-white/15 text-white/70 hover:bg-white/5"
          >
            <Upload className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => setTemplatesOpen(true)}
            title="Task templates"
            aria-label="Task templates"
            className="h-8 w-8 border-white/15 text-white/70 hover:bg-white/5"
          >
            <Files className="h-3.5 w-3.5" />
          </Button>
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
            Add one below, describe a goal above, or try one of these:
          </p>
          <div className="mx-auto mt-4 max-w-md">
            <QuickAddBar onAdd={(title) => addTask('TODO', title)} />
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {[
              'Plan a weekend trip to Lisbon',
              'Launch a personal portfolio site',
              'Organize my move',
            ].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => planWithAi(undefined, s)}
                disabled={planning}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/65 hover:bg-white/10 hover:text-white disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {view === 'list' && tasks.length > 0 && (
        <QuickAddBar onAdd={(title) => addTask('TODO', title)} />
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
            <TaskBoard
              tasks={visible}
              onOpen={setSelected}
              onMove={moveTask}
              onAddTask={addTask}
              onPriorityChange={changePriority}
              onDueChange={changeDue}
              onTagClick={setTagFilter}
              highlight={query}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((t, i) => {
              const manualDnd = sort === 'manual' && !filtering
              return (
                <div
                  key={t.id}
                  className={`tl-rise rounded-2xl ${manualDnd ? 'cursor-grab active:cursor-grabbing' : ''} ${
                    overId === t.id && dragId !== t.id ? 'ring-2 ring-violet-400/50' : ''
                  } ${dragId === t.id ? 'opacity-40' : ''}`}
                  style={{ animationDelay: `${160 + i * 45}ms` }}
                  draggable={manualDnd}
                  onDragStart={
                    manualDnd
                      ? (e) => {
                          setDragId(t.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }
                      : undefined
                  }
                  onDragOver={
                    manualDnd
                      ? (e) => {
                          e.preventDefault()
                          if (dragId && dragId !== t.id) setOverId(t.id)
                        }
                      : undefined
                  }
                  onDrop={
                    manualDnd
                      ? (e) => {
                          e.preventDefault()
                          if (dragId) reorderTop(dragId, t.id)
                          setDragId(null)
                          setOverId(null)
                        }
                      : undefined
                  }
                  onDragEnd={
                    manualDnd
                      ? () => {
                          setDragId(null)
                          setOverId(null)
                        }
                      : undefined
                  }
                >
                  <TaskTile
                    task={t}
                    onOpen={() => setSelected(t)}
                    onStatusChange={(s) => moveTask(t.id, s)}
                    onPriorityChange={(p) => changePriority(t.id, p)}
                    onPin={(p) => changePinned(t.id, p)}
                    onDueChange={(d) => changeDue(t.id, d)}
                    onTagClick={setTagFilter}
                    highlight={query}
                    selected={selectedIds.includes(t.id)}
                    onToggleSelect={() => toggleSelect(t.id)}
                  />
                </div>
              )
            })}
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

      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-sm border-white/10 bg-[#0b0e1a]/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-white">Keyboard shortcuts</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            {(
              [
                ['⌘K / Ctrl+K', 'Command palette'],
                ['N', 'New task'],
                ['/', 'Search'],
                ['B', 'Toggle list / board'],
                ['G then T', 'Go to Tasks'],
                ['G then C', 'Go to Calendar'],
                ['G then D', 'Go to Dashboard'],
                ['G then S', 'Go to Settings'],
                ['?', 'This help'],
              ] as const
            ).map(([k, d]) => (
              <div key={k} className="flex items-center justify-between">
                <span className="text-white/70">{d}</span>
                <kbd className="rounded bg-white/10 px-2 py-0.5 text-xs text-white/60">{k}</kbd>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {selectedIds.length > 0 && (
        <div className="fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-2xl border border-white/10 bg-[#0b0e1a]/95 px-3 py-2 shadow-2xl backdrop-blur-xl">
          <span className="px-1 text-sm text-white/70">{selectedIds.length} selected</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkPatch({ status: 'DONE', completedAt: new Date().toISOString() })}
            className="border-white/15 text-white/75 hover:bg-white/5"
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            Mark done
          </Button>
          <select
            defaultValue=""
            onChange={(e) => {
              const s = e.target.value
              if (s) {
                bulkPatch({
                  status: s,
                  completedAt: s === 'DONE' ? new Date().toISOString() : null,
                })
                e.target.value = ''
              }
            }}
            aria-label="Set status for selected"
            className="h-8 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white/75 focus:outline-none"
          >
            <option value="" disabled>
              Status…
            </option>
            <option value="TODO">To do</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="DONE">Done</option>
          </select>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) {
                bulkPatch({ priority: e.target.value })
                e.target.value = ''
              }
            }}
            aria-label="Set priority for selected"
            className="h-8 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white/75 focus:outline-none"
          >
            <option value="" disabled>
              Priority…
            </option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>
          {allTags.length > 0 && (
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  bulkAddTag(e.target.value)
                  e.target.value = ''
                }
              }}
              aria-label="Add tag to selected"
              className="h-8 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white/75 focus:outline-none"
            >
              <option value="" disabled>
                Add tag…
              </option>
              {allTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="date"
            onChange={(e) => {
              if (e.target.value) {
                bulkPatch({ dueDate: new Date(e.target.value).toISOString() })
                e.target.value = ''
              }
            }}
            aria-label="Set due date for selected"
            title="Set due date for selected"
            className="h-8 rounded-md border border-white/10 bg-white/5 px-2 text-xs text-white/75 [color-scheme:dark] focus:outline-none"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={bulkDelete}
            className="border-rose-400/25 text-rose-200 hover:bg-rose-500/10"
          >
            <Trash2 className="mr-1 h-3.5 w-3.5" />
            Delete
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setSelectedIds([])}
            title="Clear selection"
            className="text-white/50 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      <ManageTagsDialog tags={allTags} open={manageTagsOpen} onOpenChange={setManageTagsOpen} />
      <CsvImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => router.refresh()}
      />
      <TemplatesDialog open={templatesOpen} onOpenChange={setTemplatesOpen} />
      <ChatSidebar />
    </div>
  )
}

// A persistent quick-add row for the list view. Title text supports the
// natural-language syntax (parsed by the caller's addTask via parseQuickAdd).
function QuickAddBar({ onAdd }: { onAdd: (title: string) => void }) {
  const [value, setValue] = useState('')
  function submit() {
    const t = value.trim()
    if (!t) return
    onAdd(t)
    setValue('')
  }
  return (
    <div className="tl-rise flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <Plus className="h-4 w-4 shrink-0 text-white/35" />
      <input
        id="quick-add-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            submit()
          }
        }}
        placeholder="Quick add — e.g. “Email Dan tomorrow !high”"
        aria-label="Quick add a task"
        className="min-w-0 flex-1 bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
      />
      {value.trim() && (
        <Button size="sm" onClick={submit} className="btn-accent h-7">
          Add
        </Button>
      )}
    </div>
  )
}
