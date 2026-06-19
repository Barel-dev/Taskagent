import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { ShaderBackground } from '@/components/ui/shader-background'
import { AgentActivityList } from '@/components/agent-activity-list'

export const dynamic = 'force-dynamic'

// The full agent "jobs" history — every run the user's agents have made,
// newest first, filterable by agent. The dashboard shows a recent slice; this
// is the complete log.
export default async function ActivityPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const runs = await prisma.agentRun.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      agentType: true,
      status: true,
      tokensUsed: true,
      createdAt: true,
      input: true,
      output: true,
      error: true,
    },
  })
  const items = runs.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }))

  return (
    <div className="relative isolate min-h-screen">
      <ShaderBackground opacity={0.35} />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-black/55" />
      <Header />
      <AgentActivityList runs={items} />
    </div>
  )
}
