import { z } from 'zod'
import { Type } from '@google/genai'
import type { Task } from '@prisma/client'
import { getGemini, GEMINI_MODEL } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

// The Email agent drafts an email from a plain-language instruction and the
// optional task it's about. It only *drafts* — sending happens separately, in
// src/lib/google.ts, and only after the user reviews and approves the draft in
// the UI. There is deliberately no auto-send path here.

// ───────────────────────── Output contract ─────────────────────────

// What we accept back from the model. The JSON Schema handed to the API
// constrains the shape; this Zod schema enforces finer constraints and gives
// us a typed result. `to` is optional — the agent only fills it when the
// instruction clearly names a recipient address; otherwise the user types it.
export const emailDraftSchema = z.object({
  to: z.string().max(320).optional(),
  subject: z.string().min(1).max(300),
  body: z.string().min(1).max(20000),
})

export type EmailDraft = z.infer<typeof emailDraftSchema>

// Gemini structured-output schema (OpenAPI 3.0 subset). Keep in sync with the
// Zod schema above — Zod re-validates the response.
const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    to: {
      type: Type.STRING,
      description:
        'Recipient email address — ONLY if the instruction clearly contains one; otherwise omit.',
    },
    subject: { type: Type.STRING, description: 'A concise, specific subject line.' },
    body: {
      type: Type.STRING,
      description: 'The full plain-text email body, ready to send. No Markdown.',
    },
  },
  required: ['subject', 'body'],
  propertyOrdering: ['to', 'subject', 'body'],
}

const SYSTEM_PROMPT = `You are the Email agent inside TaskAgent, a personal task manager. Draft a clear, professional email from the user's instruction and the optional task context.

Rules:
- Write a concise, ready-to-send email: a specific subject line and a complete plain-text body.
- Match a natural, polite, professional tone. Get to the point.
- Plain text only — no Markdown symbols like **, ##, or backticks.
- Set "to" ONLY if the instruction clearly contains a recipient email address. Otherwise omit it and the user will fill it in.
- Do not invent facts, links, prices, or commitments that aren't given. Avoid leaving bracketed placeholders like [Name] unless the user must fill something in.
- Sign off naturally (e.g. "Best,") without inventing a specific sender name unless given.

Return only the email as JSON matching the provided schema.`

// Free, offline fallback used when no GEMINI_API_KEY is configured, so the
// whole draft→review→send flow is testable at zero cost.
export function demoEmailDraft(instruction: string, taskTitle?: string): EmailDraft {
  const about = taskTitle ? `"${taskTitle}"` : 'your request'
  return {
    subject: `Re: ${taskTitle ?? instruction.slice(0, 60)}`,
    body:
      `Hi,\n\n` +
      `This is a demo draft about ${about}. Add a GEMINI_API_KEY and the Email agent will write ` +
      `a real email here from your instruction:\n"${instruction}"\n\n` +
      `Best,`,
  }
}

// ───────────────────────── Agent ─────────────────────────

export type EmailTaskContext = Pick<Task, 'id' | 'title' | 'description'>

export type EmailDraftResult = {
  agentRunId: string
  draft: EmailDraft
}

/**
 * Draft an email for the user. Writes an AgentRun audit record (agentType
 * EMAIL) just like the other agents. Throws on failure (after recording the
 * AgentRun as ERROR). Sending is a separate, user-approved step.
 */
export async function runEmailDraftAgent(params: {
  userId: string
  instruction: string
  /** The task the email is about, if launched from a task. */
  task?: EmailTaskContext
  /** When true, skip the Gemini call and return a free placeholder draft. */
  demo?: boolean
}): Promise<EmailDraftResult> {
  const { userId, instruction, task, demo = false } = params

  const run = await prisma.agentRun.create({
    data: {
      userId,
      taskId: task?.id ?? null,
      agentType: 'EMAIL',
      status: 'PENDING',
      input: { instruction, taskId: task?.id ?? null, demo },
    },
  })

  try {
    let draft: EmailDraft
    let tokensUsed = 0

    if (demo) {
      draft = demoEmailDraft(instruction, task?.title)
    } else {
      const prompt = [
        `INSTRUCTION: ${instruction}`,
        task
          ? `\nTASK THIS IS ABOUT: ${task.title}` +
            (task.description ? `\n${task.description}` : '')
          : '',
      ]
        .filter(Boolean)
        .join('\n')

      const response = await getGemini().models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      })

      const text = response.text
      if (!text) {
        throw new Error('The agent did not return a draft.')
      }

      draft = emailDraftSchema.parse(JSON.parse(text))
      tokensUsed = response.usageMetadata?.totalTokenCount ?? 0
    }

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        output: { demo, draft },
        tokensUsed,
        completedAt: new Date(),
      },
    })

    return { agentRunId: run.id, draft }
  } catch (err) {
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'ERROR',
        error: err instanceof Error ? err.message : String(err),
        completedAt: new Date(),
      },
    })
    throw err
  }
}
