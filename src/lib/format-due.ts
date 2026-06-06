// Turns a due date into a short, human-relative label ("Today", "Tomorrow",
// "2d overdue", "in 3d", or an absolute date when further out) plus flags the
// UI uses to color it. Pure and client-safe.

export type DueInfo = {
  label: string
  /** Past due and not done — surface in red. */
  overdue: boolean
  /** Due today or within ~2 days and not done — surface in amber. */
  soon: boolean
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

export function formatDue(due: string | Date | null | undefined, status?: string): DueInfo | null {
  if (!due) return null
  const d = new Date(due)
  if (Number.isNaN(d.getTime())) return null

  const days = Math.round((startOfDay(d) - startOfDay(new Date())) / 86_400_000)
  const done = status === 'DONE'

  let label: string
  if (days < 0) label = days === -1 ? '1d overdue' : `${-days}d overdue`
  else if (days === 0) label = 'Today'
  else if (days === 1) label = 'Tomorrow'
  else if (days <= 7) label = `in ${days}d`
  else label = d.toLocaleDateString()

  return {
    label,
    overdue: days < 0 && !done,
    soon: days >= 0 && days <= 2 && !done,
  }
}

/** Tailwind text color for a DueInfo. */
export function dueToneClass(info: DueInfo): string {
  if (info.overdue) return 'text-rose-300'
  if (info.soon) return 'text-amber-300'
  return 'text-white/45'
}
