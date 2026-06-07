import { describe, expect, it } from 'vitest'
import { parseQuickAdd } from '@/lib/quick-add'

// A fixed reference point: Wednesday 2026-06-10 (local).
const NOW = new Date(2026, 5, 10, 9, 0, 0)
const day = (iso: string | undefined) => iso?.slice(0, 10)

describe('parseQuickAdd', () => {
  it('returns the plain title when there are no tokens', () => {
    const r = parseQuickAdd('Buy groceries', NOW)
    expect(r.title).toBe('Buy groceries')
    expect(r.priority).toBeUndefined()
    expect(r.dueDate).toBeUndefined()
  })

  it('parses a priority token and strips it from the title', () => {
    const r = parseQuickAdd('Finish report !high', NOW)
    expect(r.title).toBe('Finish report')
    expect(r.priority).toBe('HIGH')
  })

  it('supports priority shorthands', () => {
    expect(parseQuickAdd('x !u', NOW).priority).toBe('URGENT')
    expect(parseQuickAdd('x !m', NOW).priority).toBe('MEDIUM')
    expect(parseQuickAdd('x !l', NOW).priority).toBe('LOW')
  })

  it('parses "today" and "tomorrow"', () => {
    expect(day(parseQuickAdd('Call bank today', NOW).dueDate)).toBe('2026-06-10')
    expect(day(parseQuickAdd('Call bank tomorrow', NOW).dueDate)).toBe('2026-06-11')
  })

  it('parses an explicit ISO date', () => {
    const r = parseQuickAdd('Submit taxes 2026-07-01', NOW)
    expect(r.title).toBe('Submit taxes')
    expect(day(r.dueDate)).toBe('2026-07-01')
  })

  it('parses "in N days" and "next week"', () => {
    expect(day(parseQuickAdd('Ping Sam in 3 days', NOW).dueDate)).toBe('2026-06-13')
    expect(day(parseQuickAdd('Review next week', NOW).dueDate)).toBe('2026-06-17')
  })

  it('parses the next occurrence of a weekday', () => {
    // From Wed 2026-06-10, the next Friday is the 12th.
    expect(day(parseQuickAdd('Demo friday', NOW).dueDate)).toBe('2026-06-12')
    // Same weekday resolves to a week ahead, not today.
    expect(day(parseQuickAdd('Standup wednesday', NOW).dueDate)).toBe('2026-06-17')
    // "next" pushes another week.
    expect(day(parseQuickAdd('Demo next friday', NOW).dueDate)).toBe('2026-06-19')
  })

  it('combines priority and date and keeps the rest as the title', () => {
    const r = parseQuickAdd('Email Dan tomorrow !high', NOW)
    expect(r.title).toBe('Email Dan')
    expect(r.priority).toBe('HIGH')
    expect(day(r.dueDate)).toBe('2026-06-11')
  })

  it('never returns an empty title', () => {
    const r = parseQuickAdd('tomorrow', NOW)
    expect(r.title.length).toBeGreaterThan(0)
  })
})
