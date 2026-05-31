import type { Task } from '@prisma/client'
import { getGemini, GEMINI_MODEL } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

// The Execute agent actually *carries out* a task using live Google Search
// (grounding), rather than planning or breaking it down. For "search for a
// trip to Lisbon" it really searches the web and reports concrete options.
//
// Agents are kept in sync: before running, it gathers context from the rest of
// the plan (the overall goal, the user's saved answers, and sibling steps with
// their results) so it doesn't re-ask things that are already known.

export type ExecuteSource = { title: string; uri: string }
export type ExecuteResult = {
  agentRunId: string
  result: string
  sources: ExecuteSource[]
}

const SYSTEM_PROMPT = `You are the Execute agent inside TaskAgent. The user has a task and wants you to actually carry it out — not plan it or break it into subtasks.

Use Google Search to find current, real information and do the task as far as you can on your own:
- For research / search / "find" tasks (flights, deals, options, prices, information): return concrete, current findings — specific options with names, prices or figures, key details, and dates. Organize with short plain-text headers or dash bullets so it's skimmable.
- Be specific and genuinely useful: real results, not generic advice.

Context discipline (important):
- You are given the overall goal, the user's saved answers, and the other steps in the plan. USE this context. Never ask about something already stated there (e.g. if the goal is "trip to Lisbon", the destination is Lisbon — do not ask where).
- Only ask the user a question if it is genuinely required and cannot be inferred from the context or found on the web. Ask at most 1-2 essential questions, and otherwise make a sensible assumption and proceed, stating the assumption.
- If finishing the task needs an action you cannot take yourself (booking, paying, sending a message, signing in), do all the research first, then clearly state the single next step the user must take.

Formatting: write in plain text. Do NOT use Markdown symbols like **, ##, or backticks. Use simple dash bullets and short line breaks. Keep it concise.`

/** Walk parentId up to the top, returning [root, ..., immediateParent]. */
async function loadAncestors(userId: string, parentId: string | null): Promise<Task[]> {
  const chain: Task[] = []
  let pid = parentId
  // Bounded loop guards against any accidental cycle.
  for (let i = 0; pid && i < 20; i++) {
    const parent = await prisma.task.findFirst({ where: { id: pid, userId } })
    if (!parent) break
    chain.unshift(parent)
    pid = parent.parentId
  }
  return chain
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

export async function runExecuteAgent(params: {
  userId: string
  task: Pick<Task, 'id' | 'title' | 'description' | 'parentId'>
  /** The user's answer to the agent's earlier questions / extra details. */
  reply?: string
  /** When true, skip the Gemini call and return a free placeholder result. */
  demo?: boolean
}): Promise<ExecuteResult> {
  const { userId, task, reply, demo = false } = params

  // ── Gather shared plan context so agents stay in sync ──
  const ancestors = await loadAncestors(userId, task.parentId)
  const root = ancestors[0] ?? null
  const siblings = task.parentId
    ? await prisma.task.findMany({
        where: { userId, parentId: task.parentId, NOT: { id: task.id } },
        orderBy: { createdAt: 'asc' },
      })
    : []

  const contextParts: string[] = []
  if (root) {
    contextParts.push(
      `OVERALL GOAL: "${root.title}"` + (root.description ? ` — ${root.description}` : ''),
    )
    if (ancestors.length > 1) {
      contextParts.push(`This task sits under: ${ancestors.map((a) => a.title).join(' › ')}`)
    }
  }
  // User's saved answers/preferences live on the root (fallback: the task).
  const sharedContext = root?.context ?? null
  if (sharedContext) contextParts.push(`KNOWN DETAILS FROM THE USER:\n${sharedContext}`)
  if (siblings.length) {
    const lines = siblings.map(
      (s) => `- ${s.title}${s.result ? `\n    → result so far: ${truncate(s.result, 300)}` : ''}`,
    )
    contextParts.push(`OTHER STEPS IN THIS PLAN:\n${lines.join('\n')}`)
  }
  const planContext = contextParts.join('\n\n')

  const run = await prisma.agentRun.create({
    data: {
      userId,
      taskId: task.id,
      agentType: 'EXECUTE',
      status: 'PENDING',
      input: { taskId: task.id, title: task.title, demo, hasReply: Boolean(reply) },
    },
  })

  try {
    let result: string
    const sources: ExecuteSource[] = []
    let tokensUsed = 0

    if (demo) {
      result =
        `Demo mode — add a Gemini API key and the agent will actually search the web ` +
        `and report real results for “${task.title}” right here.`
    } else {
      const prompt = [
        `TASK TO DO: ${task.title}` + (task.description ? `\n${task.description}` : ''),
        planContext ? `\nPLAN CONTEXT (use this, don't re-ask):\n${planContext}` : '',
        reply ? `\nTHE USER JUST ANSWERED YOUR QUESTIONS / ADDED DETAILS:\n${reply}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      const response = await getGemini().models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ googleSearch: {} }],
        },
      })

      result = response.text?.trim() ?? ''
      if (!result) throw new Error('The agent did not return a result.')
      tokensUsed = response.usageMetadata?.totalTokenCount ?? 0

      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? []
      const seen = new Set<string>()
      for (const chunk of chunks) {
        const uri = chunk.web?.uri
        if (uri && !seen.has(uri)) {
          seen.add(uri)
          sources.push({ uri, title: chunk.web?.title ?? uri })
        }
      }
    }

    // Persist the result on the task so it survives a reload.
    await prisma.task.update({
      where: { id: task.id },
      data: { result, resultAt: new Date() },
    })

    // Sync: save the user's answer onto the plan's root so every other agent
    // working on this plan can read it and won't ask the same thing again.
    if (reply?.trim()) {
      const target = root ?? (await prisma.task.findFirst({ where: { id: task.id, userId } }))
      if (target) {
        const merged = [target.context?.trim(), reply.trim()].filter(Boolean).join('\n')
        await prisma.task.update({ where: { id: target.id }, data: { context: merged } })
      }
    }

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: 'SUCCESS',
        output: { demo, result, sources },
        tokensUsed,
        completedAt: new Date(),
      },
    })

    return { agentRunId: run.id, result, sources }
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
