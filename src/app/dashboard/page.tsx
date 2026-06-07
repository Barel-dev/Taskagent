import Link from 'next/link'
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/header'
import { prisma } from '@/lib/prisma'
import { ShaderBackground } from '@/components/ui/shader-background'
import {
  Zap,
  CheckCircle2,
  Coins,
  Bot,
  ListTodo,
  Clock,
  AlertTriangle,
  CalendarClock,
  Repeat,
  Flame,
} from 'lucide-react'
import type { AgentType, AgentRunStatus } from '@prisma/client'
import { tagChipClass } from '@/lib/tag-colors'

export const dynamic = 'force-dynamic'

const TYPE_LABEL: Record<AgentType, string> = {
  BREAKDOWN: 'Plan / Breakdown',
  EXECUTE: 'Do it',
  PRIORITIZER: 'Prioritizer',
  BRIEFING: 'Summary / Briefing',
  SCHEDULE: 'Schedule',
  EMAIL: 'Email',
}

const STATUS_STYLE: Record<AgentRunStatus, string> = {
  SUCCESS: 'text-emerald-300 bg-emerald-500/10',
  ERROR: 'text-rose-300 bg-rose-500/10',
  PENDING: 'text-amber-300 bg-amber-500/10',
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')
  const userId = session.user.id

  const since = new Date()
  since.setHours(0, 0, 0, 0)
  since.setDate(since.getDate() - 13)

  const [total, success, tokensAgg, byType, recent, last14, tasksAll, tagsRaw, completedRecent] =
    await Promise.all([
      prisma.agentRun.count({ where: { userId } }),
      prisma.agentRun.count({ where: { userId, status: 'SUCCESS' } }),
      prisma.agentRun.aggregate({ where: { userId }, _sum: { tokensUsed: true } }),
      prisma.agentRun.groupBy({
        by: ['agentType'],
        where: { userId },
        _count: { _all: true },
        _sum: { tokensUsed: true },
      }),
      prisma.agentRun.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 12 }),
      prisma.agentRun.findMany({
        where: { userId, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      prisma.task.findMany({
        where: { userId, parentId: null },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          scheduledStart: true,
          recurrence: true,
          estimatedMinutes: true,
        },
      }),
      prisma.tag.findMany({
        where: { userId },
        select: { id: true, name: true, color: true, _count: { select: { tasks: true } } },
      }),
      prisma.task.findMany({
        where: { userId, completedAt: { gte: since } },
        select: { completedAt: true },
      }),
    ])

  const tokens = tokensAgg._sum.tokensUsed ?? 0
  const successRate = total ? Math.round((success / total) * 100) : 0
  const byTypeSorted = [...byType].sort((a, b) => b._count._all - a._count._all)

  // Agent-run counts for each of the last 14 days, for the activity chart.
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(since)
    d.setDate(d.getDate() + i)
    return d
  })
  const dayCounts = days.map((d) => last14.filter((r) => sameDay(r.createdAt, d)).length)
  const maxDay = Math.max(1, ...dayCounts)
  const doneByDay = days.map(
    (d) => completedRecent.filter((t) => t.completedAt && sameDay(t.completedAt, d)).length,
  )
  const maxDoneDay = Math.max(1, ...doneByDay)
  // Consecutive days ending today with at least one completed task.
  let streak = 0
  for (let i = doneByDay.length - 1; i >= 0; i--) {
    if (doneByDay[i] > 0) streak++
    else break
  }

  // Task-centric stats.
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const totalTasks = tasksAll.length
  const doneTasks = tasksAll.filter((t) => t.status === 'DONE').length
  const inProgress = tasksAll.filter((t) => t.status === 'IN_PROGRESS').length
  const overdueTasks = tasksAll.filter(
    (t) => t.dueDate && t.status !== 'DONE' && t.dueDate < todayStart,
  ).length
  const taskPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0
  const priorityBreakdown = (['URGENT', 'HIGH', 'MEDIUM', 'LOW'] as const).map((p) => ({
    p,
    n: tasksAll.filter((t) => t.priority === p).length,
  }))
  const PRIORITY_BAR: Record<string, string> = {
    URGENT: 'bg-rose-400/70',
    HIGH: 'bg-amber-400/70',
    MEDIUM: 'bg-sky-400/70',
    LOW: 'bg-slate-400/70',
  }
  const topTags = tagsRaw
    .filter((t) => t._count.tasks > 0)
    .sort((a, b) => b._count.tasks - a._count.tasks)
    .slice(0, 12)

  const weekEnd = new Date(todayStart)
  weekEnd.setDate(weekEnd.getDate() + 7)
  const upcoming = tasksAll
    .filter(
      (t) => t.status !== 'DONE' && t.dueDate && t.dueDate >= todayStart && t.dueDate <= weekEnd,
    )
    .sort((a, b) => (a.dueDate?.getTime() ?? 0) - (b.dueDate?.getTime() ?? 0))
    .slice(0, 6)

  const now = new Date()
  const scheduledUpcoming = tasksAll
    .filter((t) => t.status !== 'DONE' && t.scheduledStart && t.scheduledStart >= now)
    .sort((a, b) => (a.scheduledStart?.getTime() ?? 0) - (b.scheduledStart?.getTime() ?? 0))
    .slice(0, 6)
  const recurringCount = tasksAll.filter((t) => t.recurrence && t.recurrence !== 'NONE').length

  // Estimated focused work still open (sum of estimates on not-done tasks).
  const openMinutes = tasksAll
    .filter((t) => t.status !== 'DONE')
    .reduce((s, t) => s + (t.estimatedMinutes ?? 0), 0)
  const openHrs = Math.floor(openMinutes / 60)
  const openMins = openMinutes % 60
  const openWorkLabel =
    openMinutes > 0
      ? openHrs
        ? `${openHrs}h${openMins ? ` ${openMins}m` : ''}`
        : `${openMins}m`
      : null

  const stats = [
    { label: 'Agent runs', value: total.toLocaleString(), Icon: Zap },
    { label: 'Success rate', value: `${successRate}%`, Icon: CheckCircle2 },
    { label: 'Tokens used', value: tokens.toLocaleString(), Icon: Coins },
    { label: 'Agent types', value: String(byType.length), Icon: Bot },
  ]

  return (
    <div className="relative isolate min-h-screen">
      <ShaderBackground opacity={0.35} />
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 bg-black/55" />
      <Header />

      <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        <header>
          <p className="text-[11px] font-medium tracking-[0.25em] text-violet-300/70 uppercase">
            Dashboard
          </p>
          <h2 className="mt-1.5 text-3xl font-semibold tracking-tight text-white">
            Your <span className="text-violet-300">dashboard</span>
          </h2>
          <p className="mt-1.5 text-sm text-white/50">
            A snapshot of your tasks and every agent run.
          </p>
        </header>

        {/* Tasks at a glance */}
        <section className="space-y-4">
          <h3 className="text-sm font-semibold text-white/70">Tasks at a glance</h3>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm">
              <ListTodo className="h-5 w-5 text-violet-300" />
              <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {totalTasks}
              </div>
              <div className="mt-1 text-xs text-white/50">Total tasks</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm">
              <CheckCircle2 className="h-5 w-5 text-emerald-300" />
              <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {taskPct}%
              </div>
              <div className="mt-1 text-xs text-white/50">
                Completed ({doneTasks}/{totalTasks})
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm">
              <Clock className="h-5 w-5 text-sky-300" />
              <div className="mt-3 text-3xl font-semibold tracking-tight text-white">
                {inProgress}
              </div>
              <div className="mt-1 text-xs text-white/50">In progress</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm">
              <AlertTriangle className="h-5 w-5 text-rose-300" />
              <div
                className={`mt-3 text-3xl font-semibold tracking-tight ${
                  overdueTasks ? 'text-rose-300' : 'text-white'
                }`}
              >
                {overdueTasks}
              </div>
              <div className="mt-1 text-xs text-white/50">Overdue</div>
            </div>
          </div>
          {(streak > 0 || openWorkLabel) && (
            <div className="flex flex-wrap items-center gap-2">
              {streak > 0 && (
                <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-200">
                  <Flame className="h-4 w-4" />
                  {streak}-day completion streak — keep it going!
                </div>
              )}
              {openWorkLabel && (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/70">
                  <Clock className="h-4 w-4 text-sky-300" />~{openWorkLabel} of work left across
                  open tasks
                </div>
              )}
            </div>
          )}
          {totalTasks > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm">
              <h4 className="text-sm font-semibold text-white/80">By priority</h4>
              <div className="mt-4 space-y-3">
                {priorityBreakdown.map(({ p, n }) => {
                  const pct = totalTasks ? Math.round((n / totalTasks) * 100) : 0
                  return (
                    <Link
                      key={p}
                      href={`/tasks?priority=${p}`}
                      className="block rounded-lg p-1 transition-colors hover:bg-white/5"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-white/75">{p[0] + p.slice(1).toLowerCase()}</span>
                        <span className="text-white/45 tabular-nums">{n}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className={`h-full rounded-full ${PRIORITY_BAR[p]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
          {totalTasks > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm">
              <h4 className="text-sm font-semibold text-white/80">Completed · last 14 days</h4>
              <div className="mt-4 flex items-end gap-1.5">
                {doneByDay.map((c, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-20 w-full items-end">
                      <div
                        className="w-full rounded-t bg-emerald-400/70"
                        style={{ height: `${Math.round((c / maxDoneDay) * 100)}%` }}
                        title={`${c} completed`}
                      />
                    </div>
                    <span className="text-[9px] text-white/30 tabular-nums">
                      {days[i].getDate()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {topTags.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm">
              <h4 className="text-sm font-semibold text-white/80">Most-used tags</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {topTags.map((t) => (
                  <span
                    key={t.id}
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${tagChipClass(t.color)}`}
                  >
                    {t.name}
                    <span className="tabular-nums opacity-70">{t._count.tasks}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm">
              <h4 className="text-sm font-semibold text-white/80">Due this week</h4>
              <div className="mt-3 space-y-1">
                {upcoming.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tasks?task=${t.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/5"
                  >
                    <span className="truncate text-white/80">{t.title}</span>
                    <span className="shrink-0 text-xs text-white/45 tabular-nums">
                      {t.dueDate?.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {(scheduledUpcoming.length > 0 || recurringCount > 0) && (
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between">
                <h4 className="inline-flex items-center gap-1.5 text-sm font-semibold text-white/80">
                  <CalendarClock className="h-4 w-4 text-violet-300" />
                  Scheduled next
                </h4>
                {recurringCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-white/55">
                    <Repeat className="h-3 w-3" />
                    {recurringCount} recurring
                  </span>
                )}
              </div>
              {scheduledUpcoming.length > 0 ? (
                <div className="mt-3 space-y-1">
                  {scheduledUpcoming.map((t) => (
                    <Link
                      key={t.id}
                      href={`/tasks?task=${t.id}`}
                      className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/5"
                    >
                      <span className="truncate text-white/80">{t.title}</span>
                      <span className="shrink-0 text-xs text-violet-300/80 tabular-nums">
                        {t.scheduledStart?.toLocaleString(undefined, {
                          weekday: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-xs text-white/45">
                  Nothing time-blocked yet — use the Schedule agent on a task.
                </p>
              )}
            </div>
          )}
        </section>

        {/* Agent stat cards */}
        <h3 className="text-sm font-semibold text-white/70">Agent activity</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm"
            >
              <s.Icon className="h-5 w-5 text-violet-300" />
              <div className="mt-3 text-3xl font-semibold tracking-tight text-white">{s.value}</div>
              <div className="mt-1 text-xs text-white/50">{s.label}</div>
            </div>
          ))}
        </div>

        {total === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
            <Bot className="mx-auto h-6 w-6 text-violet-300/60" />
            <p className="mt-3 text-sm text-white/60">No agent runs yet.</p>
            <p className="mt-1 text-xs text-white/40">
              Head to your tasks and run an agent — it’ll show up here.
            </p>
          </div>
        ) : (
          <>
            {/* Activity chart */}
            <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm">
              <h3 className="text-sm font-semibold text-white/80">Activity · last 14 days</h3>
              <div className="mt-4 flex items-end gap-1.5">
                {dayCounts.map((c, i) => (
                  <div key={i} className="flex flex-1 flex-col items-center gap-1">
                    <div className="flex h-24 w-full items-end">
                      <div
                        className="w-full rounded-t bg-violet-400/70"
                        style={{ height: `${Math.round((c / maxDay) * 100)}%` }}
                        title={`${c} run${c === 1 ? '' : 's'}`}
                      />
                    </div>
                    <span className="text-[9px] text-white/30 tabular-nums">
                      {days[i].getDate()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* By type */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-white/80">By agent</h3>
                <div className="mt-4 space-y-3">
                  {byTypeSorted.map((t) => {
                    const pct = total ? Math.round((t._count._all / total) * 100) : 0
                    return (
                      <div key={t.agentType}>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-white/75">{TYPE_LABEL[t.agentType]}</span>
                          <span className="text-white/45 tabular-nums">
                            {t._count._all} run{t._count._all === 1 ? '' : 's'} ·{' '}
                            {(t._sum.tokensUsed ?? 0).toLocaleString()} tok
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full bg-violet-400/70"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Recent runs */}
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur-sm">
                <h3 className="text-sm font-semibold text-white/80">Recent runs</h3>
                <div className="mt-4 space-y-2">
                  {recent.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 text-xs">
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${STATUS_STYLE[r.status]}`}
                      >
                        {r.status.toLowerCase()}
                      </span>
                      <span className="text-white/75">{TYPE_LABEL[r.agentType]}</span>
                      <span className="ml-auto text-white/40 tabular-nums">
                        {(r.tokensUsed ?? 0).toLocaleString()} tok
                      </span>
                      <span className="w-20 text-right text-white/35 tabular-nums">
                        {new Date(r.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
