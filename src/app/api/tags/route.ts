import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createTagSchema } from '@/lib/validators'
import { listTagsForUser, createTagForUser } from '@/lib/tags'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tags = await listTagsForUser(session.user.id)
  return NextResponse.json({ tags })
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const parsed = createTagSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  const tag = await createTagForUser(session.user.id, parsed.data.name)
  return NextResponse.json({ tag }, { status: 201 })
}
