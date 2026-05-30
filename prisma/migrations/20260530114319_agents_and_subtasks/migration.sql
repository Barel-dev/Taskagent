-- CreateEnum
CREATE TYPE "AgentType" AS ENUM ('BREAKDOWN', 'PRIORITIZER', 'SCHEDULE', 'EMAIL', 'BRIEFING');

-- CreateEnum
CREATE TYPE "AgentRunStatus" AS ENUM ('PENDING', 'SUCCESS', 'ERROR');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "estimatedMinutes" INTEGER,
ADD COLUMN     "parentId" TEXT;

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "agentType" "AgentType" NOT NULL,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'PENDING',
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "tokensUsed" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentRun_userId_createdAt_idx" ON "AgentRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Task_parentId_idx" ON "Task"("parentId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentRun" ADD CONSTRAINT "AgentRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
