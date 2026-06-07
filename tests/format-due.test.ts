import { describe, expect, it } from 'vitest'
import { formatDue, dueToneClass } from '@/lib/format-due'

function dayOffset(n: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

describe('formatDue', () => {
  it('returns null for missing or invalid dates', () => {
    expect(formatDue(null)).toBeNull()
    expect(formatDue(undefined)).toBeNull()
    expect(formatDue('not-a-date')).toBeNull()
  })

  it('labels today, tomorrow, and near future', () => {
    expect(formatDue(dayOffset(0))?.label).toBe('Today')
    expect(formatDue(dayOffset(1))?.label).toBe('Tomorrow')
    expect(formatDue(dayOffset(3))?.label).toBe('in 3d')
  })

  it('labels overdue with a day count', () => {
    expect(formatDue(dayOffset(-1))?.label).toBe('1d overdue')
    expect(formatDue(dayOffset(-2))?.label).toBe('2d overdue')
  })

  it('flags overdue and soon for not-done tasks', () => {
    const overdue = formatDue(dayOffset(-2))
    expect(overdue?.overdue).toBe(true)
    expect(overdue?.soon).toBe(false)

    const soon = formatDue(dayOffset(1))
    expect(soon?.soon).toBe(true)
    expect(soon?.overdue).toBe(false)
  })

  it('never flags a DONE task as overdue or soon', () => {
    const info = formatDue(dayOffset(-2), 'DONE')
    expect(info?.overdue).toBe(false)
    expect(info?.soon).toBe(false)
  })
})

describe('dueToneClass', () => {
  it('maps overdue to rose and soon to amber', () => {
    expect(dueToneClass({ label: 'x', overdue: true, soon: false })).toContain('rose')
    expect(dueToneClass({ label: 'x', overdue: false, soon: true })).toContain('amber')
    expect(dueToneClass({ label: 'x', overdue: false, soon: false })).toContain('white')
  })
})
