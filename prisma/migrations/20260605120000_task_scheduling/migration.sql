-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "scheduledStart" TIMESTAMP(3),
ADD COLUMN     "scheduledEnd" TIMESTAMP(3),
ADD COLUMN     "calendarEventId" TEXT;
