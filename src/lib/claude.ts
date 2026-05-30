import Anthropic from '@anthropic-ai/sdk'

// Singleton Anthropic client, cached on globalThis in dev so Next.js hot-reload
// doesn't open a new client on every request (same pattern as src/lib/prisma.ts).
const globalForClaude = globalThis as unknown as { claude?: Anthropic }

export const claude =
  globalForClaude.claude ?? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

if (process.env.NODE_ENV !== 'production') globalForClaude.claude = claude

// The model the agents run on. Opus 4.8 is the most capable; swap to
// 'claude-sonnet-4-6' if you want lower cost / latency for these short,
// structured calls — it's plenty capable for task breakdown.
export const AGENT_MODEL = 'claude-opus-4-8'
