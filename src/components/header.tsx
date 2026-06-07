import Link from 'next/link'
import { Sparkles } from 'lucide-react'
import { auth, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { MainNav } from '@/components/main-nav'
import { CommandPalette } from '@/components/command-palette'
import { DueReminders } from '@/components/due-reminders'

export async function Header() {
  const session = await auth()
  const user = session?.user

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0e1a]/70 backdrop-blur-xl">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 shadow-lg shadow-violet-900/30">
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-white">TaskAgent</span>
          </Link>
          {user && <MainNav />}
        </div>

        {user && (
          <div className="flex items-center gap-3">
            <DueReminders />
            <CommandPalette />
            <span className="hidden text-sm text-white/50 md:inline">{user.email}</span>
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                referrerPolicy="no-referrer"
                className="h-7 w-7 rounded-full border border-white/15"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-medium text-white/70">
                {(user.email ?? user.name ?? '?').charAt(0).toUpperCase()}
              </span>
            )}
            <form
              action={async () => {
                'use server'
                await signOut({ redirectTo: '/signin' })
              }}
            >
              <Button
                variant="outline"
                size="sm"
                type="submit"
                className="border-white/15 text-white/75 hover:bg-white/5"
              >
                Sign out
              </Button>
            </form>
          </div>
        )}
      </div>
    </header>
  )
}
