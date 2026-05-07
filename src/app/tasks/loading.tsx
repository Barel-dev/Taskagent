export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <div className="bg-muted h-8 w-32 animate-pulse rounded" />
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-muted h-20 animate-pulse rounded" />
        ))}
      </div>
    </div>
  )
}
