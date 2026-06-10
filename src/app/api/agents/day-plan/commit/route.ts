import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { setTaskTimeBlocks } from '@/lib/tasks'

// Apply the day plan the user reviewed and approved: write the time blocks
// onto the tasks. Only ever hit from the "Apply plan" button.

const schema = z.object({
  blocks: z
    .array(
      z.object({
        taskId: z.string().min(1),
        start: z.coerce.date(),
        end: z.coerce.date(),
      }),
    )
    .min(1)
    .max(10),
})

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }
  if (parsed.data.blocks.some((b) => b.end <= b.start)) {
    return NextResponse.json({ error: 'Each block must end after it starts' }, { status: 400 })
  }

  const applied = await setTaskTimeBlocks(session.user.id, parsed.data.blocks)
  return NextResponse.json({ applied })
}
