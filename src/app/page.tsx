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
import { LandingBg } from '@/components/landing-bg'
import { Reveal } from '@/components/reveal'
import { OrbitalVisual } from '@/components/orbital-visual'
import { Spotlight } from '@/components/spotlight'
import { ScrollProgress } from '@/components/scroll-progress'
import { ParallaxWrap } from '@/components/parallax'

const PRIMARY_CTA_CLASSES =
  'group h-11 px-6 text-sm shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-transform hover:scale-[1.02] hover:shadow-[0_0_60px_rgba(139,92,246,0.5)]'

export default async function Landing() {
  const session = await auth()
  const isAuthed = !!session?.user

  return (
    <div className="relative isolate text-foreground">
      <LandingBg />
      <Spotlight />
      <ScrollProgress />

      {/* Sticky header */}
      <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-white/5 bg-[#0a0e1a]/80 px-8 backdrop-blur-xl sm:px-12">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_0_18px_rgba(139,92,246,0.35)]">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">
            TaskAgent
          </span>
        </Link>

        {/* Centered nav */}
        <nav className="hidden items-center gap-6 text-sm text-white/60 md:flex">
          <Link
            href="#agents"
            className="transition-colors hover:text-white"
          >
            Agents
          </Link>
          <Link
            href="#examples"
            className="transition-colors hover:text-white"
          >
            Examples
          </Link>
          <Link
            href="#how"
            className="transition-colors hover:text-white"
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

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto flex min-h-[90vh] max-w-6xl flex-col items-center px-6 pt-32 pb-40 text-center">
          <div
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-medium text-white/70 backdrop-blur animate-pill-pulse"
          >
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            5 specialized agents at your service
          </div>

          <h1 className="text-balance text-6xl font-semibold leading-[0.95] tracking-[-0.04em] text-white sm:text-7xl md:text-8xl lg:text-[8rem]">
            Plan less.
            <br />
            Decide less.
            <br />
            <span className="bg-gradient-to-r from-violet-300 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
              Finish more.
            </span>
          </h1>

          <p className="mt-9 max-w-2xl text-pretty text-base leading-relaxed text-white/55 sm:text-lg">
            TaskAgent breaks down what you need to do, schedules it into your
            week, drafts the emails you{'’'}ve been avoiding, and briefs you
            every morning.
          </p>

          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
            {isAuthed ? (
              <Button asChild size="lg" className={PRIMARY_CTA_CLASSES}>
                <Link href="/tasks">
                  Go to your tasks
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            ) : (
              <Button asChild size="lg" className={PRIMARY_CTA_CLASSES}>
                <Link href="/signin">
                  Sign in with Google
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
            )}
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-11 border-white/10 bg-transparent px-6 text-sm text-white hover:bg-white/[0.06]"
            >
              <Link href="https://github.com/" target="_blank">
                View on GitHub
              </Link>
            </Button>
          </div>

          <p className="mt-5 text-xs text-white/35">
            Free for personal use · No credit card required
          </p>

          <ParallaxWrap speed={0.1} className="w-full">
            <OrbitalVisual />
          </ParallaxWrap>
        </section>

        {/* Product mockup section */}
        <section className="mx-auto max-w-6xl px-6 pb-32 text-center">
          <Reveal>
            <p className="mb-6 text-sm font-medium tracking-wide text-violet-300">
              The product
            </p>
            <h2 className="mb-16 text-balance text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
              Designed to feel calm.
              <br />
              Built to ship work.
            </h2>
            <ProductMockup />
          </Reveal>
        </section>

        {/* Section 1 — Breakdown agent */}
        <section id="agents" className="mx-auto max-w-6xl scroll-mt-24 px-6">
          <div className="grid items-center gap-12 py-28 md:grid-cols-2 md:gap-16">
            <Reveal direction="left" className="order-2 md:order-1">
              <SpotlightText
                eyebrow="01 — Breakdown"
                title="From a single sentence to a real plan."
                body={
                  <>
                    Drop in something vague like {'“'}study for finals{'”'} or
                    {' '}{'“'}plan trip to Lisbon.{'”'} The breakdown agent turns
                    it into ordered subtasks with time estimates and priorities
                    — ready to schedule, ready to check off.
                  </>
                }
                bullets={[
                  'Realistic time estimates for each subtask',
                  'Smart priority ordering, not alphabetical',
                  'One click sends them to the schedule agent',
                ]}
              />
            </Reveal>
            <Reveal direction="right" delay={150} className="order-1 md:order-2">
              <BreakdownVisual />
            </Reveal>
          </div>
        </section>

        {/* Section 2 — Email agent (reverse: text right, visual left) */}
        <section className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 py-28 md:grid-cols-2 md:gap-16">
            <Reveal direction="left" delay={150} className="order-1 md:order-1">
              <EmailVisual />
            </Reveal>
            <Reveal direction="right" className="order-2 md:order-2">
              <SpotlightText
                eyebrow="02 — Email"
                title={`Drafts the email you${'’'}ve been putting off.`}
                body={
                  <>
                    Tell it the goal — {'“'}email Sarah about next quarter{'’'}s
                    budget{'”'} — and the email agent writes the message in
                    your voice. You read it, tweak a word, send. The dread is
                    gone.
                  </>
                }
                bullets={[
                  'Learns your tone from past replies',
                  'Always shows the draft before sending',
                  'Sends through your real Gmail account',
                ]}
              />
            </Reveal>
          </div>
        </section>

        {/* Section 3 — Schedule agent */}
        <section className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 py-28 md:grid-cols-2 md:gap-16">
            <Reveal direction="left" className="order-2 md:order-1">
              <SpotlightText
                eyebrow="03 — Schedule"
                title="Books the work into the week, around real life."
                body={
                  <>
                    The schedule agent reads your calendar, finds the gaps
                    between meetings, and slots in your tasks where they
                    actually fit. Deep-work blocks in the morning, errands in
                    the cracks. You approve.
                  </>
                }
                bullets={[
                  'Reads your real Google Calendar',
                  'Respects deep-work blocks and meetings',
                  'Confirms before adding anything',
                ]}
              />
            </Reveal>
            <Reveal direction="right" delay={150} className="order-1 md:order-2">
              <ScheduleVisual />
            </Reveal>
          </div>
        </section>

        {/* The 5 agents grid */}
        <section
          id="examples"
          className="mx-auto max-w-6xl scroll-mt-24 px-6 pt-40 pb-32"
        >
          <Reveal>
            <div className="mb-16 text-center">
              <h2 className="text-balance text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
                Five agents,{' '}
                <span className="bg-gradient-to-r from-violet-300 to-fuchsia-400 bg-clip-text text-transparent">
                  one inbox of done
                </span>
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/55">
                Each agent is specialized for a single job and runs in the
                background while you live your life.
              </p>
            </div>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <Reveal delay={0}>
              <AgentCard
                icon={<ListChecks className="h-5 w-5" />}
                title="Breakdown agent"
                body={`Turn ${'‘'}study for finals${'’'} into a real plan. Subtasks, time estimates, priorities — generated.`}
              />
            </Reveal>
            <Reveal delay={80}>
              <AgentCard
                icon={<Bot className="h-5 w-5" />}
                title="Smart prioritizer"
                body="Asks what matters, weighs urgency vs importance, then reorders your day."
              />
            </Reveal>
            <Reveal delay={160}>
              <AgentCard
                icon={<CalendarClock className="h-5 w-5" />}
                title="Schedule agent"
                body="Reads your Google Calendar, finds the gaps, books the work in. You just confirm."
              />
            </Reveal>
            <Reveal delay={240}>
              <AgentCard
                icon={<Mail className="h-5 w-5" />}
                title="Email agent"
                body={`${'‘'}Email Sarah about the budget review.${'’'} Drafts, shows it to you, sends on approval.`}
              />
            </Reveal>
            <Reveal delay={320}>
              <AgentCard
                icon={<Sun className="h-5 w-5" />}
                title="Daily briefing"
                body={`A friendly summary in your inbox at 7am — what${'’'}s due, what${'’'}s overdue, what to focus on.`}
              />
            </Reveal>
            <Reveal delay={400}>
              <AgentCard
                icon={<Sparkles className="h-5 w-5" />}
                title="Talk to your tasks"
                body={`A chat sidebar that knows your todos. ${'‘'}What${'’'}s left for the website?${'’'} just works.`}
              />
            </Reveal>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how"
          className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-32"
        >
          <Reveal>
            <div className="mb-16 text-center">
              <h2 className="text-balance text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
                Three steps to your{' '}
                <span className="bg-gradient-to-r from-violet-300 to-fuchsia-400 bg-clip-text text-transparent">
                  quietest week
                </span>
              </h2>
            </div>
          </Reveal>

          <div className="grid gap-5 md:grid-cols-3">
            <Reveal delay={0}>
              <Step
                n="01"
                title="Drop in your tasks"
                body="Type them in. Or paste a brain dump. Or talk to the chat. Whatever feels natural — the app figures out structure."
              />
            </Reveal>
            <Reveal delay={100}>
              <Step
                n="02"
                title="Agents do the work"
                body="Breakdown, prioritization, scheduling, drafting — the five agents run quietly in the background while you focus."
              />
            </Reveal>
            <Reveal delay={200}>
              <Step
                n="03"
                title="You stay in flow"
                body="Each morning a calm briefing arrives in your inbox. Each evening, more is done than you expected."
              />
            </Reveal>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="mx-auto max-w-6xl px-6 pb-24">
          <Reveal>
            <div className="relative isolate overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-fuchsia-500/[0.04] to-transparent px-12 py-24 text-center backdrop-blur-sm before:absolute before:inset-0 before:rounded-3xl before:bg-[radial-gradient(closest-side,rgba(139,92,246,0.15),transparent_70%)] before:blur-2xl">
              <h2 className="text-balance text-5xl font-semibold tracking-[-0.02em] text-white sm:text-6xl">
                Ready to let the agents work?
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/55">
                Free for personal use. Sign in with Google and you{'’'}re in.
              </p>
              <div className="mt-10 flex justify-center">
                {isAuthed ? (
                  <Button asChild size="lg" className={PRIMARY_CTA_CLASSES}>
                    <Link href="/tasks">
                      Open your tasks
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                ) : (
                  <Button asChild size="lg" className={PRIMARY_CTA_CLASSES}>
                    <Link href="/signin">
                      Sign in with Google
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </Reveal>
        </section>

        <footer className="mx-auto max-w-6xl border-t border-white/10 px-6 py-16">
          <div className="grid gap-12 md:grid-cols-3">
            <div>
              <Link href="/" className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-md bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="text-lg font-semibold tracking-tight text-white">
                  TaskAgent
                </span>
              </Link>
              <p className="mt-4 max-w-xs text-sm text-white/50">
                AI task manager with five autonomous agents.
              </p>
            </div>
            <div>
              <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
                Product
              </p>
              <ul className="space-y-2 text-sm text-white/70">
                <li>
                  <Link href="#agents" className="hover:text-white">
                    Agents
                  </Link>
                </li>
                <li>
                  <Link href="#examples" className="hover:text-white">
                    Examples
                  </Link>
                </li>
                <li>
                  <Link href="#how" className="hover:text-white">
                    How it works
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-4 text-xs font-medium uppercase tracking-widest text-white/40">
                Built with
              </p>
              <ul className="space-y-2 text-sm text-white/70">
                <li>Next.js 15</li>
                <li>Anthropic Claude</li>
                <li>PostgreSQL</li>
                <li>NextAuth</li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t border-white/5 pt-6 text-center text-xs text-white/40">
            © {new Date().getFullYear()} TaskAgent
          </div>
        </footer>
      </main>
    </div>
  )
}

/* ───── Tech marquee — infinite scroll badge row ───── */

/* ───── Hero product mockup ───── */

function ProductMockup() {
  return (
    <div className="mx-auto mt-16 w-full max-w-3xl">
      <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.5),0_0_60px_-30px_rgba(139,92,246,0.4)] backdrop-blur">
        {/* Window chrome */}
        <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.02] px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-red-500/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
          <span className="h-3 w-3 rounded-full bg-green-500/70" />
          <span className="ml-3 font-mono text-[11px] text-white/40">
            taskagent.app/tasks
          </span>
        </div>
        {/* Task list */}
        <div className="space-y-2 p-6">
          <MockTask done title="Submit research draft" priority="HIGH" due="Today" />
          <MockTask title="Review PR #247" priority="MEDIUM" due="Tomorrow" />
          <MockTask title="Plan trip to Lisbon" priority="LOW" subtasks={5} />
          <MockTask title="Prep finals study guide" priority="URGENT" due="Wed" />
          <MockTask title="Email Sarah about budget" priority="MEDIUM" />
        </div>
      </div>
    </div>
  )
}

