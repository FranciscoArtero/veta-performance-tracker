"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Plus, Minus, Dumbbell } from "lucide-react";
import { logWorkout } from "@/app/actions/gym";
import { useNetworkStatus } from "@/components/providers/NetworkStatusProvider";
import { addPendingOp } from "@/lib/offline-db";

type Exercise = {
    id: string;
    name: string;
    category: string;
    order: number;
};

type Routine = {
    id: string;
    name: string;
    color: string;
    exercises: Exercise[];
};

type SetEntry = {
    exerciseId: string;
    setNumber: number;
    reps: number;
    weight: number;
};

type Props = {
    routine: Routine;
    onFinish: () => void;
};

export function WorkoutSession({ routine, onFinish }: Props) {
    const [sets, setSets] = useState<Record<string, SetEntry[]>>(() => {
        const initial: Record<string, SetEntry[]> = {};
        for (const ex of routine.exercises) {
            initial[ex.id] = [{ exerciseId: ex.id, setNumber: 1, reps: 10, weight: 0 }];
        }
        return initial;
    });
    const [rpe, setRpe] = useState(7);
    const [notes, setNotes] = useState("");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { isOnline, refreshPending } = useNetworkStatus();

    function addSet(exerciseId: string) {
        setSets((prev) => ({
            ...prev,
            [exerciseId]: [
                ...(prev[exerciseId] || []),
                {
                    exerciseId,
                    setNumber: (prev[exerciseId]?.length || 0) + 1,
                    reps: prev[exerciseId]?.[prev[exerciseId].length - 1]?.reps || 10,
                    weight: prev[exerciseId]?.[prev[exerciseId].length - 1]?.weight || 0,
                },
            ],
        }));
    }

    function removeSet(exerciseId: string) {
        setSets((prev) => ({
            ...prev,
            [exerciseId]: (prev[exerciseId] || []).slice(0, -1),
        }));
    }

    function updateSet(exerciseId: string, setIdx: number, field: "reps" | "weight", value: number) {
        setSets((prev) => ({
            ...prev,
            [exerciseId]: (prev[exerciseId] || []).map((s, i) =>
                i === setIdx ? { ...s, [field]: value } : s
            ),
        }));
    }

    function handleFinish() {
        const allSets = Object.values(sets).flat();
        if (allSets.length === 0) return;

        const now = new Date();
        const dateISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

        startTransition(async () => {
            if (!isOnline) {
                await addPendingOp("LOG_WORKOUT", {
                    routineId: routine.id,
                    dateISO,
                    rpe: String(rpe),
                    notes,
                    sets: JSON.stringify(allSets),
                });
                await refreshPending();
            } else {
                await logWorkout({
                    routineId: routine.id,
                    dateISO,
                    rpe,
                    notes: notes || undefined,
                    sets: allSets.map((s) => ({
                        exerciseId: s.exerciseId,
                        setNumber: s.setNumber,
                        reps: s.reps || undefined,
                        weight: s.weight || undefined,
                    })),
                });
            }
            router.refresh();
            onFinish();
        });
    }

    const totalSets = Object.values(sets).flat().length;
    const totalVolume = Object.values(sets)
        .flat()
        .reduce((sum, s) => sum + (s.reps * s.weight), 0);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={onFinish}
                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex-1">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: routine.color }} />
                        {routine.name}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                        {totalSets} series · {totalVolume.toLocaleString()} kg vol.
                    </p>
                </div>
            </div>

            {/* Exercises */}
            <div className="space-y-4">
                {routine.exercises.map((exercise) => (
                    <div
                        key={exercise.id}
                        className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                            <div className="flex items-center gap-2">
                                <Dumbbell className="h-3.5 w-3.5 text-orange-400" />
                                <span className="font-medium text-sm">{exercise.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => removeSet(exercise.id)}
                                    disabled={(sets[exercise.id]?.length || 0) <= 1}
                                    className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground disabled:opacity-30"
                                >
                                    <Minus className="h-3 w-3" />
                                </button>
                                <button
                                    onClick={() => addSet(exercise.id)}
                                    className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5 text-muted-foreground"
                                >
                                    <Plus className="h-3 w-3" />
                                </button>
                            </div>
                        </div>

                        {/* Set header */}
                        <div className="grid grid-cols-[40px_1fr_1fr] gap-2 px-4 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            <span>Set</span>
                            <span>Reps</span>
                            <span>Peso (kg)</span>
                        </div>

                        {/* Sets */}
                        {(sets[exercise.id] || []).map((set, idx) => (
                            <div key={idx} className="grid grid-cols-[40px_1fr_1fr] gap-2 px-4 py-1.5">
                                <span className="flex items-center justify-center text-xs font-bold text-muted-foreground">
                                    {idx + 1}
                                </span>
                                <input
                                    type="number"
                                    value={set.reps}
                                    onChange={(e) => updateSet(exercise.id, idx, "reps", Number(e.target.value))}
                                    className="rounded-md border border-border/50 bg-background px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                                    min={0}
                                />
                                <input
                                    type="number"
                                    value={set.weight}
                                    onChange={(e) => updateSet(exercise.id, idx, "weight", Number(e.target.value))}
                                    className="rounded-md border border-border/50 bg-background px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                                    min={0}
                                    step={0.5}
                                />
                            </div>
                        ))}
                    </div>
                ))}
            </div>

            {/* RPE & Notes */}
            <div className="space-y-3">
                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        RPE (Esfuerzo percibido): {rpe}/10
                    </label>
                    <input
                        type="range"
                        min={1}
                        max={10}
                        value={rpe}
                        onChange={(e) => setRpe(Number(e.target.value))}
                        className="w-full accent-orange-500"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Notas (opcional)</label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="¿Cómo te sentiste?"
                        rows={2}
                        className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
                    />
                </div>
            </div>

            {/* Finish Button */}
            <button
                onClick={handleFinish}
                disabled={isPending || totalSets === 0}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 py-3 text-sm font-bold text-white transition-all hover:from-orange-600 hover:to-red-600 disabled:opacity-40"
            >
                <Check className="h-4 w-4" />
                {isPending ? "Guardando…" : "Finalizar Entrenamiento"}
            </button>
        </motion.div>
    );
}
