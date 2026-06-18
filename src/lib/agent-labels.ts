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
