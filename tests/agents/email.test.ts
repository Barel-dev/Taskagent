import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock the Gemini client before importing the agent, so no real network call
// (and no quota use) happens in the suite. vi.mock is hoisted above imports, so
// the mock fn must come from vi.hoisted to be defined in time.
const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))
vi.mock('@/lib/gemini', () => ({
  getGemini: () => ({ models: { generateContent: createMock } }),
  GEMINI_MODEL: 'gemini-2.5-flash',
}))

import { runEmailDraftAgent } from '@/lib/agents/email'
import { createTaskForUser } from '@/lib/tasks'
import { prisma } from '@/lib/prisma'
import { createTestUser } from '../helpers'

type FakeDraft = { to?: string; subject: string; body: string }

// Gemini returns structured output as a JSON string on `response.text`.
function mockGeminiResponse(draft: FakeDraft) {
  return { text: JSON.stringify(draft), usageMetadata: { totalTokenCount: 120 } }
}

beforeEach(() => {
  createMock.mockReset()
})

describe('email draft agent', () => {
  it('drafts an email and logs a SUCCESS AgentRun with tokens', async () => {
    const user = await createTestUser()
    const task = await createTaskForUser(user.id, { title: 'Finish budget review' })
    createMock.mockResolvedValue(
      mockGeminiResponse({
        to: 'sarah@acme.com',
        subject: 'Budget review — done',
        body: 'Hi Sarah,\n\nThe budget review is complete.\n\nBest,',
      }),
    )

    const result = await runEmailDraftAgent({
      userId: user.id,
      instruction: 'Email sarah@acme.com that the budget review is done',
      task: { id: task.id, title: task.title, description: task.description },
    })

    expect(result.draft.to).toBe('sarah@acme.com')
    expect(result.draft.subject).toBe('Budget review — done')
    expect(result.draft.body).toContain('budget review is complete')

    const run = await prisma.agentRun.findUnique({ where: { id: result.agentRunId } })
    expect(run?.status).toBe('SUCCESS')
    expect(run?.agentType).toBe('EMAIL')
    expect(run?.tokensUsed).toBe(120)
    expect(run?.taskId).toBe(task.id)
    expect(run?.completedAt).not.toBeNull()
  })

  it('demo mode returns a placeholder draft without calling Gemini', async () => {
    const user = await createTestUser({ email: 'demo-email@x.com' })

    const result = await runEmailDraftAgent({
      userId: user.id,
      instruction: 'Email the team an update',
      demo: true,
    })

    expect(createMock).not.toHaveBeenCalled()
    expect(result.draft.subject.length).toBeGreaterThan(0)
    expect(result.draft.body.length).toBeGreaterThan(0)

    const run = await prisma.agentRun.findUnique({ where: { id: result.agentRunId } })
    expect(run?.status).toBe('SUCCESS')
    expect(run?.agentType).toBe('EMAIL')
    expect(run?.tokensUsed).toBe(0)
  })

  it('records an ERROR AgentRun and rethrows when the model call fails', async () => {
    const user = await createTestUser({ email: 'email-err@x.com' })
    createMock.mockRejectedValue(new Error('API down'))

    await expect(
      runEmailDraftAgent({ userId: user.id, instruction: 'write something' }),
    ).rejects.toThrow('API down')

    const runs = await prisma.agentRun.findMany({ where: { userId: user.id } })
    expect(runs).toHaveLength(1)
    expect(runs[0].status).toBe('ERROR')
    expect(runs[0].error).toContain('API down')
  })

  it('rejects malformed agent output (empty subject) and logs an ERROR', async () => {
    const user = await createTestUser({ email: 'email-bad@x.com' })
    createMock.mockResolvedValue(mockGeminiResponse({ subject: '', body: '' }))

    await expect(
      runEmailDraftAgent({ userId: user.id, instruction: 'write something' }),
    ).rejects.toBeTruthy()

    const run = await prisma.agentRun.findFirst({ where: { userId: user.id } })
    expect(run?.status).toBe('ERROR')
  })
})
