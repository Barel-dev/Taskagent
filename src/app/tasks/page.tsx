import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { TaskList } from '@/components/task-list'
import { listTasksForUser, type TaskNode } from '@/lib/tasks'
import { ShaderBackground } from '@/components/ui/shader-background'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string; priority?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')
  const { task, priority } = await searchParams
  const initialPriority =
    priority === 'LOW' || priority === 'MEDIUM' || priority === 'HIGH' || priority === 'URGENT'
      ? priority
      : undefined

  const tasks = await listTasksForUser(session.user.id)
  // Recursively serialize Date fields for client components (tree of any depth).
  const serialize = (t: TaskNode): unknown => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
    scheduledStart: t.scheduledStart?.toISOString() ?? null,
    scheduledEnd: t.scheduledEnd?.toISOString() ?? null,
    children: t.children.map(serialize),
  })
  const initial = tasks.map(serialize) as Parameters<typeof TaskList>[0]['initialTasks']

  return (
    <div className="relative isolate min-h-screen">
      {/* Dimmed shader background — present but not distracting from task work */}
      <ShaderBackground opacity={0.35} />
      {/* Heavy dark overlay so cards/text stay legible against the moving shader */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-black/55" />
      <Header />
      <TaskList
        initialTasks={initial}
        openTaskId={task}
        userName={session.user.name ?? undefined}
        initialPriority={initialPriority}
      />
    </div>
  )
}
