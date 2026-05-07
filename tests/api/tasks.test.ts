import { describe, expect, it } from 'vitest'
import {
  listTasksForUser,
  createTaskForUser,
  getTaskForUser,
  updateTaskForUser,
  deleteTaskForUser,
} from '@/lib/tasks'
import { createTestUser } from '../helpers'

describe('task data layer', () => {
  it('lists only the requesting user’s tasks', async () => {
    const alice = await createTestUser({ email: 'alice@x.com' })
    const bob = await createTestUser({ email: 'bob@x.com' })
    await createTaskForUser(alice.id, { title: 'A1' })
    await createTaskForUser(bob.id, { title: 'B1' })

    const aliceTasks = await listTasksForUser(alice.id)
    expect(aliceTasks).toHaveLength(1)
    expect(aliceTasks[0].title).toBe('A1')
  })

  it('creates a task with defaults', async () => {
    const u = await createTestUser()
    const task = await createTaskForUser(u.id, { title: 'Buy milk' })
    expect(task.status).toBe('TODO')
    expect(task.priority).toBe('MEDIUM')
    expect(task.userId).toBe(u.id)
  })

  it('updates only owned tasks', async () => {
    const alice = await createTestUser({ email: 'alice2@x.com' })
    const bob = await createTestUser({ email: 'bob2@x.com' })
    const t = await createTaskForUser(alice.id, { title: 'private' })

    const result = await updateTaskForUser(bob.id, t.id, { title: 'hacked' })
    expect(result).toBeNull()

    const stillThere = await getTaskForUser(alice.id, t.id)
    expect(stillThere?.title).toBe('private')
  })

  it('deletes only owned tasks', async () => {
    const alice = await createTestUser({ email: 'alice3@x.com' })
    const bob = await createTestUser({ email: 'bob3@x.com' })
    const t = await createTaskForUser(alice.id, { title: 'mine' })

    expect(await deleteTaskForUser(bob.id, t.id)).toBe(false)
    expect(await deleteTaskForUser(alice.id, t.id)).toBe(true)
    expect(await getTaskForUser(alice.id, t.id)).toBeNull()
  })
})
