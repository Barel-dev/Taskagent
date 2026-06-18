import { describe, expect, it, vi, beforeEach } from 'vitest'

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))
vi.mock('@/lib/gemini', () => ({
  getGemini: () => ({ models: { generateContent: createMock } }),
  GEMINI_MODEL: 'gemini-2.5-flash',
}))

import { runRefineAgent } from '@/lib/agents/refine'
import { createTaskForUser } from '@/lib/tasks'
import { prisma } from '@/lib/prisma'
import { createTestUser } from '../helpers'

beforeEach(() => {
  createMock.mockReset()
})

describe('refine agent', () => {
  it('returns a refined title, description, and acceptance criteria and logs a REFINE run', async () => {
    const user = await createTestUser({ email: 'refine@x.com' })
    const task = await createTaskForUser(user.id, { title: 'landing' })
    createMock.mockResolvedValue({
      text: JSON.stringify({
        title: 'Ship the marketing landing page',
        description: 'Build and deploy the public landing page.',
        acceptanceCriteria: ['Page is live at the domain', 'Lighthouse performance > 90'],
      }),
      usageMetadata: { totalTokenCount: 110 },
    })

    const result = await runRefineAgent({ userId: user.id, task })
    expect(result.title).toBe('Ship the marketing landing page')
    expect(result.acceptanceCriteria).toHaveLength(2)

    const run = await prisma.agentRun.findFirst({ where: { userId: user.id, agentType: 'REFINE' } })
    expect(run?.status).toBe('SUCCESS')
    expect(run?.tokensUsed).toBe(110)
  })

  it('demo mode returns a placeholder without calling Gemini', async () => {
    const user = await createTestUser({ email: 'refine-demo@x.com' })
    const task = await createTaskForUser(user.id, { title: 'vague task' })

    const result = await runRefineAgent({ userId: user.id, task, demo: true })
    expect(createMock).not.toHaveBeenCalled()
    expect(result.title.length).toBeGreaterThan(0)
    expect(result.acceptanceCriteria.length).toBeGreaterThan(0)
  })

  it('rejects malformed output and records an ERROR run', async () => {
    const user = await createTestUser({ email: 'refine-bad@x.com' })
    const task = await createTaskForUser(user.id, { title: 'x' })
    createMock.mockResolvedValue({
      text: JSON.stringify({ title: '', description: '', acceptanceCriteria: [] }),
    })
    await expect(runRefineAgent({ userId: user.id, task })).rejects.toBeTruthy()

    const run = await prisma.agentRun.findFirst({ where: { userId: user.id, agentType: 'REFINE' } })
    expect(run?.status).toBe('ERROR')
  })
})
