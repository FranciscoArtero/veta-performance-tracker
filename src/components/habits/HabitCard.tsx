"use client";

import { useOptimistic, useTransition, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Flame } from "lucide-react";
import { toggleHabitLog, deleteHabit, addWeeklySession } from "@/app/actions/habits";
import { resolveHabitIcon } from "@/lib/habit-icons";

type HabitWithLogs = {
    id: string;
    name: string;
    icon: string;
    color: string;
    frequency: string;
    weeklyMode?: string | null;
    goalDays?: number | null;
    targetDays?: number[];
    weekSessions?: number;
    logs: { id: string; date: Date; completed: boolean }[];
};

type Props = {
    habit: HabitWithLogs;
    streak: number;
    weekDates: string[];
};

const DAY_LABELS = ["D", "L", "M", "X", "J", "V", "S"];

export function HabitCard({ habit, streak, weekDates }: Props) {
    const [, startTransition] = useTransition();
    const [confirmDelete, setConfirmDelete] = useState(false);

    // ─── Shared: optimistic week map for daily + fixed ───
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

    // ─── Flexible: optimistic session count ───
    const [optimisticSessions, setOptimisticSessions] = useOptimistic(
        habit.weekSessions ?? 0,
        (state: number, delta: number) => state + delta
    );

    function handleToggleDay(dateISO: string) {
        startTransition(async () => {
            setOptimisticWeek(dateISO);
            await toggleHabitLog(habit.id, dateISO);
        });
    }

    function handleAddSession() {
        startTransition(async () => {
            // Check if today already has a log - if so we're removing
            const today = new Date();
            const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
            const todayHasLog = initialWeekMap[todayISO];
            setOptimisticSessions(todayHasLog ? -1 : 1);
            await addWeeklySession(habit.id);
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

    // ─── Frequency label ───
    function getFreqLabel() {
        if (habit.frequency === "weekly_fixed") {
            const dayLabels = (habit.targetDays ?? [])
                .sort((a, b) => a - b)
                .map((d) => DAY_LABELS[d]);
            return `Fijo — ${dayLabels.join("-")}`;
        }
        if (habit.frequency === "weekly_flexible") {
            return `Flexible — ${habit.goalDays ?? 3}x/sem`;
        }
        return "Diario";
    }

    return (
        <Card className="group border-border/50 bg-card/50 backdrop-blur-sm transition-smooth hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5">
            <CardContent className="p-4 md:p-5">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                        <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-smooth group-hover:scale-110 shrink-0"
                            style={{ backgroundColor: `${habit.color}15`, color: habit.color }}
                        >
                            {(() => {
                                const IconComponent = resolveHabitIcon(habit.icon);
                                return <IconComponent className="h-5 w-5" strokeWidth={1.5} />;
                            })()}
                        </div>
                        <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{habit.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                                {getFreqLabel()}
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
                            className="flex items-center gap-1 text-[10px] font-semibold"
                            style={{ color: habit.color }}
                        >
                            <Flame className="h-3 w-3" strokeWidth={2} />
                            {streak}
                        </Badge>
                    </div>
                </div>

                {/* ─── DAILY: 7-day grid with missed state ─── */}
                {habit.frequency === "daily" && (
                    <div className="mt-4 flex gap-1">
                        {weekDates.map((dateISO, j) => {
                            const done = optimisticWeek[dateISO];
                            const date = new Date(dateISO + "T12:00:00");
                            const dayIndex = date.getDay();
                            const label = DAY_LABELS[dayIndex];
                            const today = new Date();
                            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                            const isPast = dateISO < todayStr;
                            const isMissed = isPast && !done;

                            return (
                                <div
                                    key={j}
                                    className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
                                    onClick={() => handleToggleDay(dateISO)}
                                >
                                    <div
                                        className={`h-6 w-full rounded-sm transition-smooth hover:scale-110 ${isMissed ? "ring-1 ring-red-500/30" : ""
                                            }`}
                                        style={{
                                            backgroundColor: done
                                                ? `${habit.color}80`
                                                : isMissed
                                                    ? "hsl(0 60% 20% / 0.4)"
                                                    : "hsl(var(--muted) / 0.3)",
                                        }}
                                    />
                                    <span className={`text-[9px] ${isMissed ? "text-red-400/70" : "text-muted-foreground"}`}>
                                        {label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ─── WEEKLY FIXED: 7-day grid with disabled non-target days ─── */}
                {habit.frequency === "weekly_fixed" && (
                    <div className="mt-4 flex gap-1">
                        {weekDates.map((dateISO, j) => {
                            const done = optimisticWeek[dateISO];
                            const date = new Date(dateISO + "T12:00:00");
                            const dayIndex = date.getDay();
                            const label = DAY_LABELS[dayIndex];
                            const isTarget = (habit.targetDays ?? []).includes(dayIndex);

                            return (
                                <div
                                    key={j}
                                    className={`flex-1 flex flex-col items-center gap-1 ${isTarget ? "cursor-pointer" : "opacity-30 cursor-not-allowed"
                                        }`}
                                    onClick={() => isTarget && handleToggleDay(dateISO)}
                                >
                                    <div
                                        className={`h-6 w-full rounded-sm transition-smooth ${isTarget ? "hover:scale-110" : ""
                                            }`}
                                        style={{
                                            backgroundColor: done
                                                ? `${habit.color}80`
                                                : isTarget
                                                    ? "hsl(var(--muted) / 0.3)"
                                                    : "hsl(var(--muted) / 0.1)",
                                        }}
                                    />
                                    <span className={`text-[9px] ${isTarget ? "text-muted-foreground font-bold" : "text-muted-foreground/40"
                                        }`}>
                                        {label}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* ─── WEEKLY FLEXIBLE: Progress slots + "+" button ─── */}
                {habit.frequency === "weekly_flexible" && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between">
                            <div className="flex gap-1.5">
                                {Array.from({ length: habit.goalDays ?? 3 }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-5 w-5 rounded-md transition-smooth ${i < optimisticSessions
                                            ? "scale-100"
                                            : "border border-dashed border-muted-foreground/30"
                                            }`}
                                        style={{
                                            backgroundColor: i < optimisticSessions ? `${habit.color}80` : "transparent",
                                        }}
                                    />
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground font-medium">
                                    {optimisticSessions}/{habit.goalDays ?? 3}
                                </span>
                                <button
                                    onClick={handleAddSession}
                                    title="Agregar sesión"
                                    className="flex h-7 w-7 items-center justify-center rounded-lg transition-smooth hover:scale-110"
                                    style={{
                                        backgroundColor: `${habit.color}20`,
                                        color: habit.color,
                                    }}
                                >
                                    <Plus className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                        {optimisticSessions >= (habit.goalDays ?? 3) && (
                            <p className="text-[11px] text-emerald-400 font-medium mt-2">
                                ✅ ¡Meta de la semana cumplida!
                            </p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
