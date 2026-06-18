import { z } from 'zod'
import { Type } from '@google/genai'
import { prisma } from '@/lib/prisma'
import { runPlanAgent } from '@/lib/agents/plan'
import { updateTaskForUser } from '@/lib/tasks'
import { priorityEnum, type UpdateTaskInput } from '@/lib/validators'

// The chat router is the natural-language front door to TaskAgent. It answers
// read-only questions about the user's tasks directly, dispatches to the
// Planner when the user wants a new task, and can act on existing tasks —
// complete them, change priority, or move due dates — when clearly asked.
// Each turn is logged as a CHAT AgentRun; any task it creates is additionally
// logged by the Planner it calls.

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

// An action the model may request on an EXISTING task. Every taskId is
// re-checked against the user's own tasks before anything is applied.
const actionSchema = z.object({
  type: z.enum(['complete', 'set_priority', 'set_due']),
  taskId: z.string().min(1),
  priority: priorityEnum.optional(),
  dueDate: z.string().optional(),
})

const MAX_ACTIONS = 10

export const chatOutputSchema = z.object({
  reply: z.string().min(1).max(4000),
  // Set only when the user wants a brand-new task created.
  createTaskGoal: z.string().max(500).optional(),
  actions: z.array(actionSchema).max(MAX_ACTIONS).optional(),
})

export type ChatOutput = z.infer<typeof chatOutputSchema>

export const CHAT_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING, description: 'Your concise, friendly answer to the user.' },
    createTaskGoal: {
      type: Type.STRING,
      description:
        'ONLY if the user wants a NEW task created: a short goal string capturing it. Otherwise omit.',
    },
    actions: {
      type: Type.ARRAY,
      description:
        'ONLY if the user clearly asks to act on EXISTING tasks: the actions to apply. Otherwise omit.',
      items: {
        type: Type.OBJECT,
        properties: {
          type: {
            type: Type.STRING,
            enum: ['complete', 'set_priority', 'set_due'],
            description:
              'complete = mark the task done; set_priority = change its priority; set_due = change its due date.',
          },
          taskId: {
            type: Type.STRING,
            description: 'The exact id of the task, copied from the task list. Never invent ids.',
          },
          priority: {
            type: Type.STRING,
            enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'],
            description: 'Required for set_priority.',
          },
          dueDate: {
            type: Type.STRING,
            description: 'Required for set_due: the new due date as YYYY-MM-DD.',
          },
        },
        required: ['type', 'taskId'],
        propertyOrdering: ['type', 'taskId', 'priority', 'dueDate'],
      },
    },
  },
  required: ['reply'],
  propertyOrdering: ['reply', 'createTaskGoal', 'actions'],
}

export const CHAT_SYSTEM_PROMPT = `You are the assistant inside TaskAgent, a personal task manager. You help the user understand and act on their tasks.

You are given the user's current tasks, each with its id. Use them to answer read-only questions directly and specifically — what's due, what's overdue, what's high priority, counts, and what to focus on.

If the user clearly wants to CREATE a new task or plan something new (e.g. "plan a trip to Rome", "add a task to call the bank", "I need to organize the move"), set createTaskGoal to a short goal string capturing it, and make your reply a brief confirmation like "On it — I'll create that and break it into steps." Only set createTaskGoal when they genuinely want a new task; never for questions.

If the user clearly asks you to ACT on existing tasks (e.g. "mark the gym task done", "make the report urgent", "push everything overdue to tomorrow"), return the matching actions using the exact task ids from the list — never invent ids. Use complete, set_priority (with priority), or set_due (with dueDate as YYYY-MM-DD). Acknowledge exactly what you did in your reply. Never act on a question — only on a clear instruction. If the request is ambiguous about which task is meant, ask instead of acting.

Plain text only — no Markdown symbols. Keep replies short and helpful.`

export type ChatAction = {
  type: 'complete' | 'set_priority' | 'set_due'
  taskId: string
  title: string
}

export type ChatResult = {
  reply: string
  createdTask?: { id: string; title: string }
  /** Actions actually applied (after ownership re-checks). */
  actions?: ChatAction[]
}

export const CHAT_DEMO_REPLY =
  'Demo mode — add a GEMINI_API_KEY and I can answer questions about your tasks, create new ones, and act on them right from chat.'

/**
 * Build the grounding prompt for a chat turn: the user's tasks (with ids so
 * the model can reference them in actions), the rolling conversation, and the
 * new message.
 */
