import Link from 'next/link'
import { signIn } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Sparkles } from 'lucide-react'

export default function SignInPage() {
  return (
    <div className="dark bg-background text-foreground relative flex min-h-screen flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(70% 50% at 50% 0%, rgba(139,92,246,0.18), transparent 60%), radial-gradient(40% 40% at 80% 80%, rgba(56,189,248,0.10), transparent 60%)',
        }}
      />

      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">TaskAgent</span>
        </Link>
        <Link href="/" className="text-sm text-white/60 hover:text-white/80">
          ← Back home
        </Link>
      </header>

      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Welcome to TaskAgent
            </h1>
            <p className="mt-3 text-sm text-white/60">
              Sign in with Google to start planning with your AI agents.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur">
            <form
              action={async () => {
                'use server'
                await signIn('google', { redirectTo: '/tasks' })
              }}
            >
              <Button
                type="submit"
                size="lg"
                className="h-12 w-full bg-white text-black hover:bg-white/90"
              >
                <GoogleIcon />
                <span className="ml-2 font-medium">Continue with Google</span>
              </Button>
            </form>
            <p className="mt-4 text-center text-xs text-white/40">
              By signing in you agree to nothing. This is a personal portfolio project.
            </p>
          </div>

          <p className="mt-6 text-center text-xs text-white/40">
            Trouble signing in? Make sure your email is added as a test user in Google Cloud → OAuth
            consent screen.
          </p>
        </div>
      </main>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  )
}
