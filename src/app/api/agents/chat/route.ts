import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { agentRateLimitOk, isQuotaError } from '@/lib/rate-limit'
import { chatRequestSchema } from '@/lib/validators'
import { getGemini, GEMINI_MODEL } from '@/lib/gemini'
import {
  CHAT_SYSTEM_PROMPT,
  CHAT_RESPONSE_SCHEMA,
  CHAT_DEMO_REPLY,
  chatOutputSchema,
  buildChatPrompt,
  finalizeChat,
  extractReplyPrefix,
} from '@/lib/agents/chat'

// Creating a task from chat may run the Planner (a Gemini call), so give it room.
export const maxDuration = 60

// Streams the assistant's reply as Server-Sent Events while Gemini generates
// it, then finishes with one "done" event carrying the side effects (created
// task / applied actions). Events: {type:'delta',text} → {type:'done',reply,
// createdTask?,actions?} | {type:'error',error}.
//
// This route can't use the agentRoute wrapper (it returns JSON, not a stream),
// so it repeats the same auth + rate-limit + validation steps inline.

const encoder = new TextEncoder()

function sse(obj: unknown): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(obj)}\n\n`)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = session.user.id

  if (!(await agentRateLimitOk(userId))) {
    return NextResponse.json(
      { error: 'You’re going too fast — give the agents a moment.' },
      { status: 429 },
    )
  }

  const body = await req.json().catch(() => null)
  const parsed = chatRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  const { message, history } = parsed.data
  const demo = !process.env.GEMINI_API_KEY

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (demo) {
          controller.enqueue(sse({ type: 'delta', text: CHAT_DEMO_REPLY }))
          controller.enqueue(sse({ type: 'done', reply: CHAT_DEMO_REPLY }))
          return
        }

        const prompt = await buildChatPrompt(userId, message, history)
        const chunks = await getGemini().models.generateContentStream({
          model: GEMINI_MODEL,
          contents: prompt,
          config: {
            systemInstruction: CHAT_SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema: CHAT_RESPONSE_SCHEMA,
          },
        })

        // The reply field streams first (schema property ordering), so we can
        // forward its characters as they arrive.
        let raw = ''
        let sent = 0
        for await (const chunk of chunks) {
          raw += chunk.text ?? ''
          const reply = extractReplyPrefix(raw)
          if (reply.length > sent) {
            controller.enqueue(sse({ type: 'delta', text: reply.slice(sent) }))
            sent = reply.length
          }
        }

        const out = chatOutputSchema.parse(JSON.parse(raw))
        const effects = await finalizeChat(userId, out)
        controller.enqueue(sse({ type: 'done', reply: out.reply, ...effects }))
      } catch (err) {
        console.error('Chat stream failed:', err)
        controller.enqueue(
          sse({
            type: 'error',
            error: isQuotaError(err)
              ? 'AI quota reached for now — please try again in a bit.'
              : 'The assistant failed to respond. Please try again.',
          }),
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