export async function buildChatPrompt(
  userId: string,
  message: string,
  history: ChatTurn[] = [],
): Promise<string> {
  // Read-only task context for grounding the answer.
  const tasks = await prisma.task.findMany({
    where: { userId, parentId: null },
    orderBy: [{ status: 'asc' }, { dueDate: 'asc' }],
    include: { children: true },
  })

  const taskList = tasks.length
    ? tasks
        .map((t) => {
          const done = t.children.filter((c) => c.status === 'DONE').length
          const line =
            `- id:${t.id} | ${t.title} [${t.status}] priority:${t.priority}` +
            (t.dueDate ? ` due:${t.dueDate.toISOString().slice(0, 10)}` : '') +
            (t.children.length ? ` (${done}/${t.children.length} subtasks done)` : '')
          const subs = t.children
            .map((c) => `    - id:${c.id} | ${c.title} [${c.status}]`)
            .join('\n')
          return subs ? `${line}\n${subs}` : line
        })
        .join('\n')
    : '(no tasks yet)'

  const convo = history
    .slice(-8)
    .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
    .join('\n')

  return [
    `Today is ${new Date().toISOString().slice(0, 10)}.`,
    `The user's tasks:\n${taskList}`,
    convo ? `Conversation so far:\n${convo}` : '',
    `User: ${message}`,
  ]
    .filter(Boolean)
    .join('\n\n')
}

/**
 * Apply the side effects of a parsed chat turn: dispatch to the Planner when
 * the user asked for a new task, and apply actions on existing tasks through
 * updateTaskForUser — which re-checks ownership (a hallucinated/foreign id is
 * silently skipped), stamps completedAt, and handles recurring tasks.
 */
export async function finalizeChat(
  userId: string,
  parsed: ChatOutput,
  opts: { message?: string; tokensUsed?: number } = {},
): Promise<Omit<ChatResult, 'reply'>> {
  let createdTask: { id: string; title: string } | undefined
  const goal = parsed.createTaskGoal?.trim()
  if (goal) {
    const { task } = await runPlanAgent({ userId, goal })
    createdTask = { id: task.id, title: task.title }
  }

  const applied: ChatAction[] = []
  for (const a of parsed.actions ?? []) {
    let data: UpdateTaskInput | null = null
    if (a.type === 'complete') data = { status: 'DONE' }
    else if (a.type === 'set_priority' && a.priority) data = { priority: a.priority }
    else if (a.type === 'set_due' && a.dueDate) {
      const d = new Date(a.dueDate)
      if (!Number.isNaN(d.getTime())) data = { dueDate: d }
    }
    if (!data) continue
    const updated = await updateTaskForUser(userId, a.taskId, data)
    if (updated) applied.push({ type: a.type, taskId: a.taskId, title: updated.title })
  }

  // Audit the chat turn so it appears in the dashboard's by-agent breakdown.
  // A logging failure must never break the user's reply, so it's swallowed.
  await prisma.agentRun
    .create({
      data: {
        userId,
        taskId: createdTask?.id ?? null,
        agentType: 'CHAT',
        status: 'SUCCESS',
        input: opts.message ? { message: opts.message } : undefined,
        output: {
          reply: parsed.reply,
          ...(createdTask ? { createdTask } : {}),
          ...(applied.length
            ? { actions: applied.map((act) => ({ type: act.type, title: act.title })) }
            : {}),
        },
        tokensUsed: opts.tokensUsed ?? 0,
        completedAt: new Date(),
      },
    })
    .catch(() => {})

  return { createdTask, ...(applied.length ? { actions: applied } : {}) }
}

/**
 * Incrementally decode the "reply" string from a *partial* structured-output
 * JSON response. CHAT_RESPONSE_SCHEMA orders "reply" first, so its characters
 * arrive before anything else — which is what lets the route stream the reply
 * to the user while the rest of the JSON (actions etc.) is still generating.
 * Stops cleanly at an incomplete escape sequence on a chunk boundary.
 */
export function extractReplyPrefix(raw: string): string {
  const m = raw.match(/"reply"\s*:\s*"/)
  if (!m) return ''
  let out = ''
  let i = (m.index ?? 0) + m[0].length
  while (i < raw.length) {
    const c = raw[i]
    if (c === '"') break
    if (c === '\\') {
      if (i + 1 >= raw.length) break // escape split across chunks
      const next = raw[i + 1]
      if (next === 'u') {
        const hex = raw.slice(i + 2, i + 6)
        if (hex.length < 4) break
        out += String.fromCharCode(parseInt(hex, 16))
        i += 6
        continue
      }
      const map: Record<string, string> = {
        n: '\n',
        t: '\t',
        r: '\r',
        b: '\b',
        f: '\f',
        '"': '"',
        '\\': '\\',
        '/': '/',
      }
      out += map[next] ?? next
      i += 2
      continue
    }
    out += c
    i++
  }
  return out
}
