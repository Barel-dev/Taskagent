import { auth, signOut } from '@/lib/auth'
import { Button } from '@/components/ui/button'

export async function Header() {
  const session = await auth()

  return (
    <header className="flex items-center justify-between border-b px-6 py-4">
      <h1 className="text-lg font-semibold">TaskAgent</h1>
      {session?.user && (
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground text-sm">{session.user.email}</span>
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
