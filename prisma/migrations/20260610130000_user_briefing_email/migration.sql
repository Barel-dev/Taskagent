-- Opt-in flag: the morning cron emails the user their daily briefing.
ALTER TABLE "User" ADD COLUMN "briefingEmail" BOOLEAN NOT NULL DEFAULT false;
