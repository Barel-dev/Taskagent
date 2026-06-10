'use client'

import { useState } from 'react'
import { NotebookPen, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

// Dashboard card: the Weekly Review agent's retro of the last 7 days, with a
// button to (re)generate it on demand.
export function WeeklyReviewCard({ initial }: { initial: string | null }) {
  const [review, setReview] = useState(initial)
  const [loading, setLoading] = useState(false)

  async function generate() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/agents/weekly-review', { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        toast.error(data?.error ?? 'Could not build your weekly review.')
        return
      }
      setReview(data.review)
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <NotebookPen className="h-4 w-4 text-violet-300" />
        <h4 className="text-sm font-semibold text-white/80">Weekly review</h4>
        {review && (
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            aria-label="Refresh weekly review"
            className="ml-auto text-white/35 transition-colors hover:text-white/70 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>

      {review ? (
        <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-white/70">{review}</p>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-white/50">
            A short retro of your last 7 days — wins, what slipped, and a focus for next week.
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
                Reviewing your week…
              </>
            ) : (
              <>
                <NotebookPen className="h-3.5 w-3.5" />
                Run weekly review
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
