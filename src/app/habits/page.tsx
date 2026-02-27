export const dynamic = 'force-dynamic';

import { Target, Plus, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TEMP_USER_ID } from "@/lib/constants";
import {
    getHabitsWithWeeklyLogs,
} from "@/app/actions/habits";
import { computeStreak } from "@/lib/habits";
import { HabitCard } from "@/components/habits/HabitCard";

export default async function HabitsPage() {
    const habits = await getHabitsWithWeeklyLogs(TEMP_USER_ID);

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
        <div className="p-6 lg:p-8 space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight lg:text-3xl flex items-center gap-2">
                        <Target className="h-7 w-7 text-violet-400" />
                        Mis Hábitos
                    </h1>
                    <p className="text-muted-foreground">
                        Administrá y hacé seguimiento de tus hábitos diarios.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5">
                        <Filter className="h-3.5 w-3.5" />
                        Filtrar
                    </Button>
                    <Button
                        size="sm"
                        className="gap-1.5 bg-violet-600 hover:bg-violet-700"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Nuevo hábito
                    </Button>
                </div>
            </div>

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
                <Card className="border-dashed border-border/50 bg-transparent transition-smooth hover:border-violet-500/30 hover:bg-card/20 cursor-pointer group">
                    <CardContent className="p-5 flex flex-col items-center justify-center h-full min-h-[150px] gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 transition-smooth group-hover:border-violet-400 group-hover:bg-violet-500/10">
                            <Plus className="h-5 w-5 text-muted-foreground group-hover:text-violet-400 transition-smooth" />
                        </div>
                        <p className="text-sm text-muted-foreground group-hover:text-foreground transition-smooth">
                            Agregar hábito
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
