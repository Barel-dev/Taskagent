-- AlterEnum
ALTER TYPE "AgentType" ADD VALUE 'EXECUTE';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "result" TEXT,
ADD COLUMN     "resultAt" TIMESTAMP(3);
