// Natural-language quick-add parser. Turns a single line like
//   "Email Dan tomorrow !high"  →  { title: "Email Dan", priority: "HIGH", dueDate: ... }
// Pure and dependency-free so it's unit-testable and usable on client or server.

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type QuickAdd = {
  title: string
  priority?: Priority
  dueDate?: string // ISO string (UTC midnight of the parsed day)
}

const PRIORITY_WORDS: Record<string, Priority> = {
  urgent: 'URGENT',
  u: 'URGENT',
  high: 'HIGH',
  h: 'HIGH',
  med: 'MEDIUM',
  medium: 'MEDIUM',
  m: 'MEDIUM',
  low: 'LOW',
  l: 'LOW',
}

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const WEEKDAY_ABBR = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

// Format a Date as the same UTC-midnight ISO the task form produces.
function isoDay(d: Date): string {
  const ymd = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  return new Date(ymd).toISOString()
}
function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Days until the next occurrence of a weekday (0=Sun..6=Sat). Same weekday as
// today resolves to a week ahead, never "today".
function daysUntilWeekday(target: number, from: Date): number {
  const diff = (target - from.getDay() + 7) % 7
  return diff === 0 ? 7 : diff
}

export function parseQuickAdd(input: string, now: Date = new Date()): QuickAdd {
  let text = ` ${input} `
  let priority: Priority | undefined
  let dueDate: string | undefined

  // Priority: !high, !urgent, !m, …
  text = text.replace(/\s!(urgent|high|medium|med|low|u|h|m|l)\b/i, (_m, word: string) => {
    priority = PRIORITY_WORDS[word.toLowerCase()]
    return ' '
  })

  function setDue(d: Date) {
    if (!dueDate) dueDate = isoDay(d)
  }
  const addDays = (n: number) => {
    const d = new Date(now)
    d.setDate(d.getDate() + n)
    return d
  }

  // Explicit ISO date.
  text = text.replace(/\s(\d{4}-\d{2}-\d{2})\b/, (_m, ymd: string) => {
    const d = new Date(ymd)
    if (!isNaN(d.getTime())) setDue(d)
    return ' '
  })
  // today / tonight
  text = text.replace(/\s(today|tonight)\b/i, () => {
    setDue(now)
    return ' '
  })
  // tomorrow
  text = text.replace(/\stomorrow\b/i, () => {
    setDue(addDays(1))
    return ' '
  })
  // in N days
  text = text.replace(/\sin\s+(\d+)\s+days?\b/i, (_m, n: string) => {
    setDue(addDays(parseInt(n, 10)))
    return ' '
  })
  // next week
  text = text.replace(/\snext\s+week\b/i, () => {
    setDue(addDays(7))
    return ' '
  })
  // [next] weekday
  text = text.replace(
    /\s(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|wed|thu|fri|sat)\b/i,
    (_m, next: string | undefined, dayWord: string) => {
      const w = dayWord.toLowerCase()
      const idx = WEEKDAYS.indexOf(w) >= 0 ? WEEKDAYS.indexOf(w) : WEEKDAY_ABBR.indexOf(w)
      if (idx < 0) return _m
      let days = daysUntilWeekday(idx, now)
      if (next) days += 7
      setDue(addDays(days))
      return ' '
    },
  )

  const title = text.replace(/\s+/g, ' ').trim()
  // Never return an empty title — fall back to the raw input.
  return { title: title || input.trim(), priority, dueDate }
}
