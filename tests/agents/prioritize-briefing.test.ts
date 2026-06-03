import { describe, expect, it, vi, beforeEach } from 'vitest'

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))
vi.mock('@/lib/gemini', () => ({
  getGemini: () => ({ models: { generateContent: createMock } }),
  GEMINI_MODEL: 'gemini-2.5-flash',
}))

import { runPrioritizeAgent } from '@/lib/agents/prioritize'
import { runBriefingAgent } from '@/lib/agents/briefing'
import { createTaskForUser } from '@/lib/tasks'
import { prisma } from '@/lib/prisma'
import { createTestUser } from '../helpers'

beforeEach(() => {
  createMock.mockReset()
})

describe('prioritizer agent', () => {
  it('reassigns task priorities and logs a PRIORITIZER run', async () => {
    const user = await createTestUser({ email: 'prio@x.com' })
    const t1 = await createTaskForUser(user.id, { title: 'Low thing', priority: 'HIGH' })
    const t2 = await createTaskForUser(user.id, { title: 'Due tomorrow', priority: 'LOW' })

    createMock.mockResolvedValue({
      text: JSON.stringify({
        rationale: 'The deadline task comes first.',
        tasks: [
          { id: t1.id, priority: 'LOW' },
          { id: t2.id, priority: 'URGENT' },
        ],
      }),
      usageMetadata: { totalTokenCount: 70 },
    })

    const { rationale, updated, agentRunId } = await runPrioritizeAgent({ userId: user.id })
    expect(updated).toBe(2)
    expect(rationale).toContain('deadline')

    expect((await prisma.task.findUnique({ where: { id: t1.id } }))?.priority).toBe('LOW')
    expect((await prisma.task.findUnique({ where: { id: t2.id } }))?.priority).toBe('URGENT')

    const run = await prisma.agentRun.findUnique({ where: { id: agentRunId } })
    expect(run?.status).toBe('SUCCESS')
    expect(run?.agentType).toBe('PRIORITIZER')
  })
})

describe('briefing agent', () => {
  it('produces a briefing across the user’s tasks and logs a BRIEFING run', async () => {
    const user = await createTestUser({ email: 'brief@x.com' })
    await createTaskForUser(user.id, { title: 'Ship the deploy' })
    createMock.mockResolvedValue({
      text: 'Focus on shipping the deploy today.',
      usageMetadata: { totalTokenCount: 40 },
    })

    const { briefing, agentRunId } = await runBriefingAgent({ userId: user.id })
    expect(briefing).toContain('Focus')

    // The task list was passed to the model
    const prompt = createMock.mock.calls[0][0].contents as string
    expect(prompt).toContain('Ship the deploy')

    const run = await prisma.agentRun.findUnique({ where: { id: agentRunId } })
    expect(run?.status).toBe('SUCCESS')
    expect(run?.agentType).toBe('BRIEFING')
  })
})
