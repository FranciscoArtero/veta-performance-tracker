-- AlterTable
ALTER TABLE "users" ADD COLUMN "password" TEXT;
ALTER TABLE "users" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires';
