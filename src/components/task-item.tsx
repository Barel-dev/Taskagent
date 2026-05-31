'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Play, ExternalLink, Check, Pencil, Trash2, Clock, CalendarDays } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

type Source = { title: string; uri: string }
type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

type Task = {
  id: string
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  priority: Priority
  dueDate: string | Date | null
  estimatedMinutes?: number | null
  result?: string | null
  children?: Task[]
}

// Priority → color tokens (dot, label, accent bar).
const PRIORITY: Record<Priority, { dot: string; label: string; bar: string }> = {
  LOW: { dot: 'bg-slate-400', label: 'text-slate-300', bar: 'rgb(148,163,184)' },
  MEDIUM: { dot: 'bg-sky-400', label: 'text-sky-300', bar: 'rgb(56,189,248)' },
  HIGH: { dot: 'bg-amber-400', label: 'text-amber-300', bar: 'rgb(251,191,36)' },
  URGENT: { dot: 'bg-rose-500', label: 'text-rose-300', bar: 'rgb(244,63,94)' },
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

  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(task.result ?? null)
  const [sources, setSources] = useState<Source[]>([])
  const [showResult, setShowResult] = useState(false)
  const [reply, setReply] = useState('')

  const pr = PRIORITY[task.priority]

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
        setOptimisticDone(optimisticDone)
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

  async function doIt(replyText?: string) {
    setRunning(true)
    try {
      const res = await fetch('/api/agents/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, reply: replyText || undefined }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? 'The agent failed')
        return
      }
      setResult(data?.result ?? '')
      setSources(data?.sources ?? [])
      setShowResult(true)
      setReply('')
      toast.success(
        replyText ? 'Agent updated with your answer' : 'Agent finished',
        data?.demo
          ? { description: 'Demo mode — add a Gemini API key to run real web searches.' }
          : undefined,
      )
    } catch {
      toast.error('The agent failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div>
      <div
        className={`task-card relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm ${
          optimisticDone ? 'opacity-60' : ''
        }`}
      >
        {/* priority accent bar */}
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 w-1"
          style={{ background: pr.bar }}
        />

        <div className={`flex items-start gap-3 ${isSubtask ? 'p-3 pl-5' : 'p-4 pl-5'}`}>
          {/* custom checkbox */}
          <button
            type="button"
            onClick={toggleDone}
            disabled={pending}
            aria-label={optimisticDone ? 'Mark as not done' : 'Mark as done'}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-all ${
              optimisticDone
                ? 'border-violet-400 bg-violet-500 text-white'
                : 'border-white/25 hover:border-violet-400/60'
            }`}
          >
            {optimisticDone && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </button>

          <div className="min-w-0 flex-1">
            <div
              className={
                optimisticDone
                  ? 'text-white/60 line-through'
                  : isSubtask
                    ? 'text-sm font-medium text-white/90'
                    : 'font-medium text-white'
              }
            >
              {task.title}
            </div>
            {task.description && (
              <p className="mt-1 text-sm text-white/55">{task.description}</p>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2 py-0.5">
                <span className={`h-1.5 w-1.5 rounded-full ${pr.dot}`} />
                <span className={`font-medium ${pr.label}`}>{task.priority}</span>
              </span>
              {task.estimatedMinutes != null && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-white/55">
                  <Clock className="h-3 w-3" />~{task.estimatedMinutes}m
                </span>
              )}
              {task.dueDate && (
                <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-white/55">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              size="sm"
              onClick={() => doIt()}
              disabled={pending || running}
              className="btn-gradient"
              title="Let the agent actually do this task (live web search)"
            >
              <Play className={`mr-1 h-3.5 w-3.5 ${running ? 'animate-pulse' : ''}`} />
              {running ? 'Working…' : 'Do it'}
            </Button>
            {!isSubtask && (
              <Button
                size="sm"
                variant="outline"
                onClick={breakDown}
                disabled={pending || breakingDown}
                className="border-violet-400/25 text-violet-200 hover:bg-violet-500/10"
                title="Break this task into subtasks with AI"
              >
                <Sparkles className={`mr-1 h-3.5 w-3.5 ${breakingDown ? 'animate-spin' : ''}`} />
                {breakingDown ? '…' : 'Break down'}
              </Button>
            )}
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={() => onEdit(task)}
              disabled={pending}
              title="Edit"
              className="text-white/50 hover:text-white"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              onClick={remove}
              disabled={pending}
              title="Delete"
              className="text-white/50 hover:text-rose-300"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {result && (
        <div className="mt-2 ml-5 overflow-hidden rounded-xl border border-violet-400/20 bg-violet-500/[0.04] backdrop-blur-sm">
          <button
            type="button"
            onClick={() => setShowResult((v) => !v)}
            className="flex w-full items-center gap-1.5 px-3 py-2 text-xs font-semibold text-violet-200"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Agent result
            <span className="ml-auto text-white/40">{showResult ? '▾' : '▸'}</span>
          </button>
          {showResult && (
            <div className="px-3 pb-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{result}</p>
              {sources.length > 0 && (
                <div className="mt-3 border-t border-white/10 pt-2">
                  <p className="mb-1.5 text-[10px] uppercase tracking-wider text-white/40">Sources</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sources.map((s, i) => (
                      <a
                        key={i}
                        href={s.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex max-w-[15rem] items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-sky-300 transition-colors hover:border-sky-400/40 hover:bg-sky-500/10"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        <span className="truncate">{s.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  if (reply.trim() && !running) doIt(reply.trim())
                }}
                className="mt-3 flex gap-2 border-t border-white/10 pt-3"
              >
                <Input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Answer the agent or add details…"
                  disabled={running}
                  className="h-8 border-white/10 bg-white/5 text-sm"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={running || !reply.trim()}
                  className="btn-gradient"
                >
                  {running ? 'Sending…' : 'Send'}
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

      {children.length > 0 && (
        <div className="mt-2 ml-5 space-y-2 border-l-2 border-violet-400/20 pl-4">
          {children.map((child) => (
            <TaskItem key={child.id} task={child} onEdit={onEdit} isSubtask />
          ))}
        </div>
      )}
    </div>
  )
}
