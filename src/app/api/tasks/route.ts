import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createTaskSchema } from '@/lib/validators'
import { createTaskForUser, listTasksForUser } from '@/lib/tasks'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tasks = await listTasksForUser(session.user.id)
  return NextResponse.json({ tasks })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = createTaskSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.flatten() }, { status: 400 })
  }

  const task = await createTaskForUser(session.user.id, parsed.data)
  return NextResponse.json({ task }, { status: 201 })
}
