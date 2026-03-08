export const dynamic = 'force-dynamic';

import {
  getHabitsWithLogs,
  getMonthlyLogs,
} from "@/app/actions/habits";
import { getTodayTasks } from "@/app/actions/tasks";
import {
  getMentalStateWeek,
  getTodayMentalState,
} from "@/app/actions/mental-state";
import { DashboardClient } from "@/components/dashboard/DashboardClient";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function DashboardPage() {
  try {
    const { id: userId } = await requireAuth();

    const [habits, moodData, monthlyData, todayMood, tasks, user] = await Promise.all([
      getHabitsWithLogs(),
      getMentalStateWeek(),
      getMonthlyLogs(),
      getTodayMentalState(),
      getTodayTasks(),
      prisma.user.findUnique({
        where: { id: userId },
        select: { currentGlobalStreak: true, longestGlobalStreak: true }
      })
    ]);

    // Use Prisma's native currentStreak for habits
    const streaks: Record<string, number> = {};
    for (const habit of habits) {
      streaks[habit.id] = habit.currentStreak ?? 0;
    }

    // Serialize dates for client
    const serializedHabits = habits.map((h) => ({
      ...h,
      createdAt: undefined,
      updatedAt: undefined,
      logs: h.logs.map((l) => ({
        id: l.id,
        // Fallback or serialize date just in case
        date: l.date ? new Date(l.date) : new Date(),
        completed: l.completed,
      })),
    }));

    // Month label
    const now = new Date();
    const monthLabel = now.toLocaleDateString("es-AR", {
      month: "long",
      year: "numeric",
    });

    return (
      <DashboardClient
        habits={serializedHabits}
        streaks={streaks}
        globalStreak={user?.currentGlobalStreak ?? 0}
        longestGlobalStreak={user?.longestGlobalStreak ?? 0}
        moodData={moodData}
        monthlyData={monthlyData}
        todayMood={todayMood}
        monthLabel={monthLabel}
        tasks={tasks.map((t) => ({ id: t.id, title: t.title, completed: t.completed }))}
      />
    );
  } catch (error: unknown) {
    const err = error as Error;
    return (
      <div className="p-8 text-red-500 font-mono">
        <h1 className="text-2xl font-bold mb-4">Server Error</h1>
        <pre className="bg-red-950/20 p-4 rounded-lg whitespace-pre-wrap">
          {err.message || String(error)}
          {"\n"}
          {err.stack}
        </pre>
      </div>
    );
  }
}
