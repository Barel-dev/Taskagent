import { z } from 'zod'
import { Type } from '@google/genai'
import { getGemini, GEMINI_MODEL } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'
import { runPlanAgent } from '@/lib/agents/plan'

// The chat router is the natural-language front door to TaskAgent. It answers
// read-only questions about the user's tasks directly, and when the user clearly
// wants a new task, it dispatches to the Planner agent to actually create it.
// It does not log its own AgentRun (no CHAT enum) — any task it creates is
// logged by the Planner it calls.

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

const chatOutputSchema = z.object({
  reply: z.string().min(1).max(4000),
  // Set only when the user wants a brand-new task created.
  createTaskGoal: z.string().max(500).optional(),
})

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    reply: { type: Type.STRING, description: 'Your concise, friendly answer to the user.' },
    createTaskGoal: {
      type: Type.STRING,
      description:
        'ONLY if the user wants a NEW task created: a short goal string capturing it. Otherwise omit.',
    },
  },
  required: ['reply'],
  propertyOrdering: ['reply', 'createTaskGoal'],
}

const SYSTEM_PROMPT = `You are the assistant inside TaskAgent, a personal task manager. You help the user understand and act on their tasks.

You are given the user's current tasks. Use them to answer read-only questions directly and specifically — what's due, what's overdue, what's high priority, counts, and what to focus on.

If the user clearly wants to CREATE a new task or plan something new (e.g. "plan a trip to Rome", "add a task to call the bank", "I need to organize the move"), set createTaskGoal to a short goal string capturing it, and make your reply a brief confirmation like "On it — I'll create that and break it into steps." Only set createTaskGoal when they genuinely want a new task; never for questions.

Plain text only — no Markdown symbols. Keep replies short and helpful.`

export type ChatResult = {
  reply: string
  createdTask?: { id: string; title: string }
}

export async function runChatAgent(params: {
  userId: string
  message: string
  history?: ChatTurn[]
  /** When true, skip Gemini and return a free placeholder reply. */
  demo?: boolean
}): Promise<ChatResult> {
  const { userId, message, history = [], demo = false } = params

  if (demo) {
    return {
      reply:
        'Demo mode — add a GEMINI_API_KEY and I can answer questions about your tasks and create new ones right from chat.',
    }
  }

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
          return (
            `- ${t.title} [${t.status}] priority:${t.priority}` +
            (t.dueDate ? ` due:${t.dueDate.toISOString().slice(0, 10)}` : '') +
            (t.children.length ? ` (${done}/${t.children.length} subtasks done)` : '')
          )
        })
        .join('\n')
    : '(no tasks yet)'

  const convo = history
    .slice(-8)
    .map((h) => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`)
    .join('\n')

  const prompt = [
    `Today is ${new Date().toISOString().slice(0, 10)}.`,
    `The user's tasks:\n${taskList}`,
    convo ? `Conversation so far:\n${convo}` : '',
    `User: ${message}`,
  ]
    .filter(Boolean)
    .join('\n\n')

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
  if (!text) throw new Error('The assistant did not return a reply.')
  const parsed = chatOutputSchema.parse(JSON.parse(text))

  // If the user asked for a new task, let the Planner actually build it.
  let createdTask: { id: string; title: string } | undefined
  const goal = parsed.createTaskGoal?.trim()
  if (goal) {
    const { task } = await runPlanAgent({ userId, goal })
    createdTask = { id: task.id, title: task.title }
  }

  return { reply: parsed.reply, createdTask }
}
