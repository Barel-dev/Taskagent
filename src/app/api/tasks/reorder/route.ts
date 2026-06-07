import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { reorderTasksForUser } from '@/lib/tasks'

const schema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  await reorderTasksForUser(session.user.id, parsed.data.ids)
  return NextResponse.json({ ok: true })
}
