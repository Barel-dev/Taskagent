import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { TodayView } from '@/components/today-view'
import { listTasksForUser, type TaskNode } from '@/lib/tasks'
import { ShaderBackground } from '@/components/ui/shader-background'

export const dynamic = 'force-dynamic'

export default async function TodayPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const tasks = await listTasksForUser(session.user.id)
  const serialize = (t: TaskNode): unknown => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
    scheduledStart: t.scheduledStart?.toISOString() ?? null,
    scheduledEnd: t.scheduledEnd?.toISOString() ?? null,
    children: t.children.map(serialize),
  })
  const initial = tasks.map(serialize) as Parameters<typeof TodayView>[0]['tasks']

  return (
    <div className="relative isolate min-h-screen">
      <ShaderBackground opacity={0.35} />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-black/55" />
      <Header />
      <TodayView tasks={initial} userName={session.user.name ?? undefined} />
    </div>
  )
}
