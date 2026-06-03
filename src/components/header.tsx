import Link from 'next/link'
import { auth, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export async function Header() {
  const session = await auth()

  return (
    <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-semibold text-white">
          TaskAgent
        </Link>
        {session?.user && (
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href="/tasks"
              className="rounded-md px-2.5 py-1 text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              Tasks
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md px-2.5 py-1 text-white/70 transition-colors hover:bg-white/5 hover:text-white"
            >
              Dashboard
            </Link>
          </nav>
        )}
      </div>
      {session?.user && (
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-white/50 sm:inline">{session.user.email}</span>
          <form
            action={async () => {
              'use server'
              await signOut({ redirectTo: '/signin' })
            }}
          >
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      )}
    </header>
  )
}
