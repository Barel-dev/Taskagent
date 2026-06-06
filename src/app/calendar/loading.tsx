export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10">
      <div className="flex items-center justify-between">
        <div className="h-9 w-44 animate-pulse rounded bg-white/10" />
        <div className="h-9 w-56 animate-pulse rounded bg-white/[0.06]" />
      </div>
      <div className="h-[60vh] animate-pulse rounded-2xl bg-white/[0.04]" />
    </div>
  )
}
