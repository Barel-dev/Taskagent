-- Give each agent its own AgentType value so the dashboard's by-agent
-- breakdown is accurate (Plan, Refine, Summary, Chat, Day Planner, Weekly
-- Review previously shared coarser types or were not logged at all).
ALTER TYPE "AgentType" ADD VALUE IF NOT EXISTS 'PLAN';
ALTER TYPE "AgentType" ADD VALUE IF NOT EXISTS 'REFINE';
ALTER TYPE "AgentType" ADD VALUE IF NOT EXISTS 'SUMMARY';
ALTER TYPE "AgentType" ADD VALUE IF NOT EXISTS 'CHAT';
ALTER TYPE "AgentType" ADD VALUE IF NOT EXISTS 'DAY_PLAN';
ALTER TYPE "AgentType" ADD VALUE IF NOT EXISTS 'WEEKLY_REVIEW';
