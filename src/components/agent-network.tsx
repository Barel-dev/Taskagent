'use client'

import { useState } from 'react'
import { Sparkles, ListChecks, Play, FileText, ArrowDownUp, Sun } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Agent = {
  id: string
  label: string
  description: string
  Icon: LucideIcon
  /** Angle in degrees, 0 = top, clockwise */
  angle: number
  /** Hue accent for this agent (CSS color) */
  hue: string
}

const RADIUS = 220 // distance from center
const CENTER = 320 // viewBox center (640x640)

const agents: Agent[] = [
  {
    id: 'plan',
    label: 'Plan',
    description: 'Turns a plain-language goal into a task with ordered subtasks.',
    Icon: Sparkles,
    angle: -90, // top
    hue: 'rgb(167,139,250)', // violet-300
  },
  {
    id: 'breakdown',
    label: 'Breakdown',
    description: 'Splits a task into ordered, time-estimated steps.',
    Icon: ListChecks,
    angle: -30,
    hue: 'rgb(196,181,253)', // violet-200
  },
  {
    id: 'doit',
    label: 'Do it',
    description: 'Actually does the task with live web search — real results, with sources.',
    Icon: Play,
    angle: 30,
    hue: 'rgb(125,211,252)', // sky-300
  },
  {
    id: 'summary',
    label: 'Summary',
    description: 'Rolls a whole plan up into a short briefing.',
    Icon: FileText,
    angle: 90,
    hue: 'rgb(94,234,212)', // teal-300
  },
  {
    id: 'prioritizer',
    label: 'Prioritizer',
    description: 'Reorders your day by what actually matters right now.',
    Icon: ArrowDownUp,
    angle: 150,
    hue: 'rgb(244,114,182)', // pink-400
  },
  {
    id: 'briefing',
    label: 'Daily Briefing',
    description: 'A calm summary of what’s due, overdue, and worth your focus.',
    Icon: Sun,
    angle: 210,
    hue: 'rgb(251,191,36)', // amber-400
  },
]

function positionFor(angle: number, radius = RADIUS) {
  // SVG: +x right, +y down. Angle measured in degrees, 0° = right, 90° = down.
  // The agent angles are pre-set so -90° lands at top.
  const a = (angle * Math.PI) / 180
  return {
    x: CENTER + radius * Math.cos(a),
    y: CENTER + radius * Math.sin(a),
  }
}

