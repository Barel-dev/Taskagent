'use client'

import { useState } from 'react'
import { Sparkles, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

// The daily-briefing card on the Today page. Shows the briefing the morning
// cron generated; before the first run (or to refresh it) the user can
// generate one on demand via the Briefing agent.
export function BriefingCard({ initial }: { initial: string | null }) {
  const [briefing, setBriefing] = useState(initial)
  const [loading, setLoading] = useState(false)

  async function generate() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/agents/briefing', { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? 'Could not build a briefing. Please try again.')
        return
      }
      setBriefing(data.briefing)
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="tl-rise rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.09] to-transparent p-5">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-violet-300" />
        <h3 className="text-sm font-semibold text-white/85">Morning briefing</h3>
        {briefing && (
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            aria-label="Refresh briefing"
            className="ml-auto text-white/35 transition-colors hover:text-white/70 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {briefing ? (
        <p className="mt-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white/75">
          {briefing}
        </p>
      ) : (
        <div className="mt-2.5">
          <p className="text-sm text-white/55">
            Your agent writes a short brief each morning — what to focus on, what’s urgent, and what
            can wait.
          </p>
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-violet-400/30 bg-violet-500/15 px-3 py-1.5 text-xs font-medium text-violet-200 transition-colors hover:bg-violet-500/25 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Writing your brief…
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                Brief me now
              </>
            )}
          </button>
        </div>
      )}
    </section>
  )
}
