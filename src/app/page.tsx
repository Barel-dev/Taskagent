import Link from 'next/link'
import { auth } from '@/lib/auth'
import { Button } from '@/components/ui/button'
import {
  Bot,
  CalendarClock,
  Mail,
  Sparkles,
  Sun,
  ListChecks,
  ArrowRight,
} from 'lucide-react'
import { Spotlight } from '@/components/spotlight'

export default async function Landing() {
  const session = await auth()
  const isAuthed = !!session?.user

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-[#0a0a0f] text-foreground">
      {/* Layered animated background */}
      <BackgroundLayers />
      <Spotlight />

      {/* Top nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">TaskAgent</span>
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
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href="/signin">Sign in</Link>
            </Button>
          )}
        </nav>
      </header>

      {/* Hero — full viewport */}
      <main className="relative z-10 mx-auto max-w-6xl px-6">
        <section className="flex min-h-[calc(100vh-7rem)] flex-col items-center justify-center pt-12 pb-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70 backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            5 AI agents working for you
          </div>

          <h1 className="max-w-5xl text-balance bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-6xl font-semibold leading-[1.05] tracking-tight text-transparent sm:text-7xl md:text-8xl">
            Your AI task manager.
            <br />
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Let agents do the work.
            </span>
          </h1>

          <p className="mt-8 max-w-2xl text-pretty text-base text-white/60 sm:text-lg">
            TaskAgent breaks down what you need to do, schedules it into your week, drafts the
            emails you&apos;ve been avoiding, and briefs you every morning — so you actually finish.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            {isAuthed ? (
              <Button asChild size="lg" className="group h-12 px-7 text-base">
                <Link href="/tasks">
                  Go to your tasks
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="group h-12 px-7 text-base shadow-[0_0_40px_rgba(139,92,246,0.4)]">
                <Link href="/signin">
                  Sign in with Google
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            )}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 border-white/10 bg-white/[0.03] px-6 text-base text-white hover:bg-white/[0.07]"
            >
              <Link href="https://github.com/" target="_blank">View on GitHub</Link>
            </Button>
          </div>

          <p className="mt-5 text-xs text-white/40">
            Free for personal use · No credit card required
          </p>

          {/* Tech stack strip */}
          <div className="mt-20 w-full">
            <p className="mb-4 text-center text-[11px] font-medium uppercase tracking-widest text-white/40">
              Built with
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-white/50">
              <TechBadge>Next.js 15</TechBadge>
              <TechBadge>TypeScript</TechBadge>
              <TechBadge>PostgreSQL</TechBadge>
              <TechBadge>Anthropic Claude</TechBadge>
              <TechBadge>NextAuth</TechBadge>
              <TechBadge>Prisma</TechBadge>
              <TechBadge>Tailwind</TechBadge>
            </div>
          </div>
        </section>

        {/* Features section */}
        <section className="relative pb-32">
          <div className="mb-16 text-center">
            <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Five agents,{' '}
              <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                one inbox of done
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/60">
              Each agent is specialized for a single job and runs in the background while you
              live your life.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              body="‘Email Sarah about the budget review.' Drafts, shows it to you, sends on approval."
            />
            <FeatureCard
              icon={<Sun className="h-5 w-5" />}
              title="Daily briefing"
              body="A friendly summary in your inbox at 7am — what's due, what's overdue, what to focus on."
            />
            <FeatureCard
              icon={<Sparkles className="h-5 w-5" />}
              title="Talk to your tasks"
              body="A chat sidebar that knows your todos. ‘What's left for the website?' just works."
            />
          </div>
        </section>

        <footer className="relative z-10 border-t border-white/10 py-10 text-center text-xs text-white/40">
          Built with Next.js 15, Postgres, NextAuth, Anthropic Claude · ©{' '}
          {new Date().getFullYear()} TaskAgent
        </footer>
      </main>
    </div>
  )
}

function BackgroundLayers() {
  return (
    <>
      {/* Animated grid */}
      <div className="bg-grid bg-grid-radial-mask animate-drift pointer-events-none absolute inset-0 -z-10" />
      {/* Aurora gradient */}
      <div
        aria-hidden
        className="animate-glow-pulse pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 0%, rgba(139,92,246,0.22), transparent 65%), radial-gradient(45% 40% at 80% 30%, rgba(56,189,248,0.10), transparent 65%), radial-gradient(45% 40% at 20% 70%, rgba(244,114,182,0.10), transparent 65%)',
        }}
      />
      {/* Bottom horizon glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-[40%]"
        style={{
          background:
            'radial-gradient(70% 100% at 50% 100%, rgba(139,92,246,0.15), transparent 60%)',
        }}
      />
      {/* Vignette */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 80% at 50% 50%, transparent 50%, rgba(0,0,0,0.6) 100%)',
        }}
      />
    </>
  )
}

function TechBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[12px] font-medium text-white/70 backdrop-blur">
      {children}
    </span>
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
    <div className="card-glow group rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition-colors hover:bg-white/[0.05]">
      <div className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 text-violet-200 ring-1 ring-white/10 transition-transform group-hover:scale-105">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>
    </div>
  )
}
