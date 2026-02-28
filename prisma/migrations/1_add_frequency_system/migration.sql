-- Add frequency system columns to habits table
ALTER TABLE "habits" ADD COLUMN "weeklyMode" TEXT;
ALTER TABLE "habits" ADD COLUMN "goalDays" INTEGER;
ALTER TABLE "habits" ADD COLUMN "targetDays" INTEGER[] DEFAULT '{}';
