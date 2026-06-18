-- New ASSESS agent: surfaces a task's likely risks (with mitigations) and any
-- blockers/prerequisites to resolve first.
ALTER TYPE "AgentType" ADD VALUE IF NOT EXISTS 'ASSESS';
