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
import { CinematicBackground } from '@/components/cinematic-bg'

export default async function Landing() {
  const session = await auth()
  const isAuthed = !!session?.user

  return (
    <div
      className="dark relative isolate min-h-screen overflow-x-clip text-foreground"
      style={{ backgroundColor: '#0a0a0f' }}
    >
      {/* Layered animated background */}
      <BackgroundLayers />
      <Spotlight />

      {/* Top nav */}
      <header className="relative z-10 flex w-full items-center justify-between px-8 py-6 sm:px-12">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)]">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-white">TaskAgent</span>
        </Link>

        {/* Centered nav */}
        <nav className="hidden items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] px-1.5 py-1.5 text-sm text-white/70 backdrop-blur md:flex">
          <Link
            href="#agents"
            className="rounded-full px-3 py-1.5 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            Agents
          </Link>
          <Link
            href="#examples"
            className="rounded-full px-3 py-1.5 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            Examples
          </Link>
          <Link
            href="#how"
            className="rounded-full px-3 py-1.5 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            How it works
          </Link>
        </nav>

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
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            5 specialized agents at your service
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
        </section>

        {/* Features section */}
        <section id="agents" className="relative scroll-mt-24 pb-32">
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

        {/* See it in action — mocked previews */}
        <section id="examples" className="relative scroll-mt-24 pb-32">
          <div className="mb-16 text-center">
            <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              See it in action
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/60">
              Real interactions, like the day you’ll have once an agent has your back.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Chat demo */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
              <div className="mb-4 flex items-center gap-2 text-xs text-white/50">
                <Sparkles className="h-3.5 w-3.5 text-violet-300" />
                Chat with your tasks
              </div>
              <div className="space-y-3 font-mono text-[13px]">
                <ChatBubble role="user">
                  what’s still left for finals week?
                </ChatBubble>
                <ChatBubble role="assistant">
                  You have 4 open items: read CS162 ch.7, finish DB project,
                  meet study group Wed, submit research draft Thu. Want me to
                  schedule them?
                </ChatBubble>
                <ChatBubble role="user">yes, around my classes</ChatBubble>
                <ChatBubble role="assistant" muted>
                  ✓ Scheduled 4 tasks across Mon–Thu evenings.
                </ChatBubble>
              </div>
            </div>

            {/* Breakdown demo */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
              <div className="mb-4 flex items-center gap-2 text-xs text-white/50">
                <ListChecks className="h-3.5 w-3.5 text-violet-300" />
                Breakdown agent
              </div>
              <div className="mb-3 rounded-lg bg-white/[0.04] px-3 py-2 text-sm text-white/80">
                Plan trip to Lisbon
              </div>
              <div className="text-xs uppercase tracking-widest text-white/40">
                Generated subtasks
              </div>
              <ul className="mt-2 space-y-2 text-sm">
                <SubtaskRow time="2h">Book flights & hotel</SubtaskRow>
                <SubtaskRow time="30m">Renew passport check</SubtaskRow>
                <SubtaskRow time="1h">Plan day-by-day itinerary</SubtaskRow>
                <SubtaskRow time="20m">Notify bank of travel</SubtaskRow>
                <SubtaskRow time="45m">Pack & download offline maps</SubtaskRow>
              </ul>
            </div>

            {/* Daily briefing demo */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
              <div className="mb-4 flex items-center gap-2 text-xs text-white/50">
                <Sun className="h-3.5 w-3.5 text-violet-300" />
                Today’s briefing · 7:00 AM
              </div>
              <div className="space-y-3 text-sm leading-relaxed text-white/80">
                <p className="font-medium text-white">Good morning, Barel.</p>
                <p>
                  Today you’ve got <span className="text-violet-300">3 tasks due</span>, and one
                  thing slipping from yesterday: <em className="not-italic text-white">Send invoice to client X</em>.
                </p>
                <p>
                  Your calendar opens up after 4pm — that’s the best window for the database
                  project. I’ll keep you on track.
                </p>
                <div className="mt-4 flex items-center gap-2 border-t border-white/10 pt-3 text-xs text-white/40">
                  <Mail className="h-3 w-3" />
                  Sent to barel57000@gmail.com
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="relative scroll-mt-24 pb-32">
          <div className="mb-16 text-center">
            <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Three steps to your{' '}
              <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                quietest week
              </span>
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <Step
              n="01"
              title="Drop in your tasks"
              body="Type them in. Or paste a brain dump. Or talk to the chat. Whatever feels natural — the app figures out structure."
            />
            <Step
              n="02"
              title="Agents do the work"
              body="Breakdown, prioritization, scheduling, drafting — the five agents run quietly in the background while you focus."
            />
            <Step
              n="03"
              title="You stay in flow"
              body="Each morning a calm briefing arrives in your inbox. Each evening, more is done than you expected."
            />
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="relative pb-32">
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/5 to-transparent px-8 py-16 text-center backdrop-blur sm:px-16">
            <h2 className="text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Ready to let the agents work?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/60">
              Free for personal use. Sign in with Google and you’re in.
            </p>
            <div className="mt-8 flex justify-center">
              {isAuthed ? (
                <Button asChild size="lg" className="group h-12 px-7 text-base">
                  <Link href="/tasks">
                    Open your tasks
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              ) : (
                <Button
                  asChild
                  size="lg"
                  className="group h-12 px-7 text-base shadow-[0_0_40px_rgba(139,92,246,0.4)]"
                >
                  <Link href="/signin">
                    Sign in with Google
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </section>

        <footer className="relative z-10 flex flex-col items-center gap-2 border-t border-white/10 py-10 text-center text-xs text-white/40 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} TaskAgent</span>
          <span>Built with Next.js, Postgres, NextAuth, Anthropic Claude</span>
        </footer>
      </main>
    </div>
  )
}

function ChatBubble({
  role,
  muted,
  children,
}: {
  role: 'user' | 'assistant'
  muted?: boolean
  children: React.ReactNode
}) {
  if (role === 'user') {
    return (
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-violet-500/20 px-3 py-2 text-white/90 ring-1 ring-violet-400/20">
        {children}
      </div>
    )
  }
  return (
    <div
      className={`max-w-[90%] rounded-2xl rounded-bl-md bg-white/[0.04] px-3 py-2 ring-1 ring-white/5 ${muted ? 'text-emerald-300/80' : 'text-white/80'}`}
    >
      {children}
    </div>
  )
}

function SubtaskRow({ time, children }: { time: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md bg-white/[0.02] px-3 py-2 text-white/80 ring-1 ring-white/5">
      <span className="flex items-center gap-2">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
        {children}
      </span>
      <span className="text-xs text-white/40">{time}</span>
    </li>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur">
      <div className="mb-4 inline-block rounded-lg bg-gradient-to-br from-violet-500/30 to-fuchsia-500/30 px-2.5 py-1 font-mono text-xs text-violet-200 ring-1 ring-white/10">
        {n}
      </div>
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/60">{body}</p>
    </div>
  )
}

function BackgroundLayers() {
  return <CinematicBackground />
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