const PRIORITY_DOT: Record<string, string> = {
  URGENT: 'bg-red-400',
  HIGH: 'bg-orange-400',
  MEDIUM: 'bg-violet-400',
  LOW: 'bg-white/30',
}

function MockTask({
  done,
  title,
  priority,
  due,
  subtasks,
}: {
  done?: boolean
  title: string
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'
  due?: string
  subtasks?: number
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-white/[0.02] px-3.5 py-2.5 transition-colors hover:bg-white/[0.04]">
      <span
        className={`grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border ${
          done
            ? 'border-violet-400/60 bg-violet-500/30 text-white'
            : 'border-white/15 bg-white/[0.03]'
        }`}
      >
        {done ? (
          <svg
            viewBox="0 0 12 12"
            className="h-2.5 w-2.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M2.5 6.5l2.5 2.5L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </span>
      <span
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[priority]}`}
        aria-hidden
      />
      <span
        className={`flex-1 truncate text-sm ${
          done ? 'text-white/40 line-through' : 'text-white/85'
        }`}
      >
        {title}
      </span>
      {subtasks ? (
        <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-white/50">
          {subtasks} subtasks
        </span>
      ) : null}
      {due ? (
        <span className="shrink-0 rounded-md border border-white/10 bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-white/50">
          {due}
        </span>
      ) : null}
    </div>
  )
}

/* ───── Spotlight text column (text + bullets, used in feature spotlights) ───── */

function SpotlightText({
  eyebrow,
  title,
  body,
  bullets,
}: {
  eyebrow: string
  title: string
  body: React.ReactNode
  bullets?: string[]
}) {
  return (
    <div>
      <p className="mb-4 text-sm font-medium tracking-wide text-violet-300">
        {eyebrow}
      </p>
      <h2 className="text-balance text-3xl font-semibold tracking-[-0.02em] text-white sm:text-4xl md:text-[2.5rem] md:leading-[1.1]">
        {title}
      </h2>
      <p className="mt-5 max-w-md text-base leading-relaxed text-white/55">
        {body}
      </p>
      {bullets && bullets.length > 0 && (
        <ul className="mt-8 space-y-3 text-sm">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 text-white/70">
              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-violet-400" />
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ───── Spotlight visuals ───── */

function BreakdownVisual() {
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6),0_0_40px_-25px_rgba(139,92,246,0.4)] backdrop-blur">
      <div className="mb-4 flex items-center gap-2 text-xs text-white/45">
        <ListChecks className="h-3.5 w-3.5 text-violet-300" />
        Breakdown agent
      </div>
      <div className="mb-5 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white/85">
        Plan trip to Lisbon
      </div>
      <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/35">
        Generated subtasks
      </div>
      <ul className="space-y-2 text-sm">
        <SubtaskRow time="2h">Book flights & hotel</SubtaskRow>
        <SubtaskRow time="30m">Renew passport check</SubtaskRow>
        <SubtaskRow time="1h">Plan day-by-day itinerary</SubtaskRow>
        <SubtaskRow time="20m">Notify bank of travel</SubtaskRow>
        <SubtaskRow time="45m">Pack & download offline maps</SubtaskRow>
      </ul>
    </div>
  )
}

function SubtaskRow({
  time,
  children,
}: {
  time: string
  children: React.ReactNode
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-md border border-white/5 bg-white/[0.02] px-3 py-2 text-white/80">
      <span className="flex items-center gap-2.5">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
        {children}
      </span>
      <span className="font-mono text-[10px] text-white/35">{time}</span>
    </li>
  )
}

function EmailVisual() {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6),0_0_40px_-25px_rgba(139,92,246,0.4)] backdrop-blur">
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.02] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-500/70" />
        <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
        <span className="h-3 w-3 rounded-full bg-green-500/70" />
        <span className="ml-3 flex items-center gap-1.5 font-mono text-[11px] text-white/40">
          <Mail className="h-3 w-3" />
          email agent
        </span>
      </div>
      <div className="space-y-3 p-5 font-mono text-[12.5px]">
        <ChatBubble role="user">
          email Sarah about the Q3 budget review meeting
        </ChatBubble>
        <ChatBubble role="assistant">
          Drafted. Subject: {'“'}Q3 budget review — quick sync?{'”'} Reads warm,
          proposes Wed/Thu afternoons. Want me to send?
        </ChatBubble>
        <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 font-sans text-[12px] leading-relaxed text-white/75">
          <p className="text-white/55">To: sarah@company.com</p>
          <p className="text-white/55">Subject: Q3 budget review — quick sync?</p>
          <p className="mt-2">Hey Sarah,</p>
          <p className="mt-1.5">
            Got a few minutes this week to walk through the Q3 numbers? Wed or
            Thu afternoon both work for me…
          </p>
        </div>
        <ChatBubble role="user">send it</ChatBubble>
        <ChatBubble role="assistant" muted>
          ✓ Sent to sarah@company.com
        </ChatBubble>
      </div>
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
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-violet-500/15 px-3 py-2 text-white/90 ring-1 ring-violet-400/20">
        {children}
      </div>
    )
  }
  return (
    <div
      className={`max-w-[90%] rounded-2xl rounded-bl-md bg-white/[0.04] px-3 py-2 ring-1 ring-white/5 ${
        muted ? 'text-emerald-300/80' : 'text-white/80'
      }`}
    >
      {children}
    </div>
  )
}

function ScheduleVisual() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
  // Block format: [colStart 1-5, rowStart 1-8, span, label, color]
  const blocks: {
    col: number
    row: number
    span: number
    label: string
    tone: 'violet' | 'pink' | 'cyan' | 'mute'
  }[] = [
    { col: 1, row: 1, span: 2, label: 'Standup', tone: 'mute' },
    { col: 1, row: 4, span: 3, label: 'Finals study', tone: 'violet' },
    { col: 2, row: 2, span: 2, label: 'PR review', tone: 'pink' },
    { col: 2, row: 5, span: 2, label: 'Lisbon plan', tone: 'cyan' },
    { col: 3, row: 1, span: 2, label: 'Standup', tone: 'mute' },
    { col: 3, row: 3, span: 4, label: 'Research draft', tone: 'violet' },
    { col: 4, row: 2, span: 3, label: 'DB project', tone: 'pink' },
    { col: 4, row: 6, span: 2, label: 'Email Sarah', tone: 'cyan' },
    { col: 5, row: 1, span: 2, label: 'Standup', tone: 'mute' },
    { col: 5, row: 4, span: 3, label: 'Deep work', tone: 'violet' },
  ]
  const TONE: Record<string, string> = {
    violet: 'bg-violet-500/20 border-violet-400/30 text-violet-100',
    pink: 'bg-fuchsia-500/15 border-fuchsia-400/25 text-fuchsia-100',
    cyan: 'bg-sky-500/15 border-sky-400/25 text-sky-100',
    mute: 'bg-white/[0.04] border-white/10 text-white/50',
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6),0_0_40px_-25px_rgba(139,92,246,0.4)] backdrop-blur">
      <div className="mb-4 flex items-center justify-between text-xs text-white/45">
        <span className="flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5 text-violet-300" />
          This week
        </span>
        <span className="font-mono text-[10px] text-white/35">9:00 — 5:00</span>
      </div>
      {/* Day headers */}
      <div className="mb-2 grid grid-cols-[2.25rem_repeat(5,minmax(0,1fr))] gap-1">
        <div />
        {days.map((d) => (
          <div
            key={d}
            className="text-center font-mono text-[10px] uppercase tracking-wider text-white/45"
          >
            {d}
          </div>
        ))}
      </div>
      {/* Grid body */}
      <div className="grid grid-cols-[2.25rem_repeat(5,minmax(0,1fr))] gap-1">
        {/* Time labels column */}
        <div className="grid grid-rows-8 gap-1">
          {['9', '10', '11', '12', '1', '2', '3', '4'].map((h) => (
            <div
              key={h}
              className="flex h-6 items-center justify-end pr-1 font-mono text-[10px] text-white/30"
            >
              {h}
            </div>
          ))}
        </div>
        {/* 5 day columns, each a relative grid */}
        {days.map((_, dayIdx) => (
          <div key={dayIdx} className="relative grid grid-rows-8 gap-1">
            {Array.from({ length: 8 }).map((_, r) => (
              <div
                key={r}
                className="h-6 rounded border border-white/[0.04] bg-white/[0.015]"
              />
            ))}
            {blocks
              .filter((b) => b.col === dayIdx + 1)
              .map((b, i) => (
                <div
                  key={i}
                  className={`absolute inset-x-0 rounded-md border px-1.5 py-1 text-[10px] font-medium leading-tight ${TONE[b.tone]}`}
                  style={{
                    top: `calc(${b.row - 1} * (1.5rem + 0.25rem))`,
                    height: `calc(${b.span} * 1.5rem + ${b.span - 1} * 0.25rem)`,
                  }}
                >
                  {b.label}
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  )
}

/* ───── Agent grid card ───── */

function AgentCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div className="card-glow group h-full rounded-2xl border border-white/10 bg-white/[0.025] p-7 backdrop-blur transition-colors hover:border-white/20 hover:bg-white/[0.04]">
      <div className="mb-6 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-violet-500/15 text-violet-200 ring-1 ring-violet-400/20">
        {icon}
      </div>
      <h3 className="text-[15px] font-semibold tracking-tight text-white">
        {title}
      </h3>
      <p className="mt-2.5 text-sm leading-relaxed text-white/55">{body}</p>
    </div>
  )
}

/* ───── How-it-works step ───── */

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="h-full rounded-2xl border border-white/10 bg-white/[0.025] p-7 backdrop-blur">
      <div className="mb-5 inline-block rounded-md border border-white/10 bg-violet-500/10 px-2.5 py-1 font-mono text-[11px] text-violet-200">
        {n}
      </div>
      <h3 className="text-lg font-semibold tracking-tight text-white">
        {title}
      </h3>
      <p className="mt-2.5 text-sm leading-relaxed text-white/55">{body}</p>
    </div>
  )
}
