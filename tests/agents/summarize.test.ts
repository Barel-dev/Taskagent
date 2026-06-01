import { describe, expect, it, vi, beforeEach } from 'vitest'

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))
vi.mock('@/lib/gemini', () => ({
  getGemini: () => ({ models: { generateContent: createMock } }),
  GEMINI_MODEL: 'gemini-2.5-flash',
}))

import { runSummarizeAgent } from '@/lib/agents/summarize'
import { createTaskForUser } from '@/lib/tasks'
import { prisma } from '@/lib/prisma'
import { createTestUser } from '../helpers'

beforeEach(() => {
  createMock.mockReset()
})

describe('summarize agent', () => {
  it('summarizes a plan, includes subtask results in the prompt, and persists the summary', async () => {
    const user = await createTestUser({ email: 'sum@x.com' })
    const parent = await createTaskForUser(user.id, { title: 'plan a trip to Lisbon' })
    await prisma.task.create({
      data: {
        userId: user.id,
        parentId: parent.id,
        title: 'Book flights',
        result: 'TAP flight found for $420 round trip',
      },
    })
    createMock.mockResolvedValue({
      text: 'Plan is underway. Flights found (~$420). Next: book a hotel.',
      usageMetadata: { totalTokenCount: 90 },
    })

    const { summary, agentRunId } = await runSummarizeAgent({ userId: user.id, taskId: parent.id })

    expect(summary).toContain('Flights')

    // The subtask result was given to the model as context
    const prompt = createMock.mock.calls[0][0].contents as string
    expect(prompt).toContain('Book flights')
    expect(prompt).toContain('$420')

    // Summary persisted on the parent
    const saved = await prisma.task.findUnique({ where: { id: parent.id } })
    expect(saved?.summary).toContain('Flights')
    expect(saved?.summaryAt).not.toBeNull()

    const run = await prisma.agentRun.findUnique({ where: { id: agentRunId } })
    expect(run?.status).toBe('SUCCESS')
    expect(run?.agentType).toBe('BRIEFING')
    expect(run?.tokensUsed).toBe(90)
  })

  it('demo mode summarizes without calling Gemini', async () => {
    const user = await createTestUser({ email: 'sum-demo@x.com' })
    const parent = await createTaskForUser(user.id, { title: 'Organize my week' })

    const { summary } = await runSummarizeAgent({
      userId: user.id,
      taskId: parent.id,
      demo: true,
    })

    expect(createMock).not.toHaveBeenCalled()
    expect(summary.toLowerCase()).toContain('demo mode')

    const saved = await prisma.task.findUnique({ where: { id: parent.id } })
    expect(saved?.summary).toBe(summary)
  })
})
