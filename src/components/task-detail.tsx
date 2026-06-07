'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sparkles,
  Play,
  ListChecks,
  FileText,
  Globe,
  Check,
  Pencil,
  Trash2,
  Clock,
  LayoutGrid,
  ArrowRight,
  Zap,
  Mail,
  CalendarPlus,
  Plus,
  Copy,
  Wand2,
  GripVertical,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { EmailAgentDialog } from '@/components/email-agent-dialog'
import { ScheduleAgentDialog } from '@/components/schedule-agent-dialog'
import { RefineDialog } from '@/components/refine-dialog'
import { TagChips } from '@/components/tag-chip'
import { formatDue, dueToneClass } from '@/lib/format-due'
import type { TaskNodeUI, RichSourceUI } from '@/components/task-list'

type Source = RichSourceUI
type Child = TaskNodeUI & { _sources?: Source[]; _done?: boolean; _ranSecs?: number }

const OVERVIEW = '__overview__'

const PRIORITY: Record<TaskNodeUI['priority'], { dot: string; label: string }> = {
  LOW: { dot: 'bg-slate-400', label: 'text-slate-300' },
  MEDIUM: { dot: 'bg-sky-400', label: 'text-sky-300' },
  HIGH: { dot: 'bg-amber-400', label: 'text-amber-300' },
  URGENT: { dot: 'bg-rose-500', label: 'text-rose-300' },
}

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  return { ok: res.ok, data }
}

