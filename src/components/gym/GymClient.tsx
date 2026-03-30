"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dumbbell, Plus, History, ChevronRight, LineChart, Library } from "lucide-react";
import { RoutineCard } from "./RoutineCard";
import { CreateRoutineDialog } from "./CreateRoutineDialog";
import { WorkoutSession } from "./WorkoutSession";

type Routine = {
    id: string;
    name: string;
    description: string | null;
    color: string;
    focusType: "STRENGTH" | "HYPERTROPHY" | "ENDURANCE";
    exercises: {
        id: string;
        order: number;
        globalExercise: {
            id: string;
            name: string;
            muscleGroup: string;
        };
    }[];
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
        exercise: {
            id: string;
            globalExercise: {
                id: string;
                name: string;
                muscleGroup: string;
            };
        };
    }[];
};

type ExerciseProgress = {
    id: string;
    name: string;
    muscleGroup: string;
    currentWeightGoal: number | null;
    goalDate: Date | null;
    lastTrainedAt: Date | null;
    bestWeight: number;
    bestEffectiveWeight: number;
    lastWeight: number | null;
    totalSessions: number;
};

type GlobalExercise = {
    id: string;
    name: string;
    muscleGroup: string;
};

type Props = {
    routines: Routine[];
    recentLogs: WorkoutLogEntry[];
    exerciseProgress: ExerciseProgress[];
    globalExercises: GlobalExercise[];
};

const fadeIn = {
    hidden: { opacity: 0, y: 12 },
    visible: (index: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: index * 0.06, duration: 0.35 },
    }),
};

export function GymClient({ routines, recentLogs, exerciseProgress, globalExercises }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);
    const [view, setView] = useState<"routines" | "history">("routines");
    const [exerciseFilter, setExerciseFilter] = useState("all");
    const [muscleGroupFilter, setMuscleGroupFilter] = useState("all");

    const muscleGroups = useMemo(
        () => Array.from(new Set(globalExercises.map((exercise) => exercise.muscleGroup))).sort(),
        [globalExercises]
    );

    const filteredProgress = useMemo(() => {
        return exerciseProgress.filter((exercise) => {
            if (exerciseFilter !== "all" && exercise.id !== exerciseFilter) return false;
            if (muscleGroupFilter !== "all" && exercise.muscleGroup !== muscleGroupFilter) {
                return false;
            }
            return true;
        });
    }, [exerciseFilter, exerciseProgress, muscleGroupFilter]);

    if (activeRoutine) {
        return <WorkoutSession routine={activeRoutine} onFinish={() => setActiveRoutine(null)} />;
    }

    return (
        <div className="space-y-6 md:space-y-8">
            <div className="flex items-start justify-between gap-3">
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
                    <Link
                        href="/gym/exercises"
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors bg-black/5 dark:bg-white/5"
                    >
                        <Library className="h-3.5 w-3.5" />
                        Mis ejercicios
                    </Link>
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
                        className="space-y-6"
                    >
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {routines.map((routine, index) => (
                                <motion.div
                                    key={routine.id}
                                    custom={index}
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
                        </div>

                        <section className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                    <LineChart className="h-4 w-4 text-cyan-300" />
                                    <h2 className="text-sm font-semibold">Evolucion por ejercicio</h2>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <select
                                        value={exerciseFilter}
                                        onChange={(event) => setExerciseFilter(event.target.value)}
                                        className="rounded-lg border border-border/50 bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                                    >
                                        <option value="all">Todos los ejercicios</option>
                                        {globalExercises.map((exercise) => (
                                            <option key={exercise.id} value={exercise.id}>
                                                {exercise.name}
                                            </option>
                                        ))}
                                    </select>

                                    <select
                                        value={muscleGroupFilter}
                                        onChange={(event) => setMuscleGroupFilter(event.target.value)}
                                        className="rounded-lg border border-border/50 bg-background px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
                                    >
                                        <option value="all">Todos los grupos</option>
                                        {muscleGroups.map((group) => (
                                            <option key={group} value={group}>
                                                {group}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {filteredProgress.length === 0 ? (
                                <div className="rounded-xl border border-border/50 bg-card/40 p-4 text-xs text-muted-foreground">
                                    No hay ejercicios para los filtros seleccionados.
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {filteredProgress.map((exercise) => (
                                        <Link
                                            key={exercise.id}
                                            href={`/gym/exercise/${exercise.id}`}
                                            className="group rounded-xl border border-border/50 bg-card/50 p-4 hover:border-cyan-300/40 transition-all"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0">
                                                    <p className="text-sm font-semibold truncate">
                                                        {exercise.name}
                                                    </p>
                                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                        {exercise.muscleGroup}
                                                    </p>
                                                </div>
                                                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-cyan-300 transition-colors" />
                                            </div>

                                            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                                                <div className="rounded-lg border border-border/40 bg-background/30 px-2 py-1.5">
                                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                        Top E1RM
                                                    </p>
                                                    <p className="font-[family-name:var(--font-geist-mono)] text-sm text-cyan-200">
                                                        {exercise.bestEffectiveWeight.toFixed(1)} kg
                                                    </p>
                                                </div>
                                                <div className="rounded-lg border border-border/40 bg-background/30 px-2 py-1.5">
                                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                        Objetivo
                                                    </p>
                                                    <p className="font-[family-name:var(--font-geist-mono)] text-sm">
                                                        {exercise.currentWeightGoal
                                                            ? `${exercise.currentWeightGoal.toFixed(1)} kg`
                                                            : "--"}
                                                    </p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </section>
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
                                Todavia no registraste entrenamientos.
                            </div>
                        ) : (
                            recentLogs.map((log) => {
                                const date = new Date(log.date);
                                const dateLabel = date.toLocaleDateString("es-AR", {
                                    weekday: "short",
                                    day: "numeric",
                                    month: "short",
                                });
                                const totalSets = log.sets.length;
                                const exercises = Array.from(
                                    new Set(log.sets.map((set) => set.exercise.globalExercise.name))
                                );

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
                                            <p className="text-xs font-medium">{dateLabel}</p>
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

            <CreateRoutineDialog
                open={showCreate}
                onClose={() => setShowCreate(false)}
                globalExercises={globalExercises.map((exercise) => ({
                    id: exercise.id,
                    name: exercise.name,
                    muscleGroup: exercise.muscleGroup,
                }))}
            />
        </div>
    );
}
