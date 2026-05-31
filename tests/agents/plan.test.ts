import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the Gemini client before importing the agent — no real network call.
const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))
vi.mock('@/lib/gemini', () => ({
  getGemini: () => ({ models: { generateContent: createMock } }),
  GEMINI_MODEL: 'gemini-2.5-flash',
}))

import { runPlanAgent } from '@/lib/agents/plan'
import { prisma } from '@/lib/prisma'
import { createTestUser } from '../helpers'

function mockPlanResponse(title: string, subtasks: unknown[]) {
  return {
    text: JSON.stringify({ title, priority: 'HIGH', subtasks }),
    usageMetadata: { totalTokenCount: 200 },
  }
}

beforeEach(() => {
  createMock.mockReset()
})

describe('planner agent', () => {
  it('creates a new task with subtasks from a goal and logs a SUCCESS run', async () => {
    const user = await createTestUser({ email: 'planner@x.com' })
    createMock.mockResolvedValue(
      mockPlanResponse('Find the best laptop deals', [
        { title: 'List required specs and budget', priority: 'HIGH', estimatedMinutes: 20 },
        { title: 'Compare prices across 3 retailers', priority: 'MEDIUM', estimatedMinutes: 40 },
      ]),
    )

    const { task, agentRunId } = await runPlanAgent({
      userId: user.id,
      goal: 'search for the best laptop deals',
    })

    expect(task.title).toBe('Find the best laptop deals')
    expect(task.parentId).toBeNull()
    expect(task.children).toHaveLength(2)
    expect(task.children[0].parentId).toBe(task.id)
    expect(task.children[0].title).toBe('List required specs and budget')

    const run = await prisma.agentRun.findUnique({ where: { id: agentRunId } })
    expect(run?.status).toBe('SUCCESS')
    expect(run?.tokensUsed).toBe(200)
    expect(run?.taskId).toBe(task.id)
  })

  it('demo mode builds a task without calling Gemini', async () => {
    const user = await createTestUser({ email: 'planner-demo@x.com' })

    const { task, agentRunId } = await runPlanAgent({
      userId: user.id,
      goal: 'plan my study schedule',
      demo: true,
    })

    expect(createMock).not.toHaveBeenCalled()
    expect(task.title).toBe('plan my study schedule')
    expect(task.children.length).toBeGreaterThan(0)

    const run = await prisma.agentRun.findUnique({ where: { id: agentRunId } })
    expect(run?.status).toBe('SUCCESS')
    expect(run?.tokensUsed).toBe(0)
  })
})
