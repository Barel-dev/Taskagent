import { NextResponse } from 'next/server'
import type { ZodSchema } from 'zod'
import { auth } from '@/lib/auth'
import { agentRateLimitOk, isQuotaError } from '@/lib/rate-limit'

// Shared wrapper for the Gemini agent POST routes. Handles the boilerplate they
// all repeat — auth, per-user rate limit, optional Zod body parse, the demo
// flag, and quota/error mapping — so each route is just its handler.
//
// To return a specific HTTP error from a handler (e.g. 404 task-not-found),
// throw an AgentHttpError; anything else maps to 429 (quota) or 502.

export class AgentHttpError extends Error {
  status: number
  extra?: Record<string, unknown>
  constructor(status: number, message: string, extra?: Record<string, unknown>) {
    super(message)
    this.status = status
    this.extra = extra
  }
}

type Handler<T> = (ctx: { userId: string; input: T; demo: boolean }) => Promise<unknown>

export function agentRoute<T = unknown>(opts: {
  /** Zod schema for the JSON body. Omit for routes with no body. */
  schema?: ZodSchema<T>
  /** Success status (default 200). */
  status?: number
  /** Message returned on an unexpected (non-quota) failure. */
  errorMessage?: string
  handler: Handler<T>
}) {
  const {
    schema,
    status = 200,
    errorMessage = 'The agent failed. Please try again.',
    handler,
  } = opts

  return async function POST(req: Request) {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    if (!(await agentRateLimitOk(session.user.id))) {
      return NextResponse.json(
        { error: 'You’re going too fast — give the agents a moment.' },
        { status: 429 },
      )
    }

    let input = undefined as T
    if (schema) {
      const body = await req.json().catch(() => null)
      const parsed = schema.safeParse(body)
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid input', issues: parsed.error.flatten() },
          { status: 400 },
        )
      }
      input = parsed.data
    }

    const demo = !process.env.GEMINI_API_KEY

    try {
      const data = await handler({ userId: session.user.id, input, demo })
      return NextResponse.json(data as Record<string, unknown>, { status })
    } catch (err) {
      if (err instanceof AgentHttpError) {
        return NextResponse.json({ error: err.message, ...err.extra }, { status: err.status })
      }
      console.error('Agent route failed:', err)
      if (isQuotaError(err)) {
        return NextResponse.json(
          { error: 'AI quota reached for now — please try again in a bit.' },
          { status: 429 },
        )
      }
      return NextResponse.json({ error: errorMessage }, { status: 502 })
    }
  }
}
