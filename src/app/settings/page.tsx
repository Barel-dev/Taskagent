import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { ShaderBackground } from '@/components/ui/shader-background'
import { SettingsForm } from '@/components/settings-form'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { briefingEmail: true },
  })

  return (
    <div className="relative isolate min-h-screen">
      <ShaderBackground opacity={0.35} />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-black/55" />
      <Header />

      <div className="mx-auto max-w-2xl space-y-8 px-6 py-10">
        <header>
          <p className="text-[11px] font-medium tracking-[0.25em] text-violet-300/70 uppercase">
            Settings
          </p>
          <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-white">
            Your <span className="text-violet-300">preferences</span>
          </h2>
          <p className="mt-1.5 text-sm text-white/50">
            Saved on this device and applied across the app — the briefing email is saved to your
            account.
          </p>
        </header>

        <SettingsForm initialBriefingEmail={user?.briefingEmail ?? false} />
      </div>
    </div>
  )
}
