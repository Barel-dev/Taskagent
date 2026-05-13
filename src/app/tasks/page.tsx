import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { TaskList } from '@/components/task-list'
import { listTasksForUser } from '@/lib/tasks'
import { ShaderBackground } from '@/components/ui/shader-background'

export default async function TasksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const tasks = await listTasksForUser(session.user.id)
  // serialize Date fields for client components
  const initial = tasks.map((t) => ({
    ...t,
    dueDate: t.dueDate?.toISOString() ?? null,
  })) as Parameters<typeof TaskList>[0]['initialTasks']

  return (
    <div className="relative isolate min-h-screen">
      {/* Dimmed shader background — present but not distracting from task work */}
      <ShaderBackground opacity={0.35} />
      {/* Heavy dark overlay so cards/text stay legible against the moving shader */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-black/55" />
      <Header />
      <TaskList initialTasks={initial} />
    </div>
  )
}
