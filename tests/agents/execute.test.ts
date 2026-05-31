import { describe, expect, it, vi, beforeEach } from 'vitest'

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))
vi.mock('@/lib/gemini', () => ({
  getGemini: () => ({ models: { generateContent: createMock } }),
  GEMINI_MODEL: 'gemini-2.5-flash',
}))

import { runExecuteAgent } from '@/lib/agents/execute'
import { createTaskForUser } from '@/lib/tasks'
import { prisma } from '@/lib/prisma'
import { createTestUser } from '../helpers'

// Shape of a grounded Gemini response: text + grounding chunks with web sources.
function mockGroundedResponse(text: string, sources: { uri: string; title: string }[]) {
  return {
    text,
    usageMetadata: { totalTokenCount: 320 },
    candidates: [{ groundingMetadata: { groundingChunks: sources.map((web) => ({ web })) } }],
  }
}

beforeEach(() => {
  createMock.mockReset()
})

describe('execute agent', () => {
  it('runs the task, stores the result on the task, and logs sources', async () => {
    const user = await createTestUser({ email: 'exec@x.com' })
    const task = await createTaskForUser(user.id, { title: 'Search for a trip to Lisbon' })
    createMock.mockResolvedValue(
      mockGroundedResponse('Found 3 round-trip options to Lisbon from $420...', [
        { uri: 'https://example.com/flights', title: 'Flight deals' },
        { uri: 'https://example.com/flights', title: 'dup (ignored)' },
        { uri: 'https://example.com/hotels', title: 'Lisbon hotels' },
      ]),
    )

    const { result, sources, agentRunId } = await runExecuteAgent({
      userId: user.id,
      task: { id: task.id, title: task.title, description: null },
    })

    expect(result).toContain('Lisbon')
    expect(sources).toHaveLength(2) // deduped by uri
    expect(sources[0].uri).toBe('https://example.com/flights')

    // Result persisted on the task
    const saved = await prisma.task.findUnique({ where: { id: task.id } })
    expect(saved?.result).toContain('Lisbon')
    expect(saved?.resultAt).not.toBeNull()

    const run = await prisma.agentRun.findUnique({ where: { id: agentRunId } })
    expect(run?.status).toBe('SUCCESS')
    expect(run?.agentType).toBe('EXECUTE')
    expect(run?.tokensUsed).toBe(320)
  })

  it('demo mode returns a placeholder without calling Gemini', async () => {
    const user = await createTestUser({ email: 'exec-demo@x.com' })
    const task = await createTaskForUser(user.id, { title: 'Find the cheapest flights' })

    const { result } = await runExecuteAgent({
      userId: user.id,
      task: { id: task.id, title: task.title, description: null },
      demo: true,
    })

    expect(createMock).not.toHaveBeenCalled()
    expect(result.toLowerCase()).toContain('demo mode')

    const saved = await prisma.task.findUnique({ where: { id: task.id } })
    expect(saved?.result).toBe(result)
  })
})
