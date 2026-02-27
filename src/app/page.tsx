export const dynamic = 'force-dynamic';

import { TEMP_USER_ID } from "@/lib/constants";
import {
  getHabitsWithLogs,
  getMonthlyLogs,
} from "@/app/actions/habits";
import { computeStreak } from "@/lib/habits";
import {
  getMentalStateWeek,
  getTodayMentalState,
} from "@/app/actions/mental-state";
import { DashboardClient } from "@/components/dashboard/DashboardClient";

export default async function DashboardPage() {
  const [habits, moodData, monthlyData, todayMood] = await Promise.all([
    getHabitsWithLogs(TEMP_USER_ID),
    getMentalStateWeek(TEMP_USER_ID),
    getMonthlyLogs(TEMP_USER_ID),
    getTodayMentalState(TEMP_USER_ID),
  ]);

  // Compute streaks for each habit
  const streaks: Record<string, number> = {};
  let bestStreak = 0;
  for (const habit of habits) {
    const s = computeStreak(habit.logs);
    streaks[habit.id] = s;
    if (s > bestStreak) bestStreak = s;
  }

  // Serialize dates for client
  const serializedHabits = habits.map((h) => ({
    ...h,
    createdAt: undefined,
    updatedAt: undefined,
    logs: h.logs.map((l) => ({
      id: l.id,
      date: l.date,
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
      bestStreak={bestStreak}
      moodData={moodData}
      monthlyData={monthlyData}
      todayMood={todayMood}
      monthLabel={monthLabel}
    />
  );
}
