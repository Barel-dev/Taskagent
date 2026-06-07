import { type ReactNode } from 'react'

// Wrap occurrences of `query` (case-insensitive) within `text` in a highlight
// mark. Pure — builds React text nodes, no innerHTML.
export function Highlighted({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (!q) return <>{text}</>
  const lower = text.toLowerCase()
  const ql = q.toLowerCase()
  if (!lower.includes(ql)) return <>{text}</>

  const parts: ReactNode[] = []
  let i = 0
  let k = 0
  while (i < text.length) {
    const found = lower.indexOf(ql, i)
    if (found < 0) {
      parts.push(text.slice(i))
      break
    }
    if (found > i) parts.push(text.slice(i, found))
    parts.push(
      <mark key={k++} className="rounded bg-violet-400/30 text-white">
        {text.slice(found, found + q.length)}
      </mark>,
    )
    i = found + q.length
  }
  return <>{parts}</>
}
