'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import { ListChecks, Mail, CalendarClock, Send } from 'lucide-react'
import { Scene } from './scene'

/* ============================================================
   BreakdownVisual — branching mind-map scene
   ============================================================ */

const SUBTASKS = [
  { label: 'Book flights', time: '2h', x: 78, y: 18 },
  { label: 'Renew passport', time: '30m', x: 86, y: 50 },
  { label: 'Plan itinerary', time: '1h', x: 78, y: 82 },
  { label: 'Notify bank', time: '20m', x: 14, y: 28 },
  { label: 'Pack & download maps', time: '45m', x: 14, y: 72 },
]

function BreakdownGrid() {
  return (
    <svg
      className="h-full w-full"
      viewBox="0 0 400 320"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <pattern id="bg-grid" width="32" height="32" patternUnits="userSpaceOnUse">
          <path
            d="M 32 0 L 0 0 0 32"
            fill="none"
            stroke="rgb(139 92 246 / 0.18)"
            strokeWidth="0.5"
          />
        </pattern>
        <radialGradient id="bg-fade" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="white" stopOpacity="0.4" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <mask id="bg-mask">
          <rect width="400" height="320" fill="url(#bg-fade)" />
        </mask>
      </defs>
      <rect width="400" height="320" fill="url(#bg-grid)" mask="url(#bg-mask)" />
    </svg>
  )
}

