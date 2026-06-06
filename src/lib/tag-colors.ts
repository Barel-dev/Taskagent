// Shared tag color palette. The DB stores a color *key* (e.g. "violet"); the UI
// maps it to static Tailwind classes (Tailwind can't generate fully dynamic
// class names, so the mapping must be explicit). New tags get a color by cycling
// through this palette on the server.

export const TAG_COLORS = ['violet', 'sky', 'amber', 'emerald', 'rose', 'slate'] as const
export type TagColor = (typeof TAG_COLORS)[number]

const TAG_CHIP_CLASS: Record<string, string> = {
  violet: 'border-violet-400/30 bg-violet-500/15 text-violet-200',
  sky: 'border-sky-400/30 bg-sky-500/15 text-sky-200',
  amber: 'border-amber-400/30 bg-amber-500/15 text-amber-200',
  emerald: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-200',
  rose: 'border-rose-400/30 bg-rose-500/15 text-rose-200',
  slate: 'border-slate-400/30 bg-slate-500/15 text-slate-200',
}

export function tagChipClass(color: string): string {
  return TAG_CHIP_CLASS[color] ?? TAG_CHIP_CLASS.violet
}
