export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
      <div className="h-9 w-56 animate-pulse rounded bg-white/10" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-white/[0.04]" />
        ))}
      </div>
      <div className="h-40 animate-pulse rounded-2xl bg-white/[0.04]" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl bg-white/[0.04]" />
        <div className="h-56 animate-pulse rounded-2xl bg-white/[0.04]" />
      </div>
    </div>
  )
}
