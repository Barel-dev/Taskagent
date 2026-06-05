'use client'

import { useState } from 'react'
import { Mail, Sparkles, Send, ArrowLeft, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

type Phase = 'compose' | 'review'

// The Email agent dialog: type an instruction → the agent drafts → you review
// and edit → you click Send (the explicit approval) and only then does it send
// via your Gmail. There is no path that sends without this review step.
export function EmailAgentDialog({
  task,
  open,
  onOpenChange,
}: {
  task: { id: string; title: string; description: string | null }
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const [phase, setPhase] = useState<Phase>('compose')
  const [instruction, setInstruction] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [sending, setSending] = useState(false)
  const [demo, setDemo] = useState(false)
  const [to, setTo] = useState('')
  const [subject, setSubject] = useState('')
  const [emailBody, setEmailBody] = useState('')

  function reset() {
    setPhase('compose')
    setInstruction('')
    setDrafting(false)
    setSending(false)
    setDemo(false)
    setTo('')
    setSubject('')
    setEmailBody('')
  }

  function handleOpenChange(o: boolean) {
    if (!o) reset()
    onOpenChange(o)
  }

  async function draft() {
    const trimmed = instruction.trim()
    if (!trimmed || drafting) return
    setDrafting(true)
    try {
      const res = await fetch('/api/agents/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: task.id, instruction: trimmed }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? 'Could not draft the email')
        return
      }
      setTo(data?.draft?.to ?? '')
      setSubject(data?.draft?.subject ?? '')
      setEmailBody(data?.draft?.body ?? '')
      setDemo(Boolean(data?.demo))
      setPhase('review')
    } catch {
      toast.error('Could not draft the email')
    } finally {
      setDrafting(false)
    }
  }

  async function send() {
    if (sending) return
    if (!to.trim() || !subject.trim() || !emailBody.trim()) {
      toast.error('Add a recipient, subject, and body first')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/agents/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim(), body: emailBody }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(
          data?.error ?? 'Could not send the email',
          data?.needsReconnect
            ? { description: 'Sign out and back in to grant Gmail send access.' }
            : undefined,
        )
        return
      }
      toast.success('Email sent')
      handleOpenChange(false)
    } catch {
      toast.error('Could not send the email')
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg border-white/10 bg-[#0b0e1a]/95 backdrop-blur-xl">
        <DialogTitle className="flex items-center gap-2 text-white">
          <Mail className="h-4 w-4 text-violet-300" />
          {phase === 'compose' ? 'Email agent' : 'Review & send'}
        </DialogTitle>

        {phase === 'compose' ? (
          <div className="space-y-4">
            <p className="text-sm text-white/55">
              Tell the agent what to write. It uses{' '}
              <span className="text-white/80">“{task.title}”</span> as context.
            </p>
            <div className="space-y-2">
              <Label htmlFor="email-instruction" className="text-white/70">
                Instruction
              </Label>
              <Textarea
                id="email-instruction"
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                placeholder="e.g. Email sarah@acme.com that this task is done and ask for feedback"
                rows={4}
                disabled={drafting}
                className="border-white/10 bg-white/5 text-sm text-white placeholder:text-white/35"
              />
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={draft}
                disabled={drafting || !instruction.trim()}
                className="btn-accent"
              >
                <Sparkles className={`mr-1 h-3.5 w-3.5 ${drafting ? 'animate-spin' : ''}`} />
                {drafting ? 'Drafting…' : 'Draft email'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {demo && (
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                Demo draft — add a GEMINI_API_KEY for a real AI-written email.
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email-to" className="text-white/70">
                To
              </Label>
              <Input
                id="email-to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                disabled={sending}
                className="border-white/10 bg-white/5 text-sm text-white placeholder:text-white/35"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-subject" className="text-white/70">
                Subject
              </Label>
              <Input
                id="email-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                disabled={sending}
                className="border-white/10 bg-white/5 text-sm text-white placeholder:text-white/35"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email-body" className="text-white/70">
                Body
              </Label>
              <Textarea
                id="email-body"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={9}
                disabled={sending}
                className="border-white/10 bg-white/5 text-sm leading-relaxed text-white placeholder:text-white/35"
              />
            </div>

            <p className="flex items-center gap-1.5 text-[11px] text-white/40">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-300/70" />
              Nothing is sent until you click Send — it goes from your own Gmail.
            </p>

            <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-4">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPhase('compose')}
                disabled={sending}
                className="text-white/60 hover:text-white"
              >
                <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                Back
              </Button>
              <Button size="sm" onClick={send} disabled={sending} className="btn-accent">
                <Send className={`mr-1 h-3.5 w-3.5 ${sending ? 'animate-pulse' : ''}`} />
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
