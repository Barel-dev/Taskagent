import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Record a completed focus (Pomodoro) session. Cheap and auth'd; the timer
// fires it best-effort on completion so focus time is durable and cross-device.
const schema = z.object({
  taskId: z.string().min(1).optional(),
  minutes: z.number().int().min(1).max(240).default(25),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  // Only attach a taskId that belongs to this user; otherwise record it loose.
  let taskId: string | null = null
  if (parsed.data.taskId) {
    const owned = await prisma.task.findFirst({
      where: { id: parsed.data.taskId, userId: session.user.id },
      select: { id: true },
    })
    taskId = owned?.id ?? null
  }

  await prisma.focusSession.create({
    data: { userId: session.user.id, taskId, minutes: parsed.data.minutes },
  })
  return NextResponse.json({ ok: true }, { status: 201 })
}
