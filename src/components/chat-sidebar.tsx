'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/markdown'

type Msg = { id: number; role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = ["What's due soon?", 'What should I focus on today?', 'Plan a weekend trip']

// A floating chat assistant on the tasks page. It answers questions about the
// user's tasks and can create new ones (the route dispatches to the Planner).
// Self-contained and additive — it doesn't touch the task list/sign-in flows.
export function ChatSidebar() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(0)
  // The assistant message currently "typing out", and how many chars are shown.
  const [reveal, setReveal] = useState<{ id: number; n: number } | null>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending, open, reveal])

  // Typewriter reveal of the latest assistant reply.
  useEffect(() => {
    if (!reveal) return
    const msg = messages.find((m) => m.id === reveal.id)
    if (!msg || reveal.n >= msg.content.length) {
      setReveal(null)
      return
    }
    const t = setTimeout(
      () => setReveal((r) => (r ? { ...r, n: Math.min(r.n + 3, msg.content.length) } : null)),
      16,
    )
    return () => clearTimeout(t)
  }, [reveal, messages])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    const history = messages.slice(-8)
    setMessages((m) => [...m, { id: ++idRef.current, role: 'user', content: trimmed }])
    setInput('')
    setSending(true)
    try {
      const res = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            id: ++idRef.current,
            role: 'assistant',
            content: data?.error ?? 'Something went wrong. Try again.',
          },
        ])
        return
      }
      const aid = ++idRef.current
      setMessages((m) => [...m, { id: aid, role: 'assistant', content: data.reply }])
      setReveal({ id: aid, n: 0 }) // type it out
      if (data.createdTask) {
        toast.success(`Created “${data.createdTask.title}”`)
        router.refresh()
      }
    } catch {
      setMessages((m) => [
        ...m,
        { id: ++idRef.current, role: 'assistant', content: 'Network error — please try again.' },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? 'Close assistant' : 'Open assistant'}
        className="fixed right-5 bottom-5 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-violet-500/90 text-white shadow-xl shadow-violet-900/30 backdrop-blur transition-transform hover:scale-105"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
      </button>

      {open && (
        <div className="fixed right-5 bottom-20 z-40 flex h-[28rem] w-[22rem] max-w-[calc(100vw-2.5rem)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0b0e1a]/95 shadow-2xl backdrop-blur-xl">
          <header className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <Sparkles className="h-4 w-4 text-violet-300" />
            <span className="text-sm font-semibold text-white">Assistant</span>
            <span className="ml-auto text-[11px] text-white/35">Ask or create tasks</span>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-white/55">
                  Ask about your tasks, or tell me to plan something new.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => sendMessage(s)}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/65 hover:bg-white/10 hover:text-white"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) => {
              const revealing = reveal?.id === m.id
              const content = revealing ? m.content.slice(0, reveal!.n) : m.content
              return (
                <div
                  key={m.id}
                  className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === 'user'
                        ? 'bg-violet-500/85 text-white'
                        : 'border border-white/10 bg-white/[0.05] text-white/85'
                    }`}
                  >
                    {m.role === 'assistant' && !revealing ? (
                      <Markdown content={content} />
                    ) : (
                      <>
                        {content}
                        {revealing && <span className="ml-px animate-pulse text-white/50">▍</span>}
                      </>
                    )}
                  </div>
                </div>
              )
            })}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white/50">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:-0.2s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:-0.1s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" />
                  </span>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              sendMessage(input)
            }}
            className="flex items-center gap-2 border-t border-white/10 p-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              disabled={sending}
              aria-label="Message the assistant"
              className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-violet-400/40 focus:outline-none"
            />
            <Button
              type="submit"
              size="icon-sm"
              disabled={sending || !input.trim()}
              className="btn-accent shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      )}
    </>
  )
}
