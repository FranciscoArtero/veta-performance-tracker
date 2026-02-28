"use client";

import { useOptimistic, useTransition, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { toggleHabitLog, deleteHabit } from "@/app/actions/habits";

type HabitWithLogs = {
    id: string;
    name: string;
    icon: string;
    color: string;
    frequency: string;
    logs: { id: string; date: Date; completed: boolean }[];
};

type Props = {
    habit: HabitWithLogs;
    streak: number;
    weekDates: string[]; // ISO dates for the last 7 days
};

export function HabitCard({ habit, streak, weekDates }: Props) {
    const [, startTransition] = useTransition();
    const [confirmDelete, setConfirmDelete] = useState(false);

    // Build initial completion map for the week
    const initialWeekMap: Record<string, boolean> = {};
    for (const dateISO of weekDates) {
        initialWeekMap[dateISO] = habit.logs.some((l) => {
            const d = new Date(l.date);
            const logStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
            return logStr === dateISO && l.completed;
        });
    }

    const [optimisticWeek, setOptimisticWeek] = useOptimistic(
        initialWeekMap,
        (state: Record<string, boolean>, dateISO: string) => ({
            ...state,
            [dateISO]: !state[dateISO],
        })
    );

    function handleToggleDay(dateISO: string) {
        startTransition(async () => {
            setOptimisticWeek(dateISO);
            await toggleHabitLog(habit.id, dateISO);
        });
    }

    function handleDelete() {
        if (!confirmDelete) {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
            return;
        }
        startTransition(async () => {
            await deleteHabit(habit.id);
        });
    }

    return (
        <Card className="group border-border/50 bg-card/50 backdrop-blur-sm transition-smooth hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5">
            <CardContent className="p-5">
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-smooth group-hover:scale-110"
                            style={{ backgroundColor: `${habit.color}15` }}
                        >
                            {habit.icon}
                        </div>
                        <div>
                            <p className="font-medium text-sm">{habit.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                                {habit.frequency === "daily" ? "Diario" : "Semanal"}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={handleDelete}
                            title="Eliminar hábito"
                            className={`rounded-md p-1.5 text-xs transition-smooth ${confirmDelete
                                    ? "bg-red-500/20 text-red-400"
                                    : "opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                                }`}
                        >
                            {confirmDelete ? (
                                <span className="text-[10px] font-medium px-1">¿Borrar?</span>
                            ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                            )}
                        </button>
                        <Badge
                            variant="secondary"
                            className="text-[10px] font-semibold"
                            style={{ color: habit.color }}
                        >
                            🔥 {streak}
                        </Badge>
                    </div>
                </div>

                {/* Weekly grid */}
                <div className="mt-4 flex gap-1">
                    {weekDates.map((dateISO, j) => {
                        const done = optimisticWeek[dateISO];
                        const date = new Date(dateISO + "T12:00:00");
                        const dayIndex = date.getDay(); // 0=Sun
                        const label =
                            dayIndex === 0
                                ? "D"
                                : dayIndex === 1
                                    ? "L"
                                    : dayIndex === 2
                                        ? "M"
                                        : dayIndex === 3
                                            ? "X"
                                            : dayIndex === 4
                                                ? "J"
                                                : dayIndex === 5
                                                    ? "V"
                                                    : "S";
                        return (
                            <div
                                key={j}
                                className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
                                onClick={() => handleToggleDay(dateISO)}
                            >
                                <div
                                    className="h-6 w-full rounded-sm transition-smooth hover:scale-110"
                                    style={{
                                        backgroundColor: done
                                            ? `${habit.color}80`
                                            : "hsl(var(--muted) / 0.3)",
                                    }}
                                />
                                <span className="text-[9px] text-muted-foreground">
                                    {label}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
