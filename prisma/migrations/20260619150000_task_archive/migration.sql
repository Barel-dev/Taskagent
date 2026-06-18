-- Soft-archive: archived tasks are hidden from the main views but kept and
-- can be restored from the Archive page.
ALTER TABLE "Task" ADD COLUMN "archivedAt" TIMESTAMP(3);