export function TaskDetail({
  task,
  onClose,
  onEdit,
}: {
  task: TaskNodeUI
  onClose: () => void
  onEdit: (t: TaskNodeUI) => void
}) {
  const router = useRouter()
  const [children, setChildren] = useState<Child[]>(
    (task.children ?? []).map((c) => ({
      ...c,
      _done: c.status === 'DONE',
      _sources: c.resultData?.sources ?? [],
    })),
  )
  const [summary, setSummary] = useState<string | null>(task.summary ?? null)
  const [runningAll, setRunningAll] = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [breakingDown, setBreakingDown] = useState(false)
  const [runningId, setRunningId] = useState<string | null>(null)
  const [emailOpen, setEmailOpen] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [refineOpen, setRefineOpen] = useState(false)
  const [title, setTitle] = useState(task.title)
  const [editingTitle, setEditingTitle] = useState(false)
  // Drag-to-reorder state for the steps rail.
  const [dragId, setDragId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  // Parent-as-leaf execute state (task with no subtasks)
  const [parentResult, setParentResult] = useState<string | null>(task.result ?? null)
  const [parentSources, setParentSources] = useState<Source[]>(task.resultData?.sources ?? [])
  const [parentRanSecs, setParentRanSecs] = useState<number | undefined>(undefined)
  const [runningParent, setRunningParent] = useState(false)

  const hasChildren = children.length > 0
  const doneCount = children.filter((c) => c._done).length
  const [selectedId, setSelectedId] = useState<string>(hasChildren ? children[0].id : OVERVIEW)
  const selected = children.find((c) => c.id === selectedId) ?? null
  const pr = PRIORITY[task.priority]
  const due = formatDue(task.dueDate, task.status)
  const scheduled = task.scheduledStart
    ? new Date(task.scheduledStart).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null

  function close() {
    onClose()
    router.refresh()
  }

  async function doAll() {
    setRunningAll(true)
    try {
      const { ok, data } = await postJson('/api/agents/run-all', { taskId: task.id })
      if (!ok) return toast.error(data?.error ?? 'Run all failed')
      const map = new Map<string, { result: string; sources: Source[] }>(
        (data?.results ?? []).map((r: { taskId: string; result: string; sources: Source[] }) => [
          r.taskId,
          r,
        ]),
      )
      setChildren((prev) =>
        prev.map((c) =>
          map.has(c.id)
            ? { ...c, result: map.get(c.id)!.result, _sources: map.get(c.id)!.sources }
            : c,
        ),
      )
      toast.success(
        `Agent ran ${data?.ran ?? 0} step${data?.ran === 1 ? '' : 's'}`,
        data?.demo ? { description: 'Demo mode — add a Gemini API key for real runs.' } : undefined,
      )
    } finally {
      setRunningAll(false)
    }
  }

  async function summarize() {
    setSummarizing(true)
    try {
      const { ok, data } = await postJson('/api/agents/summarize', { taskId: task.id })
      if (!ok) return toast.error(data?.error ?? 'Summary failed')
      setSummary(data?.summary ?? '')
      setSelectedId(OVERVIEW)
      toast.success(
        'Summary ready',
        data?.demo ? { description: 'Demo mode — add a Gemini API key.' } : undefined,
      )
    } finally {
      setSummarizing(false)
    }
  }

  async function breakDown() {
    setBreakingDown(true)
    try {
      const { ok, data } = await postJson('/api/agents/breakdown', { taskId: task.id })
      if (!ok) return toast.error(data?.error ?? 'Breakdown failed')
      const subs: Child[] = (data?.subtasks ?? []).map((c: TaskNodeUI) => ({
        ...c,
        _done: c.status === 'DONE',
      }))
      setChildren((prev) => [...prev, ...subs])
      if (subs[0]) setSelectedId(subs[0].id)
      toast.success(
        `Added ${subs.length} steps`,
        data?.demo ? { description: 'Demo mode — add a Gemini API key.' } : undefined,
      )
    } finally {
      setBreakingDown(false)
    }
  }

  async function runChild(childId: string, reply?: string) {
    setRunningId(childId)
    const t0 = Date.now()
    try {
      const { ok, data } = await postJson('/api/agents/execute', { taskId: childId, reply })
      if (!ok) return toast.error(data?.error ?? 'The agent failed')
      const secs = Math.max(1, Math.round((Date.now() - t0) / 1000))
      setChildren((prev) =>
        prev.map((c) =>
          c.id === childId
            ? { ...c, result: data?.result ?? '', _sources: data?.sources ?? [], _ranSecs: secs }
            : c,
        ),
      )
      toast.success(
        reply ? 'Agent updated with your answer' : 'Agent finished',
        data?.demo ? { description: 'Demo mode — add a Gemini API key.' } : undefined,
      )
    } finally {
      setRunningId(null)
    }
  }

  async function runParent(reply?: string) {
    setRunningParent(true)
    const t0 = Date.now()
    try {
      const { ok, data } = await postJson('/api/agents/execute', { taskId: task.id, reply })
      if (!ok) return toast.error(data?.error ?? 'The agent failed')
      setParentResult(data?.result ?? '')
      setParentSources(data?.sources ?? [])
      setParentRanSecs(Math.max(1, Math.round((Date.now() - t0) / 1000)))
      toast.success(
        reply ? 'Agent updated with your answer' : 'Agent finished',
        data?.demo ? { description: 'Demo mode — add a Gemini API key.' } : undefined,
      )
    } finally {
      setRunningParent(false)
    }
  }

  async function toggleChild(child: Child) {
    const next = child._done ? 'TODO' : 'DONE'
    setChildren((prev) => prev.map((c) => (c.id === child.id ? { ...c, _done: !c._done } : c)))
    const res = await fetch(`/api/tasks/${child.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: next,
        completedAt: next === 'DONE' ? new Date().toISOString() : null,
      }),
    })
    if (!res.ok) {
      setChildren((prev) => prev.map((c) => (c.id === child.id ? { ...c, _done: child._done } : c)))
      toast.error('Failed to update')
    }
  }

  async function deleteChild(child: Child) {
    if (!confirm('Delete this step?')) return
    const res = await fetch(`/api/tasks/${child.id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Failed to delete')
    setChildren((prev) => {
      const next = prev.filter((c) => c.id !== child.id)
      if (selectedId === child.id) setSelectedId(next[0]?.id ?? OVERVIEW)
      return next
    })
  }

  async function deleteParent() {
    if (!confirm('Delete this task and all its steps?')) return
    const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Failed to delete')
    toast.success('Deleted')
    close()
  }

  async function duplicate() {
    const res = await fetch(`/api/tasks/${task.id}/duplicate`, { method: 'POST' })
    if (!res.ok) return toast.error('Could not duplicate')
    toast.success('Task duplicated')
    close()
  }

  async function addStep(title: string) {
    const { ok, data } = await postJson('/api/tasks', { title, parentId: task.id })
    if (!ok) return toast.error('Could not add step')
    const child = data?.task as Child | undefined
    if (child) {
      setChildren((prev) => [...prev, { ...child, _done: child.status === 'DONE' }])
      setSelectedId(child.id)
    }
  }

  // Move a step before another and persist the new order (optimistic).
  function reorderChildren(fromId: string, toId: string) {
    if (fromId === toId) return
    const arr = [...children]
    const from = arr.findIndex((c) => c.id === fromId)
    const to = arr.findIndex((c) => c.id === toId)
    if (from < 0 || to < 0) return
    const [moved] = arr.splice(from, 1)
    arr.splice(to, 0, moved)
    const prev = children
    setChildren(arr)
    fetch('/api/tasks/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: arr.map((c) => c.id) }),
    })
      .then((res) => {
        if (!res.ok) {
          setChildren(prev)
          toast.error('Could not reorder steps')
        }
      })
      .catch(() => {
        setChildren(prev)
        toast.error('Could not reorder steps')
      })
  }

  async function renameTask(next: string) {
    const trimmed = next.trim()
    setEditingTitle(false)
    if (!trimmed || trimmed === title) return
    const prev = title
    setTitle(trimmed)
    const res = await fetch(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: trimmed }),
    })
    if (!res.ok) {
      setTitle(prev)
      toast.error('Could not rename task')
    }
  }

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && close()}>
        <DialogContent className="flex h-[86vh] w-[calc(100%-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden border-white/10 bg-[#0b0e1a]/95 p-0 backdrop-blur-xl sm:max-w-4xl">
          {/* Header */}
          <div className="shrink-0 border-b border-white/10 p-5 pr-12">
            <span className="inline-flex items-center gap-1.5 text-[11px]">
              <span className={`h-1.5 w-1.5 rounded-full ${pr.dot}`} />
              <span className={`font-medium ${pr.label}`}>{task.priority}</span>
              {due && <span className={`ml-2 ${dueToneClass(due)}`}>due {due.label}</span>}
              {scheduled && <span className="ml-2 text-violet-300">· scheduled {scheduled}</span>}
            </span>
            <DialogTitle className="mt-1.5 text-xl font-semibold tracking-tight text-white">
              {editingTitle ? (
                <input
                  autoFocus
                  defaultValue={title}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      renameTask((e.target as HTMLInputElement).value)
                    } else if (e.key === 'Escape') {
                      setEditingTitle(false)
                    }
                  }}
                  onBlur={(e) => renameTask(e.target.value)}
                  className="w-full rounded-md border border-white/15 bg-white/10 px-2 py-0.5 text-xl font-semibold text-white focus:border-violet-400/40 focus:outline-none"
                />
              ) : (
                <span
                  onDoubleClick={() => setEditingTitle(true)}
                  title="Double-click to rename"
                  className="cursor-text"
                >
                  {title}
                </span>
              )}
            </DialogTitle>
            {task.description && <p className="mt-1 text-sm text-white/55">{task.description}</p>}

            <TagChips tags={task.tags} className="mt-2.5" />

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {hasChildren ? (
                <>
                  <Button size="sm" onClick={doAll} disabled={runningAll} className="btn-accent">
                    <ListChecks
                      className={`mr-1 h-3.5 w-3.5 ${runningAll ? 'animate-pulse' : ''}`}
                    />
                    {runningAll ? 'Running all…' : 'Do all'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={summarize}
                    disabled={summarizing}
                    className="border-white/15 text-white/75 hover:bg-white/5"
                  >
                    <FileText
                      className={`mr-1 h-3.5 w-3.5 ${summarizing ? 'animate-pulse' : ''}`}
                    />
                    {summarizing ? 'Summarizing…' : 'Summary'}
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={breakDown}
                  disabled={breakingDown}
                  className="border-white/15 text-white/75 hover:bg-white/5"
                >
                  <Sparkles className={`mr-1 h-3.5 w-3.5 ${breakingDown ? 'animate-spin' : ''}`} />
                  {breakingDown ? 'Breaking down…' : 'Break into steps'}
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRefineOpen(true)}
                className="border-white/15 text-white/75 hover:bg-white/5"
              >
                <Wand2 className="mr-1 h-3.5 w-3.5" />
                Refine
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEmailOpen(true)}
                className="border-white/15 text-white/75 hover:bg-white/5"
              >
                <Mail className="mr-1 h-3.5 w-3.5" />
                Email
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setScheduleOpen(true)}
                className="border-white/15 text-white/75 hover:bg-white/5"
              >
                <CalendarPlus className="mr-1 h-3.5 w-3.5" />
                Schedule
              </Button>
              <span className="ml-auto flex items-center gap-1">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={duplicate}
                  title="Duplicate"
                  className="text-white/40 hover:text-white"
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => onEdit(task)}
                  title="Edit"
                  className="text-white/40 hover:text-white"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={deleteParent}
                  title="Delete"
                  className="text-white/40 hover:text-rose-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </span>
            </div>
          </div>

          {/* Body */}
          {hasChildren ? (
            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[252px_1fr]">
              {/* Left: step rail */}
              <div className="max-h-44 overflow-y-auto border-b border-white/10 p-3 lg:max-h-none lg:border-r lg:border-b-0">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-[11px] font-medium tracking-wider text-white/35 uppercase">
                    Steps
                  </span>
                  <span className="text-[11px] text-white/40 tabular-nums">
                    {doneCount}/{children.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedId(OVERVIEW)}
                  className={`mb-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                    selectedId === OVERVIEW
                      ? 'bg-violet-500/15 text-white'
                      : 'text-white/70 hover:bg-white/5'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4 shrink-0 text-violet-300" />
                  Overview
                </button>
                <div className="space-y-0.5">
                  {children.map((child, i) => {
                    const active = selectedId === child.id
                    const cpr = PRIORITY[child.priority]
                    const isBusy = runningId === child.id || runningAll
                    return (
                      <button
                        key={child.id}
                        type="button"
                        draggable
                        onClick={() => setSelectedId(child.id)}
                        onDragStart={(e) => {
                          setDragId(child.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                        onDragOver={(e) => {
                          e.preventDefault()
                          if (dragId && dragId !== child.id) setOverId(child.id)
                        }}
                        onDrop={(e) => {
                          e.preventDefault()
                          if (dragId) reorderChildren(dragId, child.id)
                          setDragId(null)
                          setOverId(null)
                        }}
                        onDragEnd={() => {
                          setDragId(null)
                          setOverId(null)
                        }}
                        className={`group flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors ${
                          active ? 'bg-violet-500/15' : 'hover:bg-white/5'
                        } ${dragId === child.id ? 'opacity-40' : ''} ${
                          overId === child.id ? 'ring-1 ring-violet-400/60' : ''
                        }`}
                      >
                        <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-white/15 group-hover:text-white/40" />
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
                            child._done
                              ? 'border-violet-400 bg-violet-500 text-white'
                              : isBusy
                                ? 'animate-pulse border-violet-400/70 text-violet-200'
                                : 'border-white/20 text-white/50'
                          }`}
                        >
                          {child._done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                        </span>
                        <span
                          className={`min-w-0 flex-1 truncate text-[13px] ${
                            child._done
                              ? 'text-white/45 line-through'
                              : active
                                ? 'text-white'
                                : 'text-white/75'
                          }`}
                        >
                          {child.title}
                        </span>
                        {child.result && (
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cpr.dot}`} />
                        )}
                      </button>
                    )
                  })}
                </div>
                <StepAdd onAdd={addStep} />
              </div>

              {/* Right: detail canvas */}
              <div className="min-h-0 overflow-y-auto p-5">
                {selectedId === OVERVIEW ? (
                  <OverviewPane
                    description={task.description}
                    summary={summary}
                    done={doneCount}
                    total={children.length}
                    totalMinutes={children.reduce((s, c) => s + (c.estimatedMinutes ?? 0), 0)}
                    onSummarize={summarize}
                    summarizing={summarizing}
                  />
                ) : selected ? (
                  <StepDetail
                    key={selected.id}
                    child={selected}
                    busy={runningId === selected.id || runningAll}
                    onRun={(reply) => runChild(selected.id, reply)}
                    onToggle={() => toggleChild(selected)}
                    onDelete={() => deleteChild(selected)}
                  />
                ) : null}
              </div>
            </div>
          ) : (
            /* Leaf task — single canvas */
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="mb-4 flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => runParent()}
                  disabled={runningParent}
                  className="btn-accent"
                >
                  <Play className={`mr-1 h-3.5 w-3.5 ${runningParent ? 'animate-pulse' : ''}`} />
                  {runningParent ? 'Working…' : 'Do it'}
                </Button>
              </div>
              {parentResult ? (
                <ResultView
                  result={parentResult}
                  sources={parentSources}
                  busy={runningParent}
                  ranSecs={parentRanSecs}
                  onReply={(t) => runParent(t)}
                />
              ) : (
                <EmptyResult onRun={() => runParent()} busy={runningParent} />
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EmailAgentDialog task={task} open={emailOpen} onOpenChange={setEmailOpen} />
      <ScheduleAgentDialog task={task} open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <RefineDialog task={task} open={refineOpen} onOpenChange={setRefineOpen} />
    </>
  )
}

/* ───────── Add a step (manual subtask) ───────── */
function StepAdd({ onAdd }: { onAdd: (title: string) => void }) {
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')

  function submit() {
    const t = title.trim()
    if (!t) return
    onAdd(t)
    setTitle('')
    setAdding(false)
  }

  if (!adding) {
    return (
      <button
        type="button"
        onClick={() => setAdding(true)}
        className="mt-1 flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-white/40 hover:bg-white/5 hover:text-white/70"
      >
        <Plus className="h-4 w-4 shrink-0" />
        Add step
      </button>
    )
  }

  return (
    <input
      autoFocus
      value={title}
      onChange={(e) => setTitle(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          submit()
        } else if (e.key === 'Escape') {
          setTitle('')
          setAdding(false)
        }
      }}
      onBlur={submit}
      placeholder="Step title…"
      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-sm text-white placeholder:text-white/35 focus:border-violet-400/40 focus:outline-none"
    />
  )
}

/* ───────── Overview pane ───────── */
function OverviewPane({
  description,
  summary,
  done,
  total,
  totalMinutes,
  onSummarize,
  summarizing,
}: {
  description: string | null
  summary: string | null
  done: number
  total: number
  totalMinutes: number
  onSummarize: () => void
  summarizing: boolean
}) {
  const pct = total ? Math.round((done / total) * 100) : 0
  const hrs = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  const timeLabel =
    totalMinutes > 0 ? (hrs ? `${hrs}h${mins ? ` ${mins}m` : ''}` : `${mins}m`) : null
  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>Progress</span>
          <span className="tabular-nums">
            {done}/{total} done
          </span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-violet-400/80 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {timeLabel && (
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-white/45">
            <Clock className="h-3 w-3" />~{timeLabel} of focused work across {total} steps
          </p>
        )}
      </div>

      {description && <p className="text-sm leading-relaxed text-white/70">{description}</p>}

      <div>
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
          <FileText className="h-4 w-4 text-sky-300" />
          Plan summary
        </div>
        {summary ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/75">{summary}</p>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-5 text-center">
            <p className="text-sm text-white/50">No summary yet.</p>
            <Button
              size="sm"
              onClick={onSummarize}
              disabled={summarizing}
              className="btn-accent mt-3"
            >
              <FileText className={`mr-1 h-3.5 w-3.5 ${summarizing ? 'animate-pulse' : ''}`} />
              {summarizing ? 'Summarizing…' : 'Generate summary'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

/* ───────── Step detail (right canvas) ───────── */
function StepDetail({
  child,
  busy,
  onRun,
  onToggle,
  onDelete,
}: {
  child: Child
  busy: boolean
  onRun: (reply?: string) => void
  onToggle: () => void
  onDelete: () => void
}) {
  const pr = PRIORITY[child.priority]
  const done = child._done
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className={`text-lg leading-snug font-semibold ${done ? 'text-white/55 line-through' : 'text-white'}`}
          >
            {child.title}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-white/50">
            <span className="inline-flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${pr.dot}`} />
              <span className={pr.label}>{child.priority}</span>
            </span>
            {child.estimatedMinutes != null && (
              <span
                className="inline-flex items-center gap-1"
                title="Roughly how long this would take you to do by hand"
              >
                <Clock className="h-3 w-3" />~{child.estimatedMinutes}m to do yourself
              </span>
            )}
          </div>
        </div>
        <Button
          size="icon-sm"
          variant="ghost"
          onClick={onDelete}
          title="Delete step"
          className="shrink-0 text-white/40 hover:text-rose-300"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => onRun()} disabled={busy} className="btn-accent">
          <Play className={`mr-1 h-3.5 w-3.5 ${busy ? 'animate-pulse' : ''}`} />
          {busy ? 'Working…' : child.result ? 'Run again' : 'Do it'}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onToggle}
          className="border-white/15 text-white/70 hover:bg-white/5"
        >
          <Check className="mr-1 h-3.5 w-3.5" />
          {done ? 'Mark not done' : 'Mark done'}
        </Button>
      </div>

      {child.result ? (
        <ResultView
          result={child.result}
          sources={child._sources ?? []}
          busy={busy}
          ranSecs={child._ranSecs}
          onReply={(t) => onRun(t)}
        />
      ) : (
        <EmptyResult onRun={() => onRun()} busy={busy} />
      )}
    </div>
  )
}

