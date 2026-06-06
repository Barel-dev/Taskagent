'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wand2, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

// The Refine agent dialog: on open it asks the agent to sharpen the task, then
// shows an editable title + body (description with acceptance criteria) that the
// user reviews and applies. Applying never happens automatically.
export function RefineDialog({
  task,
  open,
  onOpenChange,
}: {
  task: { id: string; title: string; description: string | null }
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [demo, setDemo] = useState(false)
  const [failed, setFailed] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    if (!open) {
      setLoading(false)
      setApplying(false)
      setDemo(false)
      setFailed(false)
      setTitle('')
      setBody('')
      return
    }
    let cancelled = false
    async function refine() {
      setLoading(true)
      setFailed(false)
      try {
        const res = await fetch('/api/agents/refine', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: task.id }),
        })
        const data = await res.json().catch(() => null)
        if (cancelled) return
        if (!res.ok) {
          setFailed(true)
          toast.error(data?.error ?? 'Could not refine the task')
          return
        }
        const criteria: string[] = data.acceptanceCriteria ?? []
        setTitle(data.title ?? task.title)
        setBody(
          `${data.description ?? ''}\n\nAcceptance criteria:\n${criteria
            .map((c) => `- ${c}`)
            .join('\n')}`,
        )
        setDemo(Boolean(data.demo))
      } catch {
        if (!cancelled) {
          setFailed(true)
          toast.error('Could not refine the task')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    refine()
    return () => {
      cancelled = true
    }
  }, [open, task.id, task.title])

  async function apply() {
    if (applying || !title.trim()) return
    setApplying(true)
    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: body.trim() || null }),
      })
      if (!res.ok) {
        toast.error('Could not apply changes')
        return
      }
      toast.success('Task refined')
      onOpenChange(false)
      router.refresh()
    } finally {
      setApplying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-white/10 bg-[#0b0e1a]/95 backdrop-blur-xl">
        <DialogTitle className="flex items-center gap-2 text-white">
          <Wand2 className="h-4 w-4 text-violet-300" />
          Refine task
        </DialogTitle>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/55">
            <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
            Sharpening this task…
          </div>
        ) : failed ? (
          <div className="py-10 text-center text-sm text-white/55">
            Couldn’t refine. Close and try again.
          </div>
        ) : (
          <div className="space-y-4">
            {demo && (
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                Demo output — add a GEMINI_API_KEY for a real AI refinement.
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="refine-title" className="text-white/70">
                Title
              </Label>
              <Input
                id="refine-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={applying}
                className="border-white/10 bg-white/5 text-sm text-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refine-body" className="text-white/70">
                Description &amp; acceptance criteria
              </Label>
              <Textarea
                id="refine-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={9}
                disabled={applying}
                className="border-white/10 bg-white/5 text-sm leading-relaxed text-white"
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-white/10 pt-4">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={applying}
                className="text-white/60 hover:text-white"
              >
                Cancel
              </Button>
              <Button size="sm" onClick={apply} disabled={applying} className="btn-accent">
                <Check className={`mr-1 h-3.5 w-3.5 ${applying ? 'animate-pulse' : ''}`} />
                {applying ? 'Applying…' : 'Apply'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
