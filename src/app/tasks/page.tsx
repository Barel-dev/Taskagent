import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { TaskList } from '@/components/task-list'
import { listTasksForUser } from '@/lib/tasks'

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
    <>
      <Header />
      <TaskList initialTasks={initial} />
    </>
  )
}
