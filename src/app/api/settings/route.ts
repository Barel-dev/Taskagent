import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Server-backed user preferences (most settings are on-device localStorage;
// this is for the few that agents need server-side, like the briefing email).

const schema = z.object({
  briefingEmail: z.boolean(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { briefingEmail: true },
  })
  return NextResponse.json({ briefingEmail: user?.briefingEmail ?? false })
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { briefingEmail: parsed.data.briefingEmail },
  })
  return NextResponse.json({ ok: true, briefingEmail: parsed.data.briefingEmail })
}
