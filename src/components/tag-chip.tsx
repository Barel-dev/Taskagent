import { tagChipClass } from '@/lib/tag-colors'

export type TagUI = { id: string; name: string; color: string }

/** Renders a task's tags as small colored chips. When `onTagClick` is given,
 *  chips become buttons (used to filter by a tag from a task card). */
export function TagChips({
  tags,
  className = '',
  onTagClick,
}: {
  tags?: TagUI[]
  className?: string
  onTagClick?: (id: string) => void
}) {
  if (!tags || tags.length === 0) return null
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map((t) =>
        onTagClick ? (
          <button
            key={t.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onTagClick(t.id)
            }}
            title={`Filter by ${t.name}`}
            className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-80 ${tagChipClass(t.color)}`}
          >
            {t.name}
          </button>
        ) : (
          <span
            key={t.id}
            className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${tagChipClass(t.color)}`}
          >
            {t.name}
          </span>
        ),
      )}
    </div>
  )
}
