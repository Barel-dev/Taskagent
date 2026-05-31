import type { Task } from '@prisma/client'
import { getGemini, GEMINI_MODEL } from '@/lib/gemini'
import { prisma } from '@/lib/prisma'

// The Execute agent actually *carries out* a task using live Google Search
// (grounding), rather than planning or breaking it down. For "search for a
// trip to Lisbon" it really searches the web and reports concrete options.

export type ExecuteSource = { title: string; uri: string }
export type ExecuteResult = {
  agentRunId: string
  result: string
  sources: ExecuteSource[]
}

const SYSTEM_PROMPT = `You are the Execute agent inside TaskAgent. The user has a task and wants you to actually carry it out — not plan it or break it into subtasks.

Use Google Search to find current, real information and do the task as far as you can on your own:
- For research / search / "find" tasks (flights, deals, options, prices, information): return concrete, current findings — specific options with names, prices or figures, key details, and dates. Organize with short headers or bullet points so it's skimmable.
- Be specific and genuinely useful: real results, not generic advice.
- If finishing the task needs an action you cannot take yourself (booking, paying, sending a message, signing in), do all the research first, then clearly state the single next step the user must take.

Keep it concise.`

export async function runExecuteAgent(params: {
  userId: string
  task: Pick<Task, 'id' | 'title' | 'description'>
  /** When true, skip the Gemini call and return a free placeholder result. */
  demo?: boolean
}): Promise<ExecuteResult> {
  const { userId, task, demo = false } = params

  const run = await prisma.agentRun.create({
    data: {
      userId,
      taskId: task.id,
      agentType: 'EXECUTE',
      status: 'PENDING',
      input: { taskId: task.id, title: task.title, demo },
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
      const prompt =
        `Task: ${task.title}` + (task.description ? `\n\nDetails: ${task.description}` : '')

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

      // Collect the web sources the answer was grounded in (deduped).
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
