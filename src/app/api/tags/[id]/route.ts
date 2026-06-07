import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { updateTagSchema } from '@/lib/validators'
import { renameTagForUser, setTagColorForUser, deleteTagForUser } from '@/lib/tags'

type Ctx = { params: Promise<{ id: string }> }

export async function PATCH(req: Request, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const body = await req.json().catch(() => null)
  const parsed = updateTagSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', issues: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    let tag = null
    if (parsed.data.name !== undefined) {
      tag = await renameTagForUser(session.user.id, id, parsed.data.name)
      if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (parsed.data.color !== undefined) {
      tag = await setTagColorForUser(session.user.id, id, parsed.data.color)
      if (!tag) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json({ tag })
  } catch (err) {
    // Unique violation on (userId, name) — a tag with that name already exists.
    if ((err as { code?: string })?.code === 'P2002') {
      return NextResponse.json({ error: 'A tag with that name already exists' }, { status: 409 })
    }
    throw err
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const ok = await deleteTagForUser(session.user.id, id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return new NextResponse(null, { status: 204 })
}
