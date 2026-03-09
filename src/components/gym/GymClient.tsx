"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, Plus, History } from "lucide-react";
import { RoutineCard } from "./RoutineCard";
import { CreateRoutineDialog } from "./CreateRoutineDialog";
import { WorkoutSession } from "./WorkoutSession";

type Exercise = {
    id: string;
    name: string;
    category: string;
    order: number;
};

type Routine = {
    id: string;
    name: string;
    description: string | null;
    color: string;
    exercises: Exercise[];
    _count: { logs: number };
};

type WorkoutLogEntry = {
    id: string;
    date: Date;
    rpe: number | null;
    durationMinutes: number | null;
    routine: { name: string; color: string };
    sets: {
        id: string;
        setNumber: number;
        reps: number | null;
        weight: number | null;
        exercise: { name: string; category: string };
    }[];
};

type Props = {
    routines: Routine[];
    recentLogs: WorkoutLogEntry[];
};

const fadeIn = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.06, duration: 0.35 },
    }),
};

export function GymClient({ routines, recentLogs }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
    const [view, setView] = useState<"routines" | "history">("routines");

    if (activeRoutine) {
        return (
            <WorkoutSession
                routine={activeRoutine}
                onFinish={() => setActiveRoutine(null)}
            />
        );
    }

    return (
        <div className="space-y-6 md:space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight lg:text-3xl flex items-center gap-2">
                        <Dumbbell className="h-7 w-7 text-orange-400" />
                        Gym
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Rutinas, ejercicios y progreso de fuerza.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setView(view === "routines" ? "history" : "routines")}
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-black/5 dark:bg-white/5"
                    >
                        <History className="h-3.5 w-3.5" />
                        {view === "routines" ? "Historial" : "Rutinas"}
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {view === "routines" ? (
                    <motion.div
                        key="routines"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                    >
                        {routines.map((routine, i) => (
                            <motion.div
                                key={routine.id}
                                custom={i}
                                variants={fadeIn}
                                initial="hidden"
                                animate="visible"
                            >
                                <RoutineCard
                                    routine={routine}
                                    onStart={() => setActiveRoutine(routine)}
                                />
                            </motion.div>
                        ))}

                        {/* Add Routine Card */}
                        <motion.button
                            custom={routines.length}
                            variants={fadeIn}
                            initial="hidden"
                            animate="visible"
                            onClick={() => setShowCreate(true)}
                            className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border/50 p-8 transition-all hover:border-orange-500/40 hover:bg-orange-500/5 min-h-[160px]"
                        >
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 group-hover:from-orange-500/30 group-hover:to-red-500/30 transition-all">
                                <Plus className="h-5 w-5 text-orange-400" />
                            </div>
                            <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                Nueva Rutina
                            </span>
                        </motion.button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="history"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                    >
                        {recentLogs.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground text-sm">
                                Todavía no registraste entrenamientos.
                            </div>
                        ) : (
                            recentLogs.map((log) => {
                                const d = new Date(log.date);
                                const dateStr = d.toLocaleDateString("es-AR", {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "short",
                                });
                                const totalSets = log.sets.length;
                                const exercises = Array.from(new Set(log.sets.map(s => s.exercise.name)));
                                return (
                                    <div
                                        key={log.id}
                                        className="flex items-center gap-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm p-4"
                                    >
                                        <div
                                            className="h-10 w-1 rounded-full shrink-0"
                                            style={{ backgroundColor: log.routine.color }}
                                        />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium text-sm truncate">{log.routine.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">
                                                {exercises.join(", ")}
                                            </p>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <p className="text-xs font-medium">{dateStr}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {totalSets} series{log.rpe ? ` · RPE ${log.rpe}` : ""}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <CreateRoutineDialog open={showCreate} onClose={() => setShowCreate(false)} />
        </div>
    );
}
