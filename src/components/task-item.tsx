'use client'

import { useState, useTransition } from 'react'
import { Sparkles, Play, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'

type Source = { title: string; uri: string }

type Task = {
  id: string
  title: string
  description: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: string | Date | null
  estimatedMinutes?: number | null
  result?: string | null
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

  // Execute ("Do it") agent state
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<string | null>(task.result ?? null)
  const [sources, setSources] = useState<Source[]>([])
  const [showResult, setShowResult] = useState(false)
  const [reply, setReply] = useState('')

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
        <div className="flex shrink-0 flex-wrap justify-end gap-2">
          <Button
            size="sm"
            onClick={() => doIt()}
            disabled={pending || running}
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

      {result && (
        <div className="mt-2 ml-5 rounded-lg border border-white/10 bg-white/[0.03] p-3">
          <button
            type="button"
            onClick={() => setShowResult((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-violet-300"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Agent result {showResult ? '▾' : '▸'}
          </button>
          {showResult && (
            <div className="mt-2">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{result}</p>
              {sources.length > 0 && (
                <div className="mt-3 border-t border-white/10 pt-2">
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-white/40">Sources</p>
                  <ul className="space-y-1">
                    {sources.map((s, i) => (
                      <li key={i}>
                        <a
                          href={s.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-sky-300 hover:underline"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" />
                          <span className="truncate">{s.title}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Answer the agent's questions / add details. Saved to the whole
                  plan so other agents reuse it. */}
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
                  className="h-8 text-sm"
                />
                <Button type="submit" size="sm" variant="outline" disabled={running || !reply.trim()}>
                  {running ? 'Sending…' : 'Send'}
                </Button>
              </form>
            </div>
          )}
        </div>
      )}

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
