import Link from 'next/link'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import { Bot, CalendarClock, Mail, Sparkles, Sun, ListChecks } from 'lucide-react'

export default async function Landing() {
  const session = await auth()
  const isAuthed = !!session?.user

  return (
    <div className="dark bg-background text-foreground relative min-h-screen overflow-hidden">
      {/* radial gradient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(139,92,246,0.18), transparent 60%), radial-gradient(40% 40% at 80% 30%, rgba(56,189,248,0.10), transparent 60%), radial-gradient(40% 40% at 20% 60%, rgba(244,114,182,0.08), transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%224%22 height=%224%22><circle cx=%222%22 cy=%222%22 r=%220.7%22 fill=%22white%22/></svg>")',
        }}
      />

      {/* Top nav */}
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight">TaskAgent</span>
        </Link>
        <nav className="flex items-center gap-3">
          {isAuthed ? (
            <Button asChild size="sm">
              <Link href="/tasks">Open app</Link>
            </Button>
          ) : (
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href="/signin">Sign in</Link>
            </Button>
          )}
        </nav>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-24">
        <div className="flex flex-col items-center gap-6 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-white/70 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />5 AI agents working for you
          </span>
          <h1 className="text-balance max-w-4xl bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-semibold tracking-tight text-transparent sm:text-6xl md:text-7xl">
            Your AI task manager. <br className="hidden md:inline" />
            Let agents do the work.
          </h1>
          <p className="text-pretty max-w-2xl text-base text-white/60 sm:text-lg">
            TaskAgent breaks down what you need to do, schedules it into your week, drafts the
            emails you&apos;ve been avoiding, and briefs you every morning — so you actually finish.
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            {isAuthed ? (
              <Button asChild size="lg" className="px-6">
                <Link href="/tasks">Go to your tasks</Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="px-6">
                <Link href="/signin">Sign in with Google</Link>
              </Button>
            )}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white/15 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href="https://github.com/" target="_blank">
                View on GitHub
              </Link>
            </Button>
          </div>
          <p className="text-xs text-white/40">Free for personal use · No credit card required</p>
        </div>

        {/* Feature grid */}
        <div className="mt-24 grid gap-4 sm:mt-28 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<ListChecks className="h-5 w-5" />}
            title="Breakdown agent"
            body="Turn 'study for finals' into a real plan. Subtasks, time estimates, priorities — generated."
          />
          <FeatureCard
            icon={<Bot className="h-5 w-5" />}
            title="Smart prioritizer"
            body="Asks what matters, weighs urgency vs importance, then reorders your day."
          />
          <FeatureCard
            icon={<CalendarClock className="h-5 w-5" />}
            title="Schedule agent"
            body="Reads your Google Calendar, finds the gaps, books the work in. You just confirm."
          />
          <FeatureCard
            icon={<Mail className="h-5 w-5" />}
            title="Email agent"
            body="'Email Sarah about the budget review.' Drafts, shows it to you, sends on approval."
          />
          <FeatureCard
            icon={<Sun className="h-5 w-5" />}
            title="Daily briefing"
            body="A friendly summary in your inbox at 7am — what's due, what's overdue, what to focus on."
          />
          <FeatureCard
            icon={<Sparkles className="h-5 w-5" />}
            title="Talk to your tasks"
            body="A chat sidebar that knows your todos. 'What's left for the website?' just works."
          />
        </div>

        <footer className="mt-24 border-t border-white/10 pt-8 text-center text-xs text-white/40">
          Built with Next.js 15, Postgres, NextAuth, Anthropic Claude · ©{' '}
          {new Date().getFullYear()} TaskAgent
        </footer>
      </main>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="group rounded-xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition hover:bg-white/[0.06]">
      <div className="mb-4 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 text-violet-200 ring-1 ring-white/10">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-white/60">{body}</p>
    </div>
  )
}
