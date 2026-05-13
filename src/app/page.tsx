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
import AnimatedShaderHero from '@/components/ui/animated-shader-hero'
import { ScrollProgress } from '@/components/scroll-progress'
import { TiltOnScroll } from '@/components/tilt-on-scroll'
import { CursorTilt } from '@/components/cursor-tilt'
import { MockupParallax } from '@/components/mockup-parallax'
import { AgentNetwork } from '@/components/agent-network'
import {
  BreakdownVisual,
  EmailVisual,
  ScheduleVisual,
} from '@/components/spotlight-visuals'

const PRIMARY_CTA_CLASSES =
  'group h-11 px-6 text-sm shadow-[0_0_30px_rgba(139,92,246,0.3)] transition-transform hover:scale-[1.02] hover:shadow-[0_0_60px_rgba(139,92,246,0.5)]'

export default async function Landing() {
  const session = await auth()
  const isAuthed = !!session?.user

  return (
    <div className="relative isolate text-foreground">
      <LandingBg />
      <ScrollProgress />

      {/* Fixed header — floats on top of the hero shader with no plate */}
      <header className="fixed inset-x-0 top-0 z-30 w-full">

        <div className="relative mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 sm:px-10">
          {/* Logo */}
          <Link href="/" className="group flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_0_24px_rgba(139,92,246,0.45)] transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-white">
              TaskAgent
            </span>
          </Link>

          {/* Floating pill nav (centered, absolute so it stays perfectly centered) */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 shadow-[0_8px_32px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl md:flex">
            <Link
              href="#agents"
              className="rounded-full px-4 py-1.5 text-[13px] font-medium text-white/65 transition-all duration-200 hover:bg-white/[0.07] hover:text-white"
            >
              Agents
            </Link>
            <Link
              href="#examples"
              className="rounded-full px-4 py-1.5 text-[13px] font-medium text-white/65 transition-all duration-200 hover:bg-white/[0.07] hover:text-white"
            >
              Examples
            </Link>
            <Link
              href="#how"
              className="rounded-full px-4 py-1.5 text-[13px] font-medium text-white/65 transition-all duration-200 hover:bg-white/[0.07] hover:text-white"
            >
              How it works
            </Link>
          </nav>

          {/* CTA — white pill */}
          <nav className="flex items-center gap-3">
            {isAuthed ? (
              <Button
                asChild
                size="sm"
                className="h-9 rounded-full bg-white px-5 text-[13px] font-medium text-black shadow-[0_4px_20px_rgba(255,255,255,0.12)] hover:bg-white/90 hover:shadow-[0_4px_28px_rgba(255,255,255,0.2)]"
              >
                <Link href="/tasks">Open app →</Link>
              </Button>
            ) : (
              <Button
                asChild
                size="sm"
                className="h-9 rounded-full bg-white px-5 text-[13px] font-medium text-black shadow-[0_4px_20px_rgba(255,255,255,0.12)] hover:bg-white/90 hover:shadow-[0_4px_28px_rgba(255,255,255,0.2)]"
              >
                <Link href="/signin">Sign in →</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero — WebGL animated shader background */}
        <AnimatedShaderHero
          trustBadge={{
            text: '5 specialized agents at your service',
            icons: ['✦'],
          }}
          headline={{
            line1: 'Plan less.',
            line2: 'Finish more.',
          }}
          subtitle="TaskAgent breaks down what you need to do, schedules it into your week, drafts the emails you’ve been avoiding, and briefs you every morning."
          buttons={{
            primary: {
              text: isAuthed ? 'Go to your tasks →' : 'Sign in with Google →',
              href: isAuthed ? '/tasks' : '/signin',
            },
            secondary: {
              text: 'View on GitHub',
              href: 'https://github.com/Barel-dev/Taskagent',
            },
          }}
        />

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
            <MockupParallax>
              <ProductMockup />
            </MockupParallax>
          </Reveal>
        </section>

        {/* Section melt */}
        <div
          className="h-32 w-full bg-gradient-to-b from-transparent via-[#0a0e1a]/30 to-transparent"
          aria-hidden
        />

        {/* Meet your agents — animated network visualization */}
        <section className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <div className="mb-12 text-center">
              <p className="mb-4 text-sm font-medium tracking-wide text-violet-300">
                The system
              </p>
              <h2 className="text-balance text-4xl font-semibold tracking-[-0.02em] text-white sm:text-5xl">
                Five agents,{' '}
                <span className="bg-gradient-to-r from-violet-300 to-fuchsia-400 bg-clip-text text-transparent">
                  one quiet mind
                </span>
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/55">
                Each agent specializes in a single job. They share what they know with each other —
                so when one finishes thinking, the next picks up where it left off.
              </p>
            </div>
            <AgentNetwork />
            <p className="mt-8 text-center text-xs text-white/40">
              Hover an agent to see what it does
            </p>
          </Reveal>
        </section>

        {/* Section melt */}
        <div
          className="h-32 w-full bg-gradient-to-b from-transparent via-[#0a0e1a]/30 to-transparent"
          aria-hidden
        />

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
              <TiltOnScroll>
                <BreakdownVisual />
              </TiltOnScroll>
            </Reveal>
          </div>
        </section>

        {/* Section melt */}
        <div
          className="h-32 w-full bg-gradient-to-b from-transparent via-[#0a0e1a]/30 to-transparent"
          aria-hidden
        />

        {/* Section 2 — Email agent (reverse: text right, visual left) */}
        <section className="mx-auto max-w-6xl px-6">
          <div className="grid items-center gap-12 py-28 md:grid-cols-2 md:gap-16">
            <Reveal direction="left" delay={150} className="order-1 md:order-1">
              <TiltOnScroll>
                <EmailVisual />
              </TiltOnScroll>
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

        {/* Section melt */}
        <div
          className="h-32 w-full bg-gradient-to-b from-transparent via-[#0a0e1a]/30 to-transparent"
          aria-hidden
        />

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
              <TiltOnScroll>
                <ScheduleVisual />
              </TiltOnScroll>
            </Reveal>
          </div>
        </section>

        {/* Section melt */}
        <div
          className="h-32 w-full bg-gradient-to-b from-transparent via-[#0a0e1a]/30 to-transparent"
          aria-hidden
        />

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
              <CursorTilt>
                <AgentCard
                  icon={<ListChecks className="h-5 w-5" />}
                  title="Breakdown agent"
                  body={`Turn ${'‘'}study for finals${'’'} into a real plan. Subtasks, time estimates, priorities — generated.`}
                />
              </CursorTilt>
            </Reveal>
            <Reveal delay={80}>
              <CursorTilt>
                <AgentCard
                  icon={<Bot className="h-5 w-5" />}
                  title="Smart prioritizer"
                  body="Asks what matters, weighs urgency vs importance, then reorders your day."
                />
              </CursorTilt>
            </Reveal>
            <Reveal delay={160}>
              <CursorTilt>
                <AgentCard
                  icon={<CalendarClock className="h-5 w-5" />}
                  title="Schedule agent"
                  body="Reads your Google Calendar, finds the gaps, books the work in. You just confirm."
                />
              </CursorTilt>
            </Reveal>
            <Reveal delay={240}>
              <CursorTilt>
                <AgentCard
                  icon={<Mail className="h-5 w-5" />}
                  title="Email agent"
                  body={`${'‘'}Email Sarah about the budget review.${'’'} Drafts, shows it to you, sends on approval.`}
                />
              </CursorTilt>
            </Reveal>
            <Reveal delay={320}>
              <CursorTilt>
                <AgentCard
                  icon={<Sun className="h-5 w-5" />}
                  title="Daily briefing"
                  body={`A friendly summary in your inbox at 7am — what${'’'}s due, what${'’'}s overdue, what to focus on.`}
                />
              </CursorTilt>
            </Reveal>
            <Reveal delay={400}>
              <CursorTilt>
                <AgentCard
                  icon={<Sparkles className="h-5 w-5" />}
                  title="Talk to your tasks"
                  body={`A chat sidebar that knows your todos. ${'‘'}What${'’'}s left for the website?${'’'} just works.`}
                />
              </CursorTilt>
            </Reveal>
          </div>
        </section>

        {/* Section melt */}
        <div
          className="h-32 w-full bg-gradient-to-b from-transparent via-[#0a0e1a]/30 to-transparent"
          aria-hidden
        />

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
    <div className="relative mx-auto mt-16 w-full max-w-5xl">
      {/* Soft violet glow underneath */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-20 -bottom-10 -top-10 -z-10"
        style={{
          background:
            'radial-gradient(60% 50% at 50% 50%, rgba(139,92,246,0.30), transparent 70%)',
        }}
      />

      {/* The window itself */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] shadow-[0_60px_120px_-30px_rgba(0,0,0,0.7),0_0_120px_-40px_rgba(139,92,246,0.5),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
          </div>
          <div className="flex items-center gap-2 rounded-md bg-white/[0.04] px-3 py-1 font-mono text-[11px] text-white/45">
            <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3.5" width="8" height="5" rx="1" />
              <path d="M4 3.5V2.5a2 2 0 0 1 4 0v1" />
            </svg>
            taskagent.app/tasks
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              5 online
            </div>
          </div>
        </div>

        {/* 3-column app body */}
        <div className="grid h-[440px] grid-cols-[180px_1fr_240px] divide-x divide-white/[0.06]">
          {/* Left: agents sidebar */}
          <aside className="flex flex-col gap-1 p-4">
            <div className="mb-2 text-[10px] font-medium uppercase tracking-widest text-white/35">
              Agents
            </div>
            <SidebarAgent name="Breakdown" hue="rgb(167,139,250)" active />
            <SidebarAgent name="Prioritizer" hue="rgb(244,114,182)" />
            <SidebarAgent name="Schedule" hue="rgb(125,211,252)" />
            <SidebarAgent name="Email" hue="rgb(249,168,212)" />
            <SidebarAgent name="Briefing" hue="rgb(196,181,253)" />

            <div className="mt-auto rounded-lg border border-white/5 bg-white/[0.03] p-3">
              <div className="text-[10px] uppercase tracking-widest text-white/35">Today</div>
              <div className="mt-1 font-semibold text-white">8 / 12 done</div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/5">
                <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-violet-400 to-fuchsia-400" />
              </div>
            </div>
          </aside>

          {/* Center: tasks */}
          <main className="flex flex-col p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-white/35">
                  Wednesday, May 14
                </div>
                <div className="text-base font-semibold text-white">Today</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="rounded-md bg-violet-500/15 px-2.5 py-1 text-[11px] font-medium text-violet-200">
                  + New task
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <MockTask done title="Submit research draft" priority="HIGH" due="Today" />
              <MockTask title="Review PR #247" priority="MEDIUM" due="Tomorrow" />
              <MockTask title="Plan trip to Lisbon" priority="LOW" subtasks={5} />
              <MockTask title="Prep finals study guide" priority="URGENT" due="Wed" />
              <MockTask title="Email Sarah about budget" priority="MEDIUM" />
            </div>
          </main>

          {/* Right: today's briefing preview */}
          <aside className="flex flex-col gap-3 p-4">
            <div className="text-[10px] font-medium uppercase tracking-widest text-white/35">
              7:00 AM briefing
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3 text-[12px] leading-relaxed text-white/65">
              <div className="mb-2 font-medium text-white">Good morning, Barel.</div>
              <div>
                3 tasks due today. <span className="text-white/85">PR review</span> can slip to
                tomorrow — your afternoon is free after 4pm.
              </div>
              <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-200">
                <span className="h-1 w-1 rounded-full bg-violet-300" />
                drafted by Briefing agent
              </div>
            </div>

            <div className="rounded-lg border border-white/5 bg-white/[0.03] p-3 text-[12px] text-white/65">
              <div className="mb-2 flex items-center gap-1.5">
                <span className="grid h-4 w-4 place-items-center rounded-full bg-gradient-to-br from-violet-400 to-fuchsia-400 text-[9px] font-bold text-white">
                  E
                </span>
                <span className="font-medium text-white">Email agent</span>
              </div>
              <div className="text-white/55">
                Draft ready for{' '}
                <span className="text-white/85">Q3 budget review</span> — review and send?
              </div>
            </div>
          </aside>
        </div>

        {/* Bottom status bar */}
        <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.02] px-4 py-2 text-[10px] text-white/40">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
            Prioritizer agent thinking…
          </div>
          <div className="font-mono">⌘K to chat</div>
        </div>
      </div>

      {/* Floor reflection — mirrored fade */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 -bottom-10 h-24 rounded-3xl"
        style={{
          background:
            'radial-gradient(70% 100% at 50% 0%, rgba(139,92,246,0.18), transparent 75%)',
          filter: 'blur(20px)',
        }}
      />
    </div>
  )
}

function SidebarAgent({
  name,
  hue,
  active,
}: {
  name: string
  hue: string
  active?: boolean
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] transition-colors ${
        active ? 'bg-white/[0.05]' : 'hover:bg-white/[0.03]'
      }`}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: hue, boxShadow: `0 0 8px ${hue}` }}
      />
      <span className={active ? 'text-white' : 'text-white/65'}>{name}</span>
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
