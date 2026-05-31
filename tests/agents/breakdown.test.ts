import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the Gemini client before importing the agent, so no real network call
// (and no quota use) happens in the suite. vi.mock is hoisted above imports,
// so the mock fn must come from vi.hoisted to be defined in time.
const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))
vi.mock('@/lib/gemini', () => ({
  getGemini: () => ({ models: { generateContent: createMock } }),
  GEMINI_MODEL: 'gemini-2.5-flash',
}))

import { runBreakdownAgent } from '@/lib/agents/breakdown'
import { createTaskForUser } from '@/lib/tasks'
import { prisma } from '@/lib/prisma'
import { createTestUser } from '../helpers'

type FakeSubtask = { title: string; priority: string; estimatedMinutes: number }

// Gemini returns the structured output as a JSON string on `response.text`.
function mockGeminiResponse(subtasks: FakeSubtask[]) {
  return {
    text: JSON.stringify({ subtasks }),
    usageMetadata: { totalTokenCount: 150 },
  }
}

beforeEach(() => {
  createMock.mockReset()
})

describe('breakdown agent', () => {
  it('creates ordered subtasks and logs a SUCCESS AgentRun', async () => {
    const user = await createTestUser()
    const task = await createTaskForUser(user.id, { title: 'Plan trip to Lisbon' })
    createMock.mockResolvedValue(
      mockGeminiResponse([
        { title: 'Book round-trip flights', priority: 'HIGH', estimatedMinutes: 30 },
        { title: 'Reserve a hotel', priority: 'MEDIUM', estimatedMinutes: 20 },
        { title: 'Make a packing list', priority: 'LOW', estimatedMinutes: 15 },
      ]),
    )

    const result = await runBreakdownAgent({
      userId: user.id,
      task: { id: task.id, title: task.title, description: null, priority: 'MEDIUM' },
    })

    // Returned rows are persisted children, in order
    expect(result.subtasks).toHaveLength(3)
    expect(result.subtasks[0].title).toBe('Book round-trip flights')
    expect(result.subtasks[0].parentId).toBe(task.id)
    expect(result.subtasks[0].priority).toBe('HIGH')
    expect(result.subtasks[0].estimatedMinutes).toBe(30)
    expect(result.subtasks[0].userId).toBe(user.id)

    // Children are real, queryable Task rows under the parent
    const children = await prisma.task.findMany({
      where: { parentId: task.id },
      orderBy: { createdAt: 'asc' },
    })
    expect(children).toHaveLength(3)

    // AgentRun audit row written with token usage
    const run = await prisma.agentRun.findUnique({ where: { id: result.agentRunId } })
    expect(run?.status).toBe('SUCCESS')
    expect(run?.agentType).toBe('BREAKDOWN')
    expect(run?.tokensUsed).toBe(150)
    expect(run?.taskId).toBe(task.id)
    expect(run?.completedAt).not.toBeNull()
  })

  it('records an ERROR AgentRun and rethrows when the model call fails', async () => {
    const user = await createTestUser({ email: 'err@x.com' })
    const task = await createTaskForUser(user.id, { title: 'Whatever' })
    createMock.mockRejectedValue(new Error('API down'))

    await expect(
      runBreakdownAgent({
        userId: user.id,
        task: { id: task.id, title: task.title, description: null, priority: 'MEDIUM' },
      }),
    ).rejects.toThrow('API down')

    const runs = await prisma.agentRun.findMany({ where: { userId: user.id } })
    expect(runs).toHaveLength(1)
    expect(runs[0].status).toBe('ERROR')
    expect(runs[0].error).toContain('API down')

    // No orphan subtasks created on failure
    const children = await prisma.task.findMany({ where: { parentId: task.id } })
    expect(children).toHaveLength(0)
  })

  it('demo mode creates placeholder subtasks without calling Claude', async () => {
    const user = await createTestUser({ email: 'demo@x.com' })
    const task = await createTaskForUser(user.id, { title: 'Write my thesis' })

    const result = await runBreakdownAgent({
      userId: user.id,
      task: { id: task.id, title: task.title, description: null, priority: 'MEDIUM' },
      demo: true,
    })

    expect(createMock).not.toHaveBeenCalled()
    expect(result.subtasks.length).toBeGreaterThan(0)
    expect(result.subtasks[0].parentId).toBe(task.id)

    const run = await prisma.agentRun.findUnique({ where: { id: result.agentRunId } })
    expect(run?.status).toBe('SUCCESS')
    expect(run?.tokensUsed).toBe(0)
  })

  it('rejects malformed agent output and logs an ERROR', async () => {
    const user = await createTestUser({ email: 'bad@x.com' })
    const task = await createTaskForUser(user.id, { title: 'Whatever' })
    createMock.mockResolvedValue(
      mockGeminiResponse([{ title: '', priority: 'NOPE', estimatedMinutes: -1 }]),
    )

    await expect(
      runBreakdownAgent({
        userId: user.id,
        task: { id: task.id, title: task.title, description: null, priority: 'MEDIUM' },
      }),
    ).rejects.toBeTruthy()

    const run = await prisma.agentRun.findFirst({ where: { userId: user.id } })
    expect(run?.status).toBe('ERROR')

    const children = await prisma.task.findMany({ where: { parentId: task.id } })
    expect(children).toHaveLength(0)
  })
})
