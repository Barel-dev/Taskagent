import { tagChipClass } from '@/lib/tag-colors'

export type TagUI = { id: string; name: string; color: string }

/** Renders a task's tags as small colored chips. */
export function TagChips({ tags, className = '' }: { tags?: TagUI[]; className?: string }) {
  if (!tags || tags.length === 0) return null
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map((t) => (
        <span
          key={t.id}
          className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${tagChipClass(t.color)}`}
        >
          {t.name}
        </span>
      ))}
    </div>
  )
}
