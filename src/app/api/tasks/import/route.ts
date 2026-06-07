import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { createTaskSchema } from '@/lib/validators'
import { createTaskForUser } from '@/lib/tasks'

const schema = z.object({
  tasks: z.array(createTaskSchema).min(1).max(200),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid import data' }, { status: 400 })
  }

  // Create sequentially to stay gentle on the connection pool.
  let created = 0
  for (const task of parsed.data.tasks) {
    await createTaskForUser(session.user.id, task)
    created++
  }

  return NextResponse.json({ created }, { status: 201 })
}
