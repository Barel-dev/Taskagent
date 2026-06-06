import type { TaskNodeUI } from '@/components/task-list'

// 'ALL' means no priority filter; otherwise match a single priority.
export type PriorityFilter = 'ALL' | TaskNodeUI['priority']

export type TaskFilter = {
  query?: string
  priority?: PriorityFilter
}

/**
 * Pure, client-side filter for the task list/board. Matches `query`
 * case-insensitively against the title and description, and narrows by a single
 * priority when one is selected. Kept pure (no I/O) so it's unit-testable.
 */
export function filterTasks<T extends Pick<TaskNodeUI, 'title' | 'description' | 'priority'>>(
  tasks: T[],
  { query = '', priority = 'ALL' }: TaskFilter = {},
): T[] {
  const q = query.trim().toLowerCase()
  return tasks.filter((t) => {
    if (priority !== 'ALL' && t.priority !== priority) return false
    if (!q) return true
    const haystack = `${t.title} ${t.description ?? ''}`.toLowerCase()
    return haystack.includes(q)
  })
}
