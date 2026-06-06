import { describe, expect, it } from 'vitest'
import { filterTasks } from '@/lib/task-filter'

type T = {
  title: string
  description: string | null
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}

const tasks: T[] = [
  { title: 'Plan trip to Lisbon', description: 'flights and hotel', priority: 'HIGH' },
  { title: 'Write report', description: null, priority: 'MEDIUM' },
  { title: 'Buy groceries', description: 'Milk and EGGS', priority: 'LOW' },
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
