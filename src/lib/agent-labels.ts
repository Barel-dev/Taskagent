import type { AgentType } from '@prisma/client'

// Human-friendly label for each agent type, shared by the dashboard's by-agent
// breakdown and the per-task activity log so the names stay in sync.
export const AGENT_TYPE_LABEL: Record<AgentType, string> = {
  PLAN: 'Plan',
  BREAKDOWN: 'Breakdown',
  REFINE: 'Refine',
  EXECUTE: 'Do it',
  PRIORITIZER: 'Prioritizer',
  SUMMARY: 'Summary',
  BRIEFING: 'Daily Briefing',
  WEEKLY_REVIEW: 'Weekly Review',
  SCHEDULE: 'Schedule',
  DAY_PLAN: 'Day Planner',
  EMAIL: 'Email',
  CHAT: 'Chat',
  ASSESS: 'Risk check',
}

/** Label for a possibly-unknown agent-type string (falls back to the raw value). */
export function agentLabel(type: string): string {
  return AGENT_TYPE_LABEL[type as AgentType] ?? type
}

// A distinct accent color (Tailwind bg class) per agent type, shared by the
// dashboard's by-agent breakdown, the recent-runs list, and the per-task
// activity log so each agent reads consistently across the app.
export const AGENT_TYPE_COLOR: Record<AgentType, string> = {
  PLAN: 'bg-violet-400',
  BREAKDOWN: 'bg-fuchsia-400',
  REFINE: 'bg-pink-400',
  EXECUTE: 'bg-emerald-400',
  PRIORITIZER: 'bg-amber-400',
  SUMMARY: 'bg-sky-400',
  BRIEFING: 'bg-cyan-400',
  WEEKLY_REVIEW: 'bg-teal-400',
  SCHEDULE: 'bg-indigo-400',
  DAY_PLAN: 'bg-blue-400',
  EMAIL: 'bg-rose-400',
  CHAT: 'bg-lime-400',
  ASSESS: 'bg-orange-400',
}

/** Accent color class for a possibly-unknown agent-type string. */
export function agentColor(type: string): string {
  return AGENT_TYPE_COLOR[type as AgentType] ?? 'bg-white/40'
}
