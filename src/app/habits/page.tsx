export const dynamic = 'force-dynamic';

import {
    getHabitsWithWeeklyLogs,
} from "@/app/actions/habits";
import { computeStreak } from "@/lib/habits";
import { HabitCard } from "@/components/habits/HabitCard";
import { HabitsPageClient, AddHabitCard } from "@/components/habits/HabitsPageClient";

export default async function HabitsPage() {
    try {
        const habits = await getHabitsWithWeeklyLogs();

        // Compute streaks
        const streaks: Record<string, number> = {};
        for (const habit of habits) {
            streaks[habit.id] = computeStreak(habit.logs);
        }

        // Generate last 7 days ISO strings
        const now = new Date();
        const weekDates: string[] = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            weekDates.push(
                `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
            );
        }

        return (
            <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
                {/* Header — client component with dialog */}
                <HabitsPageClient />

                {/* Habits Grid */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {habits.map((habit) => (
                        <HabitCard
                            key={habit.id}
                            habit={{
                                id: habit.id,
                                name: habit.name,
                                icon: habit.icon,
                                color: habit.color,
                                frequency: habit.frequency,
                                weeklyMode: habit.weeklyMode,
                                goalDays: habit.goalDays,
                                targetDays: habit.targetDays,
                                weekSessions: habit.weekSessions,
                                logs: habit.logs.map((l) => ({
                                    id: l.id,
                                    date: l.date,
                                    completed: l.completed,
                                })),
                            }}
                            streak={streaks[habit.id]}
                            weekDates={weekDates}
                        />
                    ))}

                    {/* Add New Habit Card */}
                    <AddHabitCard />
                </div>
            </div>
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
