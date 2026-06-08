import Link from 'next/link'
import { ShaderBackground } from '@/components/ui/shader-background'

export default function NotFound() {
  return (
    <div className="relative isolate flex min-h-screen items-center justify-center">
      <ShaderBackground opacity={0.35} />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-black/55" />
      <div className="px-6 text-center">
        <p className="text-[11px] font-medium tracking-[0.25em] text-violet-300/70 uppercase">
          404
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Page not found</h1>
        <p className="mt-2 text-sm text-white/50">That page doesn’t exist or has moved.</p>
        <Link
          href="/today"
          className="btn-accent mt-6 inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium"
        >
          Go to Today
        </Link>
      </div>
    </div>
  )
}
