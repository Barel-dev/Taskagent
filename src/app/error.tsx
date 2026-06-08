'use client'

import Link from 'next/link'
import { RotateCcw } from 'lucide-react'
import { ShaderBackground } from '@/components/ui/shader-background'

// Route-level error boundary — keeps runtime errors on-brand and recoverable.
export default function Error({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center">
      <ShaderBackground opacity={0.35} />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-black/55" />
      <div className="px-6 text-center">
        <p className="text-[11px] font-medium tracking-[0.25em] text-rose-300/70 uppercase">
          Error
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-white/50">
          An unexpected error occurred. You can try again, or head back.
        </p>
        <div className="mt-6 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="btn-accent inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium"
          >
            <RotateCcw className="mr-1.5 h-4 w-4" />
            Try again
          </button>
          <Link
            href="/today"
            className="inline-flex items-center rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white/75 hover:bg-white/5"
          >
            Go to Today
          </Link>
        </div>
      </div>
    </div>
  )
}
