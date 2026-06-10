import type { TaskNodeUI } from '@/components/task-list'

// 'ALL' means no priority filter; otherwise match a single priority.
export type PriorityFilter = 'ALL' | TaskNodeUI['priority']

// Due-window filter. Overdue/today/week all exclude completed tasks.
export type DueFilter = 'ALL' | 'overdue' | 'today' | 'week'

export type TaskFilter = {
  query?: string
  priority?: PriorityFilter
  /** 'ALL' (or omitted) means no tag filter; otherwise a tag id to require. */
  tagId?: string
  due?: DueFilter
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

/**
 * Pure, client-side filter for the task list/board. Matches `query`
 * case-insensitively against the title, description, and any agent result or
 * summary text on the task, narrows by a single priority, and requires a tag
 * when one is selected. Kept pure (no I/O) so it's unit-testable.
 */
export function filterTasks<
  T extends Pick<
    TaskNodeUI,
    'title' | 'description' | 'priority' | 'tags' | 'dueDate' | 'status'
  > & { result?: string | null; summary?: string | null },
>(tasks: T[], { query = '', priority = 'ALL', tagId = 'ALL', due = 'ALL' }: TaskFilter = {}): T[] {
  const q = query.trim().toLowerCase()
  const todayStart = startOfDay(new Date())
  return tasks.filter((t) => {
    if (priority !== 'ALL' && t.priority !== priority) return false
    if (tagId !== 'ALL' && !t.tags?.some((tag) => tag.id === tagId)) return false
    if (due !== 'ALL') {
      if (!t.dueDate || t.status === 'DONE') return false
      const diff = Math.round((startOfDay(new Date(t.dueDate)) - todayStart) / 86_400_000)
      if (due === 'overdue' && diff >= 0) return false
      if (due === 'today' && diff !== 0) return false
      if (due === 'week' && (diff < 0 || diff > 7)) return false
    }
    if (!q) return true
    const haystack =
      `${t.title} ${t.description ?? ''} ${t.result ?? ''} ${t.summary ?? ''}`.toLowerCase()
    return haystack.includes(q)
  })
}

// 'default' keeps the server order (open first, then due date, then newest).
// 'manual' uses each task's saved `order` (drag-to-reorder).
export type SortKey = 'default' | 'due' | 'priority' | 'title' | 'manual'

const PRIORITY_RANK: Record<TaskNodeUI['priority'], number> = {
  URGENT: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
}

/** Pure, non-mutating sort of tasks by the chosen key. */
export function sortTasks<
  T extends Pick<TaskNodeUI, 'title' | 'priority' | 'dueDate'> & { order?: number },
>(tasks: T[], key: SortKey = 'default'): T[] {
  if (key === 'default') return tasks
  const copy = [...tasks]
  if (key === 'manual') return copy.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
  if (key === 'title') return copy.sort((a, b) => a.title.localeCompare(b.title))
  if (key === 'priority') {
    return copy.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
  }
  // 'due' — earliest first, undated tasks last.
  return copy.sort((a, b) => {
    const at = a.dueDate ? new Date(a.dueDate).getTime() : Infinity
    const bt = b.dueDate ? new Date(b.dueDate).getTime() : Infinity
    return at - bt
  })
}
