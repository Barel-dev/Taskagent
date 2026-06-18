import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

type Ctx = { params: Promise<{ id: string }> }

// Read-only audit trail for one task: the agent runs recorded against it,
// newest first. Ownership-checked, so a user only ever sees their own runs.
export async function GET(_req: Request, { params }: Ctx) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params

  const task = await prisma.task.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const runs = await prisma.agentRun.findMany({
    where: { userId: session.user.id, taskId: id },
    orderBy: { createdAt: 'desc' },
    take: 25,
    select: { id: true, agentType: true, status: true, tokensUsed: true, createdAt: true },
  })
  return NextResponse.json({ runs })
}
