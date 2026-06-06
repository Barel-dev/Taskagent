import { describe, expect, it, vi, beforeEach } from 'vitest'

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }))
vi.mock('@/lib/gemini', () => ({
  getGemini: () => ({ models: { generateContent: createMock } }),
  GEMINI_MODEL: 'gemini-2.5-flash',
}))

import { runRefineAgent } from '@/lib/agents/refine'

beforeEach(() => {
  createMock.mockReset()
})

describe('refine agent', () => {
  it('returns a refined title, description, and acceptance criteria', async () => {
    createMock.mockResolvedValue({
      text: JSON.stringify({
        title: 'Ship the marketing landing page',
        description: 'Build and deploy the public landing page.',
        acceptanceCriteria: ['Page is live at the domain', 'Lighthouse performance > 90'],
      }),
      usageMetadata: { totalTokenCount: 110 },
    })

    const result = await runRefineAgent({ task: { title: 'landing', description: null } })
    expect(result.title).toBe('Ship the marketing landing page')
    expect(result.acceptanceCriteria).toHaveLength(2)
  })

  it('demo mode returns a placeholder without calling Gemini', async () => {
    const result = await runRefineAgent({
      task: { title: 'vague task', description: null },
      demo: true,
    })
    expect(createMock).not.toHaveBeenCalled()
    expect(result.title.length).toBeGreaterThan(0)
    expect(result.acceptanceCriteria.length).toBeGreaterThan(0)
  })

  it('rejects malformed output', async () => {
    createMock.mockResolvedValue({
      text: JSON.stringify({ title: '', description: '', acceptanceCriteria: [] }),
    })
    await expect(runRefineAgent({ task: { title: 'x', description: null } })).rejects.toBeTruthy()
  })
})
