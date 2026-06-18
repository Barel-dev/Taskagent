import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { listArchivedTasksForUser } from '@/lib/tasks'
import { ShaderBackground } from '@/components/ui/shader-background'
import { ArchiveList } from '@/components/archive-list'

export const dynamic = 'force-dynamic'

export default async function ArchivePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const tasks = await listArchivedTasksForUser(session.user.id)
  const items = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    archivedAt: t.archivedAt?.toISOString() ?? null,
    childCount: t.children.length,
  }))

  return (
    <div className="relative isolate min-h-screen">
      <ShaderBackground opacity={0.35} />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-black/55" />
      <Header />
      <ArchiveList items={items} />
    </div>
  )
}
