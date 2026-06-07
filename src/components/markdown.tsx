import { Fragment, type ReactNode } from 'react'

// A tiny, dependency-free Markdown renderer. It builds React nodes directly
// (never dangerouslySetInnerHTML) so user/agent text can't inject HTML, and
// only http(s)/mailto links are allowed. Supports the common subset: headings,
// bold/italic, inline code, links, bullet/ordered lists, blockquotes, and
// fenced code blocks.
export function Markdown({ content, className = '' }: { content: string; className?: string }) {
  return <div className={`space-y-2 ${className}`}>{renderBlocks(content)}</div>
}

function safeUrl(url: string): string | null {
  const u = url.trim()
  if (/^https?:\/\//i.test(u) || /^mailto:/i.test(u)) return u
  return null
}

// ───────────────────────── Block level ─────────────────────────

function renderBlocks(content: string): ReactNode[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    // Blank line — skip (blocks below handle their own spacing).
    if (line.trim() === '') {
      i++
      continue
    }

    // Fenced code block.
    if (/^```/.test(line.trim())) {
      const code: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i].trim())) {
        code.push(lines[i])
        i++
      }
      i++ // skip closing fence
      blocks.push(
        <pre
          key={key++}
          className="overflow-x-auto rounded-lg bg-black/30 p-3 text-xs text-white/80"
        >
          <code>{code.join('\n')}</code>
        </pre>,
      )
      continue
    }

    // Heading (#, ##, ###).
    const heading = /^(#{1,3})\s+(.*)$/.exec(line)
    if (heading) {
      const level = heading[1].length
      const size = level === 1 ? 'text-base' : level === 2 ? 'text-sm' : 'text-[13px]'
      blocks.push(
        <p key={key++} className={`font-semibold text-white ${size}`}>
          {parseInline(heading[2])}
        </p>,
      )
      i++
      continue
    }

    // Blockquote (consecutive `>` lines).
    if (/^>\s?/.test(line)) {
      const quote: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      blocks.push(
        <blockquote key={key++} className="border-l-2 border-white/20 pl-3 text-white/60 italic">
          {parseInline(quote.join(' '))}
        </blockquote>,
      )
      continue
    }

    // Lists (consecutive bullet or ordered items).
    const listItem = /^\s*([-*+]|\d+\.)\s+(.*)$/.exec(line)
    if (listItem) {
      const ordered = /\d+\./.test(listItem[1])
      const items: string[] = []
      while (i < lines.length) {
        const m = /^\s*([-*+]|\d+\.)\s+(.*)$/.exec(lines[i])
        if (!m) break
        if (/\d+\./.test(m[1]) !== ordered) break
        items.push(m[2])
        i++
      }
      const inner = items.map((it, idx) => <li key={idx}>{parseInline(it)}</li>)
      blocks.push(
        ordered ? (
          <ol key={key++} className="list-decimal space-y-1 pl-5">
            {inner}
          </ol>
        ) : (
          <ul key={key++} className="list-disc space-y-1 pl-5">
            {inner}
          </ul>
        ),
      )
      continue
    }

    // Paragraph — consecutive non-blank, non-special lines (soft breaks kept).
    const para: string[] = []
    while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
      para.push(lines[i])
      i++
    }
    blocks.push(
      <p key={key++} className="leading-relaxed">
        {para.flatMap((p, idx) =>
          idx === 0 ? parseInline(p) : [<br key={`br${idx}`} />, ...parseInline(p)],
        )}
      </p>,
    )
  }

  return blocks
}

function isBlockStart(line: string): boolean {
  return (
    /^```/.test(line.trim()) ||
    /^(#{1,3})\s+/.test(line) ||
    /^>\s?/.test(line) ||
    /^\s*([-*+]|\d+\.)\s+/.test(line)
  )
}

// ───────────────────────── Inline level ─────────────────────────

const INLINE_PATTERNS: {
  re: RegExp
  render: (m: RegExpExecArray, key: number) => ReactNode
}[] = [
  {
    re: /`([^`]+)`/,
    render: (m, key) => (
      <code key={key} className="rounded bg-white/10 px-1 py-0.5 text-[0.85em] text-violet-200">
        {m[1]}
      </code>
    ),
  },
  {
    re: /\[([^\]]+)\]\(([^)\s]+)\)/,
    render: (m, key) => {
      const href = safeUrl(m[2])
      return href ? (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-violet-300 underline underline-offset-2 hover:text-violet-200"
        >
          {parseInline(m[1])}
        </a>
      ) : (
        <Fragment key={key}>{m[0]}</Fragment>
      )
    },
  },
  {
    re: /\*\*([^*]+)\*\*|__([^_]+)__/,
    render: (m, key) => (
      <strong key={key} className="font-semibold text-white">
        {parseInline(m[1] ?? m[2])}
      </strong>
    ),
  },
  {
    re: /\*([^*]+)\*|_([^_]+)_/,
    render: (m, key) => <em key={key}>{parseInline(m[1] ?? m[2])}</em>,
  },
]

function parseInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let rest = text
  let key = 0

  while (rest.length) {
    let best: { index: number; length: number; node: ReactNode } | null = null
    for (const { re, render } of INLINE_PATTERNS) {
      const m = re.exec(rest)
      if (m && (best === null || m.index < best.index)) {
        best = { index: m.index, length: m[0].length, node: render(m, key) }
      }
    }
    if (!best) {
      nodes.push(rest)
      break
    }
    if (best.index > 0) nodes.push(rest.slice(0, best.index))
    nodes.push(best.node)
    key++
    rest = rest.slice(best.index + best.length)
  }

  return nodes
}
