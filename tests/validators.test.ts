import { describe, expect, it } from 'vitest'
import { createTaskSchema, updateTaskSchema } from '@/lib/validators'

describe('createTaskSchema', () => {
  it('accepts a minimal valid task', () => {
    const result = createTaskSchema.safeParse({ title: 'Buy milk' })
    expect(result.success).toBe(true)
  })

  it('rejects empty title', () => {
    const result = createTaskSchema.safeParse({ title: '' })
    expect(result.success).toBe(false)
  })

  it('rejects title longer than 200 chars', () => {
    const result = createTaskSchema.safeParse({ title: 'a'.repeat(201) })
    expect(result.success).toBe(false)
  })

  it('coerces ISO date string for dueDate', () => {
    const result = createTaskSchema.safeParse({
      title: 'Submit report',
      dueDate: '2026-06-01T10:00:00Z',
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.dueDate).toBeInstanceOf(Date)
  })

  it('rejects invalid status', () => {
    const result = createTaskSchema.safeParse({ title: 'x', status: 'BOGUS' })
    expect(result.success).toBe(false)
  })
})

describe('updateTaskSchema', () => {
  it('accepts partial updates', () => {
    const result = updateTaskSchema.safeParse({ status: 'DONE' })
    expect(result.success).toBe(true)
  })

  it('rejects empty object', () => {
    const result = updateTaskSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})
