"use client";

import Link from "next/link";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";
import { ArrowLeft, Trophy, Dumbbell, History, Target } from "lucide-react";

type Exercise = {
    id: string;
    name: string;
    muscleGroup: string;
    currentWeightGoal: number | null;
    goalDate: Date | null;
};

type TimelinePoint = {
    dateISO: string;
    effectiveWeight: number;
    weight: number;
    reps: number | null;
};

type HistoryEntry = {
    id: string;
    dateISO: string;
    routine: {
        id: string;
        name: string;
        color: string;
    };
    setNumber: number;
    reps: number | null;
    weight: number | null;
    durationSec: number | null;
    effectiveWeight: number | null;
};

type Props = {
    exercise: Exercise;
    timeline: TimelinePoint[];
    history: HistoryEntry[];
    stats: {
        totalSets: number;
        totalSessions: number;
        bestWeight: number;
        bestEffectiveWeight: number;
    };
};

function formatDateShort(dateISO: string) {
    return new Date(`${dateISO}T00:00:00Z`).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
    });
}

function formatDateLong(dateISO: string) {
    return new Date(`${dateISO}T00:00:00Z`).toLocaleDateString("es-AR", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

export function ExerciseHistoryClient({ exercise, timeline, history, stats }: Props) {
    const chartData = timeline.map((point) => ({
        ...point,
        label: formatDateShort(point.dateISO),
    }));

    return (
        <div className="space-y-6">
            <header className="flex items-center gap-3">
                <Link
                    href="/gym"
                    className="h-9 w-9 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Link>

                <div>
                    <h1 className="text-xl md:text-2xl font-bold">{exercise.name}</h1>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                        {exercise.muscleGroup}
                    </p>
                </div>
            </header>

            <section className="grid gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-border/50 bg-card/50 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Top E1RM</p>
                    <p className="mt-1 text-xl text-cyan-200 font-[family-name:var(--font-geist-mono)]">
                        {stats.bestEffectiveWeight.toFixed(1)} kg
                    </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/50 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Top peso</p>
                    <p className="mt-1 text-xl font-[family-name:var(--font-geist-mono)]">
                        {stats.bestWeight.toFixed(1)} kg
                    </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/50 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Objetivo</p>
                    <p className="mt-1 text-xl font-[family-name:var(--font-geist-mono)]">
                        {exercise.currentWeightGoal ? `${exercise.currentWeightGoal.toFixed(1)} kg` : "--"}
                    </p>
                </div>
                <div className="rounded-xl border border-border/50 bg-card/50 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sesiones</p>
                    <p className="mt-1 text-xl font-[family-name:var(--font-geist-mono)]">
                        {stats.totalSessions}
                    </p>
                </div>
            </section>

            <section className="rounded-xl border border-border/50 bg-card/40 p-4 md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-cyan-300" />
                        <h2 className="text-sm font-semibold">
                            Evolucion de fuerza (Peso Efectivo / E1RM)
                        </h2>
                    </div>
                    {exercise.goalDate && (
                        <div className="flex items-center gap-1.5 text-[11px] text-orange-200">
                            <Target className="h-3.5 w-3.5" />
                            Meta:{" "}
                            {new Date(exercise.goalDate).toLocaleDateString("es-AR", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                            })}
                        </div>
                    )}
                </div>

                {chartData.length === 0 ? (
                    <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                        Todavia no hay datos para graficar este ejercicio.
                    </div>
                ) : (
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                                <XAxis
                                    dataKey="label"
                                    stroke="rgba(255,255,255,0.5)"
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={11}
                                />
                                <YAxis
                                    stroke="rgba(255,255,255,0.5)"
                                    tickLine={false}
                                    axisLine={false}
                                    fontSize={11}
                                    width={42}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#09090b",
                                        borderColor: "#27272a",
                                        borderRadius: "12px",
                                        color: "#fff",
                                    }}
                                    formatter={(value, key) => {
                                        const numValue = typeof value === "number" ? value : Number(value || 0);
                                        const keyLabel = String(key) === "effectiveWeight" ? "E1RM" : "Peso";
                                        return [`${numValue.toFixed(1)} kg`, keyLabel];
                                    }}
                                    labelFormatter={(label, payload) => {
                                        if (!payload || payload.length === 0) return String(label);
                                        const point = payload[0].payload as TimelinePoint;
                                        return formatDateLong(point.dateISO);
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="effectiveWeight"
                                    name="E1RM"
                                    stroke="#22d3ee"
                                    strokeWidth={2.5}
                                    dot={{ r: 3, strokeWidth: 0, fill: "#22d3ee" }}
                                    activeDot={{ r: 5 }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="weight"
                                    name="Peso"
                                    stroke="#f97316"
                                    strokeWidth={2}
                                    dot={false}
                                    strokeDasharray="6 4"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </section>

            <section className="rounded-xl border border-border/50 bg-card/40 p-4 md:p-5">
                <div className="flex items-center gap-2 mb-4">
                    <History className="h-4 w-4 text-orange-300" />
                    <h2 className="text-sm font-semibold">Historial de pesos ({stats.totalSets} series)</h2>
                </div>

                {history.length === 0 ? (
                    <div className="py-8 text-sm text-muted-foreground text-center">
                        No hay historial de pesos para este ejercicio.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {history.map((entry) => (
                            <div
                                key={entry.id}
                                className="grid grid-cols-[1fr_auto] gap-3 items-center rounded-lg border border-border/40 bg-background/20 px-3 py-2.5"
                            >
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <span>{formatDateLong(entry.dateISO)}</span>
                                        <span>·</span>
                                        <span className="truncate">{entry.routine.name}</span>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
                                        <Dumbbell className="h-3 w-3" />
                                        Set #{entry.setNumber}
                                        {entry.reps ? <span>· {entry.reps} reps</span> : null}
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="font-[family-name:var(--font-geist-mono)] text-sm">
                                        {typeof entry.weight === "number" ? `${entry.weight.toFixed(1)} kg` : "-"}
                                    </p>
                                    <p className="text-[11px] text-cyan-200 font-[family-name:var(--font-geist-mono)]">
                                        {typeof entry.effectiveWeight === "number"
                                            ? `E1RM ${entry.effectiveWeight.toFixed(1)}`
                                            : ""}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