function BreakdownConnectors({ reduced }: { reduced: boolean }) {
  // Center at (50%, 50%) -> in viewBox 400x320 that's (200, 160)
  // Each subtask position in % coordinates
  const cx = 200
  const cy = 160
  const paths = SUBTASKS.map((s) => {
    const tx = (s.x / 100) * 400
    const ty = (s.y / 100) * 320
    // Curved bezier path from center to subtask
    const mx = (cx + tx) / 2
    return `M ${cx} ${cy} Q ${mx} ${cy} ${tx} ${ty}`
  })

  return (
    <svg
      className="h-full w-full"
      viewBox="0 0 400 320"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="line-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgb(196 181 253)" stopOpacity="0.8" />
          <stop offset="100%" stopColor="rgb(168 85 247)" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      {paths.map((d, i) => (
        <motion.path
          key={i}
          d={d}
          fill="none"
          stroke="url(#line-grad)"
          strokeWidth="1.2"
          strokeLinecap="round"
          initial={reduced ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
          whileInView={{ pathLength: 1, opacity: 1 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{
            duration: 1.2,
            delay: 0.15 * i,
            ease: [0.65, 0, 0.35, 1],
          }}
        />
      ))}
    </svg>
  )
}

function BreakdownNodes({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative h-full w-full">
      {/* Central node */}
      <motion.div
        initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.7 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '-10%' }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      >
        <div className="rounded-xl border border-violet-400/40 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 px-4 py-2.5 text-sm font-medium text-white shadow-[0_0_30px_rgba(139,92,246,0.4),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-md">
          <span className="flex items-center gap-2">
            <ListChecks className="h-3.5 w-3.5 text-violet-200" />
            Plan trip to Lisbon
          </span>
        </div>
      </motion.div>

      {/* Subtask nodes */}
      {SUBTASKS.map((s, i) => (
        <motion.div
          key={s.label}
          initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.6 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-10%' }}
          transition={{
            duration: 0.6,
            delay: 0.4 + 0.12 * i,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
        >
          <div className="flex items-center gap-2 whitespace-nowrap rounded-full border border-violet-400/30 bg-[#11151f]/80 px-3 py-1.5 text-[11px] text-white/85 shadow-[0_8px_24px_rgba(0,0,0,0.4),0_0_16px_rgba(139,92,246,0.15)] ring-1 ring-white/[0.04] backdrop-blur">
            <span className="h-1 w-1 rounded-full bg-violet-400" />
            <span>{s.label}</span>
            <span className="font-mono text-[9px] text-white/40">{s.time}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export function BreakdownVisual() {
  const reduced = useReducedMotion() ?? false
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6),0_0_40px_-25px_rgba(139,92,246,0.4)] backdrop-blur">
      <div className="mb-4 flex items-center gap-2 text-xs text-white/45">
        <ListChecks className="h-3.5 w-3.5 text-violet-300" />
        Breakdown agent
      </div>
      <Scene
        height="320px"
        className="w-full"
        layers={[
          {
            speed: 0.5,
            className: 'pointer-events-none opacity-70',
            children: <BreakdownGrid />,
          },
          {
            speed: 0,
            className: 'pointer-events-none',
            children: <BreakdownConnectors reduced={reduced} />,
          },
          {
            speed: -0.3,
            children: <BreakdownNodes reduced={reduced} />,
          },
        ]}
      />
    </div>
  )
}

/* ============================================================
   EmailVisual — paper letter in flight
   ============================================================ */

function Starfield() {
  // 30 sparkles at deterministic positions/sizes (no hydration mismatch)
  const stars = useMemo(() => {
    const out: { x: number; y: number; s: number; d: number }[] = []
    for (let i = 0; i < 30; i++) {
      // Deterministic pseudo-random
      const r1 = (Math.sin(i * 12.9898) * 43758.5453) % 1
      const r2 = (Math.sin(i * 78.233) * 43758.5453) % 1
      const r3 = (Math.sin(i * 39.346) * 43758.5453) % 1
      const r4 = (Math.sin(i * 91.117) * 43758.5453) % 1
      out.push({
        x: Math.abs(r1) * 100,
        y: Math.abs(r2) * 100,
        s: 0.6 + Math.abs(r3) * 1.6,
        d: Math.abs(r4) * 3,
      })
    }
    return out
  }, [])

  return (
    <div className="relative h-full w-full">
      {stars.map((star, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.s}px`,
            height: `${star.s}px`,
            boxShadow: `0 0 ${star.s * 2}px rgba(216, 180, 254, 0.6)`,
          }}
          animate={{ opacity: [0.2, 0.9, 0.2] }}
          transition={{
            duration: 2.4 + star.d,
            delay: star.d,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  )
}

function PaperPlane({ reduced }: { reduced: boolean }) {
  // 1 paper plane + 3 fading trail copies behind it
  const trails = [0, 1, 2, 3]
  return (
    <div className="relative h-full w-full">
      {trails.map((t) => {
        const opacity = t === 0 ? 1 : 0.22 - t * 0.05
        const offset = t * 16
        return (
          <motion.div
            key={t}
            initial={
              reduced
                ? { opacity, x: 0, y: 0 }
                : { opacity: 0, x: -120 - offset, y: 80 + offset }
            }
            whileInView={{
              opacity,
              x: -offset,
              y: offset,
            }}
            viewport={{ once: true, margin: '-10%' }}
            transition={{
              duration: 1.6,
              delay: 0.1 + t * 0.05,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="absolute left-[55%] top-[30%]"
            style={{ transform: 'rotate(15deg)' }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 64 64"
              fill="none"
              className="drop-shadow-[0_8px_24px_rgba(139,92,246,0.45)]"
              aria-hidden
            >
              <defs>
                <linearGradient id={`plane-${t}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#c4b5fd" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <path
                d="M 4 32 L 58 6 L 38 56 L 30 38 Z"
                fill={`url(#plane-${t})`}
                stroke="white"
                strokeOpacity="0.25"
                strokeWidth="0.8"
                strokeLinejoin="round"
              />
              <path
                d="M 4 32 L 30 38 L 38 56"
                fill="none"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="0.6"
                strokeLinejoin="round"
              />
            </svg>
          </motion.div>
        )
      })}
    </div>
  )
}

function EmailDraftCard({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative flex h-full w-full items-end justify-start p-2">
      <motion.div
        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-10%' }}
        transition={{ duration: 0.9, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[280px] rounded-xl border border-white/15 bg-gradient-to-br from-white/[0.08] to-white/[0.02] p-4 shadow-[0_20px_60px_rgba(0,0,0,0.5),0_0_40px_rgba(139,92,246,0.18)] ring-1 ring-white/[0.04] backdrop-blur-xl"
      >
        <div className="mb-2 flex items-center gap-1.5 text-[10px] text-white/40">
          <Send className="h-3 w-3 text-violet-300" />
          <span className="font-mono uppercase tracking-wider">Draft</span>
        </div>
        <div className="text-[12px] font-semibold text-white">
          Q3 budget review — quick sync?
        </div>
        <div className="mt-2 space-y-1 text-[11px] leading-relaxed text-white/55">
          <p>Hey Sarah,</p>
          <p>Got a few minutes this week to walk through the Q3 numbers?</p>
          <p>Wed or Thu afternoon both work for me.</p>
        </div>
      </motion.div>
    </div>
  )
}

export function EmailVisual() {
  const reduced = useReducedMotion() ?? false
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#0d1020] via-[#0f1126] to-[#0a0e1a] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6),0_0_40px_-25px_rgba(139,92,246,0.4)] backdrop-blur">
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/[0.02] px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-500/70" />
        <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
        <span className="h-3 w-3 rounded-full bg-green-500/70" />
        <span className="ml-3 flex items-center gap-1.5 font-mono text-[11px] text-white/40">
          <Mail className="h-3 w-3" />
          email agent
        </span>
      </div>
      <Scene
        height="360px"
        className="w-full"
        layers={[
          {
            speed: 0.6,
            className: 'pointer-events-none opacity-80',
            children: <Starfield />,
          },
          {
            speed: -0.2,
            className: 'pointer-events-none',
            children: <PaperPlane reduced={reduced} />,
          },
          {
            speed: -0.4,
            children: <EmailDraftCard reduced={reduced} />,
          },
        ]}
      />
    </div>
  )
}

/* ============================================================
   ScheduleVisual — calendar with sliding time blocks
   ============================================================ */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
const HOURS = ['9a', '11a', '1p', '3p', '5p']

// existing muted meeting blocks
const MEETINGS: { day: number; row: number; span: number; label: string }[] = [
  { day: 0, row: 0, span: 1, label: 'Standup' },
  { day: 1, row: 1, span: 1, label: 'PR review' },
  { day: 2, row: 0, span: 1, label: 'Standup' },
  { day: 3, row: 2, span: 1, label: '1:1' },
  { day: 4, row: 0, span: 1, label: 'Standup' },
]

// 3 violet scheduled-task blocks (the foreground stars)
const TASKS: { day: number; row: number; span: number; label: string }[] = [
  { day: 0, row: 3, span: 2, label: 'Database project' },
  { day: 1, row: 3, span: 1, label: 'Read CS162 ch.7' },
  { day: 2, row: 3, span: 1, label: 'Study group prep' },
]

function ScheduleAxis() {
  // soft horizontal time-axis lines
  return (
    <div className="relative h-full w-full px-[2.5rem] pt-6">
      <div className="grid h-full grid-rows-5 gap-1">
        {HOURS.map((h) => (
          <div
            key={h}
            className="flex items-center border-t border-violet-400/[0.06] pl-1"
          >
            <span className="absolute left-1 font-mono text-[9px] text-white/25">
              {h}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScheduleMeetings() {
  return (
    <div className="grid h-full grid-cols-[2.25rem_repeat(5,minmax(0,1fr))] gap-1.5 pt-6">
      <div />
      {DAYS.map((_, dayIdx) => (
        <div key={dayIdx} className="relative grid grid-rows-5 gap-1.5">
          {Array.from({ length: 5 }).map((_, r) => (
            <div key={r} className="rounded border border-white/[0.04]" />
          ))}
          {MEETINGS.filter((m) => m.day === dayIdx).map((m, i) => (
            <div
              key={i}
              className="absolute inset-x-0 rounded-md border border-white/10 bg-white/[0.05] px-1.5 py-1 text-[9px] font-medium leading-tight text-white/50"
              style={{
                top: `calc(${m.row} * (100% / 5))`,
                height: `calc(${m.span} * (100% / 5))`,
              }}
            >
              {m.label}
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}

function ScheduleTasks({ reduced }: { reduced: boolean }) {
  return (
    <div className="grid h-full grid-cols-[2.25rem_repeat(5,minmax(0,1fr))] gap-1.5 pt-6">
      <div />
      {DAYS.map((_, dayIdx) => (
        <div key={dayIdx} className="relative">
          {TASKS.filter((t) => t.day === dayIdx).map((t, i) => (
            <motion.div
              key={i}
              initial={
                reduced ? { opacity: 1, x: 0, scale: 1 } : { opacity: 0, x: -40, scale: 0.92 }
              }
              whileInView={{ opacity: 1, x: 0, scale: 1 }}
              viewport={{ once: true, margin: '-10%' }}
              transition={{
                duration: 0.7,
                delay: 0.2 + dayIdx * 0.15,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="absolute inset-x-0 rounded-md border border-violet-400/40 bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 px-1.5 py-1 text-[9px] font-medium leading-tight text-violet-50 shadow-[0_8px_20px_rgba(139,92,246,0.25),inset_0_1px_0_rgba(255,255,255,0.08)]"
              style={{
                top: `calc(${t.row} * (100% / 5))`,
                height: `calc(${t.span} * (100% / 5))`,
              }}
            >
              {t.label}
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  )
}

export function ScheduleVisual() {
  const reduced = useReducedMotion() ?? false
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.05] to-white/[0.01] p-5 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6),0_0_40px_-25px_rgba(139,92,246,0.4)] backdrop-blur">
      <div className="mb-3 flex items-center justify-between text-xs text-white/45">
        <span className="flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5 text-violet-300" />
          This week
        </span>
        <span className="font-mono text-[10px] text-white/35">9:00 — 5:00</span>
      </div>
      {/* Day headers */}
      <div className="mb-2 grid grid-cols-[2.25rem_repeat(5,minmax(0,1fr))] gap-1.5">
        <div />
        {DAYS.map((d) => (
          <div
            key={d}
            className="text-center font-mono text-[10px] uppercase tracking-wider text-white/45"
          >
            {d}
          </div>
        ))}
      </div>
      <Scene
        height="240px"
        className="w-full"
        layers={[
          {
            speed: 0.5,
            className: 'pointer-events-none',
            children: <ScheduleAxis />,
          },
          {
            speed: 0,
            className: 'pointer-events-none',
            children: <ScheduleMeetings />,
          },
          {
            speed: -0.3,
            children: <ScheduleTasks reduced={reduced} />,
          },
        ]}
      />
    </div>
  )
}
