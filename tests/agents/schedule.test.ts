import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the Gemini client before importing the agent, so no real network call
// (and no quota use) happens in the suite. vi.mock is hoisted above imports, so
// the mock fn must come from vi.hoisted to be defined in time.
const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))
vi.mock('@/lib/gemini', () => ({
  getGemini: () => ({ models: { generateContent: createMock } }),
  GEMINI_MODEL: 'gemini-2.5-flash',
}))

import { runScheduleAgent } from '@/lib/agents/schedule'
import { createTaskForUser } from '@/lib/tasks'
import { prisma } from '@/lib/prisma'
import { createTestUser } from '../helpers'

type FakeSlot = { start: string; end: string; reason: string }

function mockGeminiResponse(slots: FakeSlot[]) {
  return { text: JSON.stringify({ slots }), usageMetadata: { totalTokenCount: 90 } }
}

const taskInput = (id: string, title: string) => ({
  id,
  title,
  description: null,
  priority: 'MEDIUM' as const,
  estimatedMinutes: 30,
})

beforeEach(() => {
  createMock.mockReset()
})

describe('schedule agent', () => {
  it('proposes parsed slots and logs a SUCCESS SCHEDULE AgentRun', async () => {
    const user = await createTestUser()
    const task = await createTaskForUser(user.id, { title: 'Write report' })
    createMock.mockResolvedValue(
      mockGeminiResponse([
        {
          start: '2026-06-08T10:00:00Z',
          end: '2026-06-08T10:30:00Z',
          reason: 'Open morning slot',
        },
        {
          start: '2026-06-09T14:00:00Z',
          end: '2026-06-09T14:30:00Z',
          reason: 'After lunch',
        },
      ]),
    )

    const result = await runScheduleAgent({
      userId: user.id,
      task: taskInput(task.id, task.title),
      busy: [{ start: '2026-06-08T09:00:00Z', end: '2026-06-08T09:30:00Z' }],
      timeZone: 'UTC',
    })

    expect(result.slots).toHaveLength(2)
    expect(result.slots[0].start).toBe('2026-06-08T10:00:00Z')
    expect(result.slots[0].reason).toBe('Open morning slot')

    const run = await prisma.agentRun.findUnique({ where: { id: result.agentRunId } })
    expect(run?.status).toBe('SUCCESS')
    expect(run?.agentType).toBe('SCHEDULE')
    expect(run?.tokensUsed).toBe(90)
    expect(run?.taskId).toBe(task.id)
  })

  it('demo mode returns placeholder slots without calling Gemini', async () => {
    const user = await createTestUser({ email: 'demo-sched@x.com' })
    const task = await createTaskForUser(user.id, { title: 'Plan sprint' })

    const result = await runScheduleAgent({
      userId: user.id,
      task: taskInput(task.id, task.title),
      busy: [],
      timeZone: 'UTC',
      demo: true,
    })

    expect(createMock).not.toHaveBeenCalled()
    expect(result.slots.length).toBeGreaterThan(0)
    expect(new Date(result.slots[0].end).getTime()).toBeGreaterThan(
      new Date(result.slots[0].start).getTime(),
    )

    const run = await prisma.agentRun.findUnique({ where: { id: result.agentRunId } })
    expect(run?.status).toBe('SUCCESS')
    expect(run?.tokensUsed).toBe(0)
  })

  it('records an ERROR AgentRun and rethrows when the model call fails', async () => {
    const user = await createTestUser({ email: 'sched-err@x.com' })
    const task = await createTaskForUser(user.id, { title: 'Whatever' })
    createMock.mockRejectedValue(new Error('API down'))

    await expect(
      runScheduleAgent({
        userId: user.id,
        task: taskInput(task.id, task.title),
        busy: [],
        timeZone: 'UTC',
      }),
    ).rejects.toThrow('API down')

    const runs = await prisma.agentRun.findMany({ where: { userId: user.id } })
    expect(runs).toHaveLength(1)
    expect(runs[0].status).toBe('ERROR')
  })
})
