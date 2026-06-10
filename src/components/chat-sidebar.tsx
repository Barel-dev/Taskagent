'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle, X, Send, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Markdown } from '@/components/markdown'

type Msg = { id: number; role: 'user' | 'assistant'; content: string }

const SUGGESTIONS = [
  "What's due soon?",
  'What should I focus on today?',
  'Push overdue tasks to tomorrow',
]

// A floating chat assistant on the tasks page. It answers questions about the
// user's tasks, creates new ones (the route dispatches to the Planner), and
// acts on existing ones — complete, reprioritize, reschedule — when asked.
// Self-contained and additive — it doesn't touch the task list/sign-in flows.
export function ChatSidebar() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(0)
  // The assistant message currently streaming in from the server.
  const [streamingId, setStreamingId] = useState<number | null>(null)

  // Restore the conversation from a previous visit (kept on this device only).
  useEffect(() => {
    try {
      const raw = localStorage.getItem('taskagent:chat')
      if (raw) {
        const saved = JSON.parse(raw) as Msg[]
        if (Array.isArray(saved) && saved.length) {
          setMessages(saved)
          idRef.current = saved.reduce((mx, m) => Math.max(mx, m.id), 0)
        }
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, [])

  // Persist the last 50 messages whenever they change.
  useEffect(() => {
    localStorage.setItem('taskagent:chat', JSON.stringify(messages.slice(-50)))
  }, [messages])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, sending, open, streamingId])

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

      // Non-stream responses are errors (401/429/400) — show them as a bubble.
      if (!res.ok || !res.headers.get('content-type')?.includes('text/event-stream')) {
        const data = await res.json().catch(() => null)
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

      // Read the SSE stream: deltas grow the bubble live; "done" carries the
      // side effects (created task / applied actions).
      const aid = ++idRef.current
      setMessages((m) => [...m, { id: aid, role: 'assistant', content: '' }])
      setStreamingId(aid)
      const setContent = (content: string) =>
        setMessages((m) => m.map((msg) => (msg.id === aid ? { ...msg, content } : msg)))

      type StreamEvent = {
        type: string
        text?: string
        error?: string
        reply?: string
        createdTask?: { title: string }
        actions?: { title: string }[]
      }
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      let acc = ''
      let final: StreamEvent | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += decoder.decode(value, { stream: true })
        const events = buf.split('\n\n')
        buf = events.pop() ?? ''
        for (const evt of events) {
          const line = evt.split('\n').find((l) => l.startsWith('data: '))
          if (!line) continue
          let payload: StreamEvent
          try {
            payload = JSON.parse(line.slice(6))
          } catch {
            continue
          }
          if (payload.type === 'delta' && payload.text) {
            acc += payload.text
            setContent(acc)
          } else if (payload.type === 'done') {
            final = payload
          } else if (payload.type === 'error') {
            acc = payload.error ?? 'Something went wrong. Try again.'
            setContent(acc)
          }
        }
      }

      if (final) {
        if (final.reply && final.reply !== acc) setContent(final.reply)
        if (final.createdTask) {
          toast.success(`Created “${final.createdTask.title}”`)
          router.refresh()
        }
        if (final.actions?.length) {
          toast.success(
            final.actions.length === 1
              ? `Updated “${final.actions[0].title}”`
              : `Updated ${final.actions.length} tasks`,
          )
          router.refresh()
        }
      }
    } catch {
      setMessages((m) => [
        ...m,
        { id: ++idRef.current, role: 'assistant', content: 'Network error — please try again.' },
      ])
    } finally {
      setSending(false)
      setStreamingId(null)
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
            {messages.length > 0 ? (
              <button
                type="button"
                onClick={() => {
                  setMessages([])
                  localStorage.removeItem('taskagent:chat')
                }}
                className="ml-auto text-[11px] text-white/40 hover:text-white/70"
              >
                Clear
              </button>
            ) : (
              <span className="ml-auto text-[11px] text-white/35">Ask, create, or act</span>
            )}
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-white/55">
                  Ask about your tasks, plan something new, or tell me to complete, reprioritize, or
                  reschedule them.
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
              const streaming = streamingId === m.id
              const content = m.content
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
                    {m.role === 'assistant' && !streaming ? (
                      <Markdown content={content} />
                    ) : (
                      <>
                        {content}
                        {streaming && <span className="ml-px animate-pulse text-white/50">▍</span>}
                      </>
                    )}
                  </div>
                </div>
              )
            })}

            {sending && streamingId === null && (
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
