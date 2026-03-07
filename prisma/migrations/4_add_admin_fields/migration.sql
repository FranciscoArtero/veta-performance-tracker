-- AlterTable: Add admin/user management fields
ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'USER';
ALTER TABLE "users" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
