import type { TaskNodeUI } from '@/components/task-list'

// 'ALL' means no priority filter; otherwise match a single priority.
export type PriorityFilter = 'ALL' | TaskNodeUI['priority']

export type TaskFilter = {
  query?: string
  priority?: PriorityFilter
  /** 'ALL' (or omitted) means no tag filter; otherwise a tag id to require. */
  tagId?: string
}

/**
 * Pure, client-side filter for the task list/board. Matches `query`
 * case-insensitively against the title and description, narrows by a single
 * priority, and requires a tag when one is selected. Kept pure (no I/O) so it's
 * unit-testable.
 */
export function filterTasks<
  T extends Pick<TaskNodeUI, 'title' | 'description' | 'priority' | 'tags'>,
>(tasks: T[], { query = '', priority = 'ALL', tagId = 'ALL' }: TaskFilter = {}): T[] {
  const q = query.trim().toLowerCase()
  return tasks.filter((t) => {
    if (priority !== 'ALL' && t.priority !== priority) return false
    if (tagId !== 'ALL' && !t.tags?.some((tag) => tag.id === tagId)) return false
    if (!q) return true
    const haystack = `${t.title} ${t.description ?? ''}`.toLowerCase()
    return haystack.includes(q)
  })
}
