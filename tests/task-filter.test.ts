import { describe, expect, it } from 'vitest'
import { filterTasks, sortTasks } from '@/lib/task-filter'

type T = {
  title: string
  description: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate: string | null
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
}

const tasks: T[] = [
  {
    title: 'Plan trip to Lisbon',
    description: 'flights and hotel',
    priority: 'HIGH',
    dueDate: null,
    status: 'TODO',
  },
  { title: 'Write report', description: null, priority: 'MEDIUM', dueDate: null, status: 'TODO' },
  {
    title: 'Buy groceries',
    description: 'Milk and EGGS',
    priority: 'LOW',
    dueDate: null,
    status: 'TODO',
  },
]

describe('filterTasks', () => {
  it('returns everything with no filters', () => {
    expect(filterTasks(tasks)).toHaveLength(3)
    expect(filterTasks(tasks, { query: '', priority: 'ALL' })).toHaveLength(3)
  })

  it('matches the query against the title (case-insensitive)', () => {
    const result = filterTasks(tasks, { query: 'lisbon' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Plan trip to Lisbon')
  })

  it('matches the query against the description (case-insensitive)', () => {
    const result = filterTasks(tasks, { query: 'eggs' })
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('Buy groceries')
  })

  it('handles a null description without matching', () => {
    expect(filterTasks(tasks, { query: 'flights' })).toHaveLength(1)
  })

  it('narrows by priority', () => {
    const result = filterTasks(tasks, { priority: 'HIGH' })
    expect(result).toHaveLength(1)
    expect(result[0].priority).toBe('HIGH')
  })

  it('combines query and priority', () => {
    expect(filterTasks(tasks, { query: 'report', priority: 'HIGH' })).toHaveLength(0)
    expect(filterTasks(tasks, { query: 'report', priority: 'MEDIUM' })).toHaveLength(1)
  })
})

describe('sortTasks', () => {
  it('keeps the original order for "default" (and does not mutate)', () => {
    const result = sortTasks(tasks, 'default')
    expect(result.map((t) => t.title)).toEqual([
      'Plan trip to Lisbon',
      'Write report',
      'Buy groceries',
    ])
  })

  it('sorts by title A–Z', () => {
    expect(sortTasks(tasks, 'title').map((t) => t.title)).toEqual([
      'Buy groceries',
      'Plan trip to Lisbon',
      'Write report',
    ])
  })

  it('sorts by priority (urgent first)', () => {
    expect(sortTasks(tasks, 'priority').map((t) => t.priority)).toEqual(['HIGH', 'MEDIUM', 'LOW'])
  })

  it('sorts by due date with undated last', () => {
    const dated: T[] = [
      { title: 'b', description: null, priority: 'LOW', dueDate: '2026-06-10', status: 'TODO' },
      { title: 'a', description: null, priority: 'LOW', dueDate: null, status: 'TODO' },
      { title: 'c', description: null, priority: 'LOW', dueDate: '2026-06-08', status: 'TODO' },
    ]
    expect(sortTasks(dated, 'due').map((t) => t.title)).toEqual(['c', 'b', 'a'])
  })

  it('does not mutate the input array', () => {
    const input = [...tasks]
    sortTasks(input, 'title')
    expect(input.map((t) => t.title)).toEqual([
      'Plan trip to Lisbon',
      'Write report',
      'Buy groceries',
    ])
  })
})

describe('sortTasks manual', () => {
  it('orders by the saved order field', () => {
    const items: (T & { order: number })[] = [
      { title: 'a', description: null, priority: 'LOW', dueDate: null, status: 'TODO', order: 2 },
      { title: 'b', description: null, priority: 'LOW', dueDate: null, status: 'TODO', order: 0 },
      { title: 'c', description: null, priority: 'LOW', dueDate: null, status: 'TODO', order: 1 },
    ]
    expect(sortTasks(items, 'manual').map((t) => t.title)).toEqual(['b', 'c', 'a'])
  })
})

describe('filterTasks by tag', () => {
  type TT = T & { tags?: { id: string; name: string; color: string }[] }
  const work = { id: 'w', name: 'work', color: 'sky' }
  const items: TT[] = [
    {
      title: 'tagged',
      description: null,
      priority: 'LOW',
      dueDate: null,
      status: 'TODO',
      tags: [work],
    },
    { title: 'untagged', description: null, priority: 'LOW', dueDate: null, status: 'TODO' },
  ]
  it('requires the selected tag', () => {
    expect(filterTasks(items, { tagId: 'w' }).map((t) => t.title)).toEqual(['tagged'])
  })
  it("'ALL' keeps everything", () => {
    expect(filterTasks(items, { tagId: 'ALL' })).toHaveLength(2)
  })
})

describe('filterTasks due window', () => {
  const dayOffset = (n: number) => {
    const d = new Date()
    d.setDate(d.getDate() + n)
    return d.toISOString()
  }

  it('overdue includes only past-due, not-done, dated tasks', () => {
    const items: T[] = [
      { title: 'past', description: null, priority: 'LOW', dueDate: '2020-01-01', status: 'TODO' },
      {
        title: 'past-done',
        description: null,
        priority: 'LOW',
        dueDate: '2020-01-01',
        status: 'DONE',
      },
      { title: 'none', description: null, priority: 'LOW', dueDate: null, status: 'TODO' },
    ]
    expect(filterTasks(items, { due: 'overdue' }).map((t) => t.title)).toEqual(['past'])
  })

  it('today matches only tasks due today', () => {
    const items: T[] = [
      { title: 'today', description: null, priority: 'LOW', dueDate: dayOffset(0), status: 'TODO' },
      { title: 'later', description: null, priority: 'LOW', dueDate: dayOffset(3), status: 'TODO' },
    ]
    expect(filterTasks(items, { due: 'today' }).map((t) => t.title)).toEqual(['today'])
  })

  it('week matches today through 7 days out, excluding past', () => {
    const items: T[] = [
      { title: 'in3', description: null, priority: 'LOW', dueDate: dayOffset(3), status: 'TODO' },
      { title: 'in10', description: null, priority: 'LOW', dueDate: dayOffset(10), status: 'TODO' },
      { title: 'past', description: null, priority: 'LOW', dueDate: dayOffset(-1), status: 'TODO' },
    ]
    expect(filterTasks(items, { due: 'week' }).map((t) => t.title)).toEqual(['in3'])
  })
})