/* ───────── Empty result placeholder ───────── */
function EmptyResult({ onRun, busy }: { onRun: () => void; busy: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center">
      <Globe className="mx-auto h-7 w-7 text-violet-300/50" />
      <p className="mt-3 text-sm text-white/60">Run this and the agent does it for real.</p>
      <p className="mt-1 text-xs text-white/40">
        It searches the live web and brings back pages, prices, and images — right here.
      </p>
      <Button size="sm" onClick={onRun} disabled={busy} className="btn-accent mt-4">
        <Play className={`mr-1 h-3.5 w-3.5 ${busy ? 'animate-pulse' : ''}`} />
        {busy ? 'Working…' : 'Do it'}
      </Button>
    </div>
  )
}

/* ───────── Result view (report + gallery + answer) ───────── */
function ResultView({
  result,
  sources,
  busy,
  ranSecs,
  onReply,
}: {
  result: string
  sources: Source[]
  busy: boolean
  ranSecs?: number
  onReply: (text: string) => void
}) {
  const [reply, setReply] = useState('')
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {ranSecs != null && (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300">
            <Zap className="h-3 w-3" />
            Agent did it in {ranSecs}s
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(result)
            toast.success('Copied to clipboard')
          }}
          className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-white/45 hover:bg-white/5 hover:text-white/75"
        >
          <Copy className="h-3 w-3" />
          Copy
        </button>
      </div>
      <p className="text-sm leading-relaxed whitespace-pre-wrap text-white/80">{result}</p>

      {sources.length > 0 && (
        <div>
          <p className="mb-2 text-[10px] tracking-wider text-white/40 uppercase">
            Results &amp; sources
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {sources.map((s, i) => (
              <SourceCard key={i} s={s} />
            ))}
          </div>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (reply.trim() && !busy) {
            onReply(reply.trim())
            setReply('')
          }
        }}
        className="flex gap-2 border-t border-white/10 pt-4"
      >
        <Input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Answer the agent or add details…"
          disabled={busy}
          className="h-9 border-white/10 bg-white/5 text-sm"
        />
        <Button type="submit" size="sm" disabled={busy || !reply.trim()} className="btn-accent">
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </form>
    </div>
  )
}

/* ───────── Big source card with banner image ───────── */
function SourceCard({ s }: { s: Source }) {
  const [err, setErr] = useState(false)
  const showImg = s.image && !err
  return (
    <a
      href={s.uri}
      target="_blank"
      rel="noopener noreferrer"
      className="group overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] transition-colors hover:border-white/25 hover:bg-white/[0.06]"
    >
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={s.image}
          alt=""
          loading="lazy"
          onError={() => setErr(true)}
          className="h-28 w-full object-cover"
        />
      ) : (
        <div className="flex h-28 w-full items-center justify-center bg-white/[0.04]">
          <Globe className="h-7 w-7 text-white/25" />
        </div>
      )}
      <div className="p-3">
        <div className="truncate text-xs font-medium text-white/85 group-hover:text-white">
          {s.title}
        </div>
        <div className="mt-0.5 truncate text-[10px] text-white/40">{s.siteName}</div>
        {s.description && (
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-white/50">
            {s.description}
          </p>
        )}
      </div>
    </a>
  )
}
