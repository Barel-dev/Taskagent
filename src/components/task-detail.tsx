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
  CalendarDays,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { TaskNodeUI, RichSourceUI } from '@/components/task-list'

type Source = RichSourceUI
type Child = TaskNodeUI & { _sources?: Source[]; _done?: boolean }

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

  // Parent-as-leaf execute state (task with no subtasks)
  const [parentResult, setParentResult] = useState<string | null>(task.result ?? null)
  const [parentSources, setParentSources] = useState<Source[]>(task.resultData?.sources ?? [])
  const [runningParent, setRunningParent] = useState(false)

  const pr = PRIORITY[task.priority]
  const hasChildren = children.length > 0

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
          map.has(c.id) ? { ...c, result: map.get(c.id)!.result, _sources: map.get(c.id)!.sources } : c,
        ),
      )
      toast.success(
        `Agent ran ${data?.ran ?? 0} subtask${data?.ran === 1 ? '' : 's'}`,
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
      toast.success(
        `Added ${subs.length} subtasks`,
        data?.demo ? { description: 'Demo mode — add a Gemini API key.' } : undefined,
      )
    } finally {
      setBreakingDown(false)
    }
  }

  async function runChild(childId: string, reply?: string) {
    setRunningId(childId)
    try {
      const { ok, data } = await postJson('/api/agents/execute', { taskId: childId, reply })
      if (!ok) return toast.error(data?.error ?? 'The agent failed')
      setChildren((prev) =>
        prev.map((c) =>
          c.id === childId ? { ...c, result: data?.result ?? '', _sources: data?.sources ?? [] } : c,
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
    try {
      const { ok, data } = await postJson('/api/agents/execute', { taskId: task.id, reply })
      if (!ok) return toast.error(data?.error ?? 'The agent failed')
      setParentResult(data?.result ?? '')
      setParentSources(data?.sources ?? [])
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
    if (!confirm('Delete this subtask?')) return
    const res = await fetch(`/api/tasks/${child.id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Failed to delete')
    setChildren((prev) => prev.filter((c) => c.id !== child.id))
  }

  async function deleteParent() {
    if (!confirm('Delete this task and all its subtasks?')) return
    const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' })
    if (!res.ok) return toast.error('Failed to delete')
    toast.success('Deleted')
    close()
  }

  return (
    <Dialog open onOpenChange={(o) => !o && close()}>
      <DialogContent className="max-h-[86vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto border-white/10 bg-[#0b0e1a]/95 backdrop-blur-xl sm:max-w-2xl">
        {/* Header */}
        <div className="pr-8">
          <span className="inline-flex items-center gap-1.5 text-[11px]">
            <span className={`h-1.5 w-1.5 rounded-full ${pr.dot}`} />
            <span className={`font-medium ${pr.label}`}>{task.priority}</span>
          </span>
          <DialogTitle className="mt-1.5 text-xl font-semibold tracking-tight text-white">
            {task.title}
          </DialogTitle>
          {task.description && <p className="mt-1.5 text-sm text-white/55">{task.description}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-white/45">
            {task.estimatedMinutes != null && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />~{task.estimatedMinutes}m
              </span>
            )}
            {task.dueDate && (
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                {new Date(task.dueDate).toLocaleDateString()}
              </span>
            )}
            {hasChildren && <span>{children.length} subtasks</span>}
          </div>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {hasChildren ? (
              <>
                <Button size="sm" onClick={doAll} disabled={runningAll} className="btn-accent">
                  <ListChecks className={`mr-1 h-3.5 w-3.5 ${runningAll ? 'animate-pulse' : ''}`} />
                  {runningAll ? 'Running all…' : 'Do all'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={summarize}
                  disabled={summarizing}
                  className="border-white/15 text-white/75 hover:bg-white/5"
                >
                  <FileText className={`mr-1 h-3.5 w-3.5 ${summarizing ? 'animate-pulse' : ''}`} />
                  {summarizing ? 'Summarizing…' : 'Summary'}
                </Button>
              </>
            ) : (
              <>
                <Button size="sm" onClick={() => runParent()} disabled={runningParent} className="btn-accent">
                  <Play className={`mr-1 h-3.5 w-3.5 ${runningParent ? 'animate-pulse' : ''}`} />
                  {runningParent ? 'Working…' : 'Do it'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={breakDown}
                  disabled={breakingDown}
                  className="border-white/15 text-white/75 hover:bg-white/5"
                >
                  <Sparkles className={`mr-1 h-3.5 w-3.5 ${breakingDown ? 'animate-spin' : ''}`} />
                  {breakingDown ? 'Breaking down…' : 'Break into subtasks'}
                </Button>
              </>
            )}
            <span className="ml-auto flex items-center gap-1">
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

        {/* Summary */}
        {summary && (
          <Panel icon={<FileText className="h-3.5 w-3.5 text-sky-300" />} title="Summary" defaultOpen>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{summary}</p>
          </Panel>
        )}

        {/* Parent result (leaf task) */}
        {!hasChildren && parentResult && (
          <Panel
            icon={<Play className="h-3.5 w-3.5 text-violet-300" />}
            title="Agent result"
            defaultOpen
          >
            <ResultBody
              result={parentResult}
              sources={parentSources}
              busy={runningParent}
              onReply={(t) => runParent(t)}
            />
          </Panel>
        )}

        {/* Subtasks */}
        {hasChildren && (
          <div className="mt-2 space-y-2">
            <p className="text-[11px] font-medium uppercase tracking-wider text-white/35">Subtasks</p>
            {children.map((child) => (
              <SubtaskRow
                key={child.id}
                child={child}
                busy={runningId === child.id}
                onRun={(reply) => runChild(child.id, reply)}
                onToggle={() => toggleChild(child)}
                onDelete={() => deleteChild(child)}
              />
            ))}
          </div>
        )}

        {!hasChildren && !parentResult && (
          <p className="mt-2 text-sm text-white/45">
            No subtasks yet. Use <span className="text-white/70">Break into subtasks</span> to plan
            it, or <span className="text-white/70">Do it</span> to run this task directly.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}

/* ───────── Collapsible panel ───────── */
function Panel({
  icon,
  title,
  defaultOpen = false,
  children,
}: {
  icon: React.ReactNode
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white/70"
      >
        {icon}
        {title}
        <span className="ml-auto text-white/40">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  )
}

/* ───────── Source thumbnail with fallback ───────── */
function Thumb({ src }: { src?: string }) {
  const [err, setErr] = useState(false)
  if (!src || err) {
    return (
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-white/5">
        <Globe className="h-5 w-5 text-white/30" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setErr(true)}
      className="h-14 w-14 shrink-0 rounded-md object-cover"
    />
  )
}

/* ───────── Result body (text + sources + answer) ───────── */
function ResultBody({
  result,
  sources,
  busy,
  onReply,
}: {
  result: string
  sources: Source[]
  busy: boolean
  onReply: (text: string) => void
}) {
  const [reply, setReply] = useState('')
  return (
    <div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{result}</p>
      {sources.length > 0 && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="mb-2 text-[10px] uppercase tracking-wider text-white/40">
            Sources &amp; results
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sources.map((s, i) => (
              <a
                key={i}
                href={s.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-2.5 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] p-2 transition-colors hover:border-white/25 hover:bg-white/[0.07]"
              >
                <Thumb src={s.image} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-white/85 group-hover:text-white">
                    {s.title}
                  </div>
                  <div className="truncate text-[10px] text-white/40">{s.siteName}</div>
                  {s.description && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-white/50">
                      {s.description}
                    </p>
                  )}
                </div>
              </a>
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
        className="mt-3 flex gap-2 border-t border-white/10 pt-3"
      >
        <Input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Answer the agent or add details…"
          disabled={busy}
          className="h-8 border-white/10 bg-white/5 text-sm"
        />
        <Button type="submit" size="sm" disabled={busy || !reply.trim()} className="btn-accent">
          {busy ? 'Sending…' : 'Send'}
        </Button>
      </form>
    </div>
  )
}

/* ───────── One subtask row ───────── */
function SubtaskRow({
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
  const [open, setOpen] = useState(false)
  const pr = PRIORITY[child.priority]
  const done = child._done

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.025]">
      <div className="flex items-start gap-3 p-3">
        <button
          type="button"
          onClick={onToggle}
          aria-label={done ? 'Mark as not done' : 'Mark as done'}
          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
            done
              ? 'border-violet-400 bg-violet-500 text-white'
              : 'border-white/25 hover:border-violet-300/60'
          }`}
        >
          {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </button>

        <div className="min-w-0 flex-1">
          <div className={`text-sm font-medium ${done ? 'text-white/55 line-through' : 'text-white/90'}`}>
            {child.title}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-white/45">
            <span className="inline-flex items-center gap-1">
              <span className={`h-1.5 w-1.5 rounded-full ${pr.dot}`} />
              <span className={pr.label}>{child.priority}</span>
            </span>
            {child.estimatedMinutes != null && (
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3 w-3" />~{child.estimatedMinutes}m
              </span>
            )}
            {child.result && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="text-violet-300/80 hover:text-violet-200"
              >
                {open ? 'hide result' : 'view result'}
              </button>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button size="sm" onClick={() => onRun()} disabled={busy} className="btn-accent">
            <Play className={`mr-1 h-3.5 w-3.5 ${busy ? 'animate-pulse' : ''}`} />
            {busy ? 'Working…' : 'Do it'}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={onDelete}
            title="Delete subtask"
            className="text-white/40 hover:text-rose-300"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {child.result && open && (
        <div className="border-t border-white/10 px-3 py-3">
          <ResultBody
            result={child.result}
            sources={child._sources ?? []}
            busy={busy}
            onReply={(t) => onRun(t)}
          />
        </div>
      )}
    </div>
  )
}