export function AgentNetwork() {
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div className="relative mx-auto w-full max-w-[640px] aspect-square">
      <svg
        viewBox="0 0 640 640"
        className="h-full w-full"
        aria-hidden
      >
        <defs>
          {/* Central core gradient */}
          <radialGradient id="core-fill" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(221,214,254,1)" />
            <stop offset="60%" stopColor="rgba(167,139,250,0.8)" />
            <stop offset="100%" stopColor="rgba(139,92,246,0)" />
          </radialGradient>

          {/* Core halo (large) */}
          <radialGradient id="core-halo" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(167,139,250,0.4)" />
            <stop offset="60%" stopColor="rgba(167,139,250,0.05)" />
            <stop offset="100%" stopColor="rgba(167,139,250,0)" />
          </radialGradient>

          {/* Connection line gradient — fades out at endpoints */}
          {agents.map((a) => (
            <linearGradient
              key={`grad-${a.id}`}
              id={`line-${a.id}`}
              x1={positionFor(a.angle).x}
              y1={positionFor(a.angle).y}
              x2={CENTER}
              y2={CENTER}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor={a.hue} stopOpacity="0" />
              <stop offset="50%" stopColor={a.hue} stopOpacity="0.7" />
              <stop offset="100%" stopColor="rgba(221,214,254,0.9)" />
            </linearGradient>
          ))}

          {/* Glow filter for nodes */}
          <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer rotating dashed ring */}
        <g style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: 'an-ring 60s linear infinite' }}>
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS + 50}
            fill="none"
            stroke="rgba(167,139,250,0.12)"
            strokeWidth="1"
            strokeDasharray="2 8"
          />
        </g>

        {/* Inner rotating dashed ring (opposite direction) */}
        <g style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: 'an-ring 45s linear infinite reverse' }}>
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS - 40}
            fill="none"
            stroke="rgba(244,114,182,0.10)"
            strokeWidth="1"
            strokeDasharray="2 6"
          />
        </g>

        {/* Connection lines (drawn first so they sit behind nodes) */}
        {agents.map((a, i) => {
          const p = positionFor(a.angle)
          const isActive = hovered === a.id
          return (
            <g key={`line-${a.id}`}>
              {/* Static gradient line */}
              <line
                x1={p.x}
                y1={p.y}
                x2={CENTER}
                y2={CENTER}
                stroke={`url(#line-${a.id})`}
                strokeWidth={isActive ? 2.5 : 1.5}
                style={{ transition: 'stroke-width 300ms ease' }}
              />
              {/* Animated dash flowing toward center */}
              <line
                x1={p.x}
                y1={p.y}
                x2={CENTER}
                y2={CENTER}
                stroke={a.hue}
                strokeWidth="2"
                strokeOpacity="0.7"
                strokeDasharray="6 200"
                style={{
                  animation: `an-flow ${5 + i * 0.6}s linear infinite`,
                  animationDelay: `${i * 0.4}s`,
                }}
              />
            </g>
          )
        })}

        {/* Central core */}
        <g style={{ transformOrigin: `${CENTER}px ${CENTER}px`, animation: 'an-pulse 4s ease-in-out infinite' }}>
          {/* Big halo */}
          <circle cx={CENTER} cy={CENTER} r="100" fill="url(#core-halo)" />
          {/* Core */}
          <circle cx={CENTER} cy={CENTER} r="34" fill="url(#core-fill)" filter="url(#node-glow)" />
          {/* Inner bright dot */}
          <circle cx={CENTER} cy={CENTER} r="10" fill="rgb(245,243,255)" opacity="0.95" />
        </g>

        {/* Center label */}
        <text
          x={CENTER}
          y={CENTER + 75}
          textAnchor="middle"
          className="fill-white/70 text-[14px] font-medium"
          style={{ fontFamily: 'var(--font-geist-sans, sans-serif)' }}
        >
          You
        </text>

        {/* Agent nodes */}
        {agents.map((a) => {
          const p = positionFor(a.angle)
          const isActive = hovered === a.id
          return (
            <g
              key={a.id}
              transform={`translate(${p.x} ${p.y})`}
              style={{
                cursor: 'pointer',
                animation: `an-orbit-pulse 4s ease-in-out infinite`,
                animationDelay: `${agents.indexOf(a) * 0.4}s`,
                transformBox: 'fill-box',
                transformOrigin: 'center',
              }}
              onMouseEnter={() => setHovered(a.id)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* Glow halo */}
              <circle
                r={isActive ? 45 : 38}
                fill={a.hue}
                opacity={isActive ? 0.25 : 0.12}
                style={{ transition: 'all 250ms ease' }}
              />
              {/* Node circle */}
              <circle
                r={26}
                fill="rgba(10,14,26,0.9)"
                stroke={a.hue}
                strokeWidth={isActive ? 2 : 1.5}
                style={{ transition: 'all 250ms ease' }}
              />
            </g>
          )
        })}
      </svg>

      {/* Foreground HTML overlay: icons + labels positioned absolutely over each SVG node */}
      <div className="pointer-events-none absolute inset-0">
        {agents.map((a) => {
          const p = positionFor(a.angle)
          // Convert SVG coords (640 viewBox) to percentage of container
          const leftPct = (p.x / 640) * 100
          const topPct = (p.y / 640) * 100
          const isActive = hovered === a.id
          const Icon = a.Icon
          return (
            <div
              key={a.id}
              className="pointer-events-auto absolute flex flex-col items-center"
              style={{
                left: `${leftPct.toFixed(3)}%`,
                top: `${topPct.toFixed(3)}%`,
                transform: 'translate(-50%, -50%)',
              }}
              onMouseEnter={() => setHovered(a.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <div
                className="flex h-[52px] w-[52px] items-center justify-center rounded-full"
                style={{ color: a.hue }}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div
                className={`mt-1 text-center transition-all duration-300 ${
                  isActive ? 'opacity-100' : 'opacity-80'
                }`}
                style={{ width: 140 }}
              >
                <div className="text-[12px] font-medium text-white">{a.label}</div>
                <div
                  className={`mt-1 overflow-hidden text-[11px] leading-snug text-white/55 transition-[max-height,opacity] duration-300 ${
                    isActive ? 'max-h-12 opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  {a.description}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
