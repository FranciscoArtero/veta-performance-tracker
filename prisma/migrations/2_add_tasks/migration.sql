-- Create tasks table
CREATE TABLE IF NOT EXISTS "tasks" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "date" DATE NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- Add foreign key and indexes for tasks
DO $$ BEGIN
    ALTER TABLE "tasks" ADD CONSTRAINT "tasks_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "tasks_userId_idx" ON "tasks"("userId");
CREATE INDEX IF NOT EXISTS "tasks_date_idx" ON "tasks"("date");
CREATE INDEX IF NOT EXISTS "tasks_userId_date_idx" ON "tasks"("userId", "date");
