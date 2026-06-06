import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { duplicateTaskForUser } from '@/lib/tasks'

type Ctx = { params: Promise<{ id: string }> }

export async function POST(_req: Request, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const task = await duplicateTaskForUser(session.user.id, id)
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ task }, { status: 201 })
}
