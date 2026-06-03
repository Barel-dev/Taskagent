import { describe, expect, it, vi, beforeEach } from 'vitest'

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))
vi.mock('@/lib/gemini', () => ({
  getGemini: () => ({ models: { generateContent: createMock } }),
  GEMINI_MODEL: 'gemini-2.5-flash',
}))

// Avoid real network fetches for link previews; pass sources through enriched.
vi.mock('@/lib/link-preview', () => ({
  fetchLinkPreviews: (sources: { uri: string; title: string }[]) =>
    Promise.resolve(sources.map((s) => ({ ...s, siteName: 'example.com' }))),
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
      task: { id: task.id, title: task.title, description: null, parentId: null },
    })

    expect(result).toContain('Lisbon')
    expect(sources).toHaveLength(2) // deduped by uri
    expect(sources[0].uri).toBe('https://example.com/flights')

    const saved = await prisma.task.findUnique({ where: { id: task.id } })
    expect(saved?.result).toContain('Lisbon')
    expect(saved?.resultAt).not.toBeNull()

    const run = await prisma.agentRun.findUnique({ where: { id: agentRunId } })
    expect(run?.status).toBe('SUCCESS')
    expect(run?.agentType).toBe('EXECUTE')
    expect(run?.tokensUsed).toBe(320)
  })

  it('feeds the parent goal as context and syncs the user reply to the plan root', async () => {
    const user = await createTestUser({ email: 'sync@x.com' })
    const parent = await createTaskForUser(user.id, { title: 'plan a trip to Lisbon' })
    const child = await prisma.task.create({
      data: { userId: user.id, parentId: parent.id, title: 'Determine preferred travel window' },
    })
    createMock.mockResolvedValue(mockGroundedResponse('Best window is May–June.', []))

    await runExecuteAgent({
      userId: user.id,
      task: { id: child.id, title: child.title, description: null, parentId: child.parentId },
      reply: 'Traveling in June, budget €1500, a couple',
    })

    // The agent's prompt carried the parent goal (so it knows it's Lisbon)
    // plus the user's reply.
    const prompt = createMock.mock.calls[0][0].contents as string
    expect(prompt).toContain('Lisbon')
    expect(prompt).toContain('June')

    // The reply is saved on the plan root so sibling agents reuse it.
    const root = await prisma.task.findUnique({ where: { id: parent.id } })
    expect(root?.context).toContain('June')
  })

  it('demo mode returns a placeholder without calling Gemini', async () => {
    const user = await createTestUser({ email: 'exec-demo@x.com' })
    const task = await createTaskForUser(user.id, { title: 'Find the cheapest flights' })

    const { result } = await runExecuteAgent({
      userId: user.id,
      task: { id: task.id, title: task.title, description: null, parentId: null },
      demo: true,
    })

    expect(createMock).not.toHaveBeenCalled()
    expect(result.toLowerCase()).toContain('demo mode')

    const saved = await prisma.task.findUnique({ where: { id: task.id } })
    expect(saved?.result).toBe(result)
  })
})
