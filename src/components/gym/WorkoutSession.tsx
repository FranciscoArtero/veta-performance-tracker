"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Plus, Minus, Dumbbell } from "lucide-react";
import { logWorkout } from "@/app/actions/gym";
import { useNetworkStatus } from "@/components/providers/NetworkStatusProvider";
import { addPendingOp } from "@/lib/offline-db";
import { useMobileKeyboardAssist } from "@/hooks/useMobileKeyboardAssist";

type Exercise = {
    id: string;
    order: number;
    globalExercise: {
        id: string;
        name: string;
        muscleGroup: string;
    };
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
    reps: number | "";
    weight: number | "";
};

type Props = {
    routine: Routine;
    onFinish: () => void;
};

function toNumberOrEmpty(value: string): number | "" {
    if (value.trim() === "") return "";
    const parsed = Number(value);
    return Number.isNaN(parsed) ? "" : parsed;
}

export function WorkoutSession({ routine, onFinish }: Props) {
    const [sets, setSets] = useState<Record<string, SetEntry[]>>(() => {
        const initial: Record<string, SetEntry[]> = {};
        for (const exercise of routine.exercises) {
            initial[exercise.id] = [
                { exerciseId: exercise.id, setNumber: 1, reps: "", weight: "" },
            ];
        }
        return initial;
    });
    const [rpe, setRpe] = useState(7);
    const [notes, setNotes] = useState("");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { isOnline, refreshPending } = useNetworkStatus();
    const { dismissKeyboard } = useMobileKeyboardAssist();

    function addSet(exerciseId: string) {
        setSets((previous) => ({
            ...previous,
            [exerciseId]: [
                ...(previous[exerciseId] || []),
                {
                    exerciseId,
                    setNumber: (previous[exerciseId]?.length || 0) + 1,
                    reps: previous[exerciseId]?.[previous[exerciseId].length - 1]?.reps ?? "",
                    weight: previous[exerciseId]?.[previous[exerciseId].length - 1]?.weight ?? "",
                },
            ],
        }));
    }

    function removeSet(exerciseId: string) {
        setSets((previous) => ({
            ...previous,
            [exerciseId]: (previous[exerciseId] || []).slice(0, -1),
        }));
    }

    function updateSet(
        exerciseId: string,
        setIndex: number,
        field: "reps" | "weight",
        value: number | ""
    ) {
        setSets((previous) => ({
            ...previous,
            [exerciseId]: (previous[exerciseId] || []).map((set, index) =>
                index === setIndex ? { ...set, [field]: value } : set
            ),
        }));
    }

    function handleFinish() {
        dismissKeyboard();

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
                    sets: allSets.map((set) => ({
                        exerciseId: set.exerciseId,
                        setNumber: set.setNumber,
                        reps: typeof set.reps === "number" ? set.reps : undefined,
                        weight: typeof set.weight === "number" ? set.weight : undefined,
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
        .reduce((sum, set) => {
            const reps = typeof set.reps === "number" ? set.reps : 0;
            const weight = typeof set.weight === "number" ? set.weight : 0;
            return sum + reps * weight;
        }, 0);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
            data-keyboard-scroll-container="true"
        >
            <div className="flex items-center gap-3">
                <button
                    onClick={() => {
                        dismissKeyboard();
                        onFinish();
                    }}
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

            <div className="space-y-4">
                {routine.exercises.map((exercise) => (
                    <div
                        key={exercise.id}
                        className="rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden"
                    >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                            <div className="flex items-center gap-2">
                                <Dumbbell className="h-3.5 w-3.5 text-orange-400" />
                                <div>
                                    <span className="font-medium text-sm">{exercise.globalExercise.name}</span>
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                        {exercise.globalExercise.muscleGroup}
                                    </p>
                                </div>
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

                        <div className="grid grid-cols-[40px_1fr_1fr] gap-2 px-4 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            <span>Set</span>
                            <span>Reps</span>
                            <span>Peso (kg)</span>
                        </div>

                        {(sets[exercise.id] || []).map((set, index) => (
                            <div key={index} className="grid grid-cols-[40px_1fr_1fr] gap-2 px-4 py-1.5">
                                <span className="flex items-center justify-center text-xs font-bold text-muted-foreground">
                                    {index + 1}
                                </span>
                                <input
                                    type="number"
                                    value={set.reps}
                                    placeholder=""
                                    onChange={(event) =>
                                        updateSet(
                                            exercise.id,
                                            index,
                                            "reps",
                                            toNumberOrEmpty(event.target.value)
                                        )
                                    }
                                    className="rounded-md border border-border/50 bg-background px-2 py-1.5 text-sm text-center font-[family-name:var(--font-geist-mono)] focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                                    min={0}
                                />
                                <input
                                    type="number"
                                    value={set.weight}
                                    placeholder=""
                                    onChange={(event) =>
                                        updateSet(
                                            exercise.id,
                                            index,
                                            "weight",
                                            toNumberOrEmpty(event.target.value)
                                        )
                                    }
                                    className="rounded-md border border-border/50 bg-background px-2 py-1.5 text-sm text-center font-[family-name:var(--font-geist-mono)] focus:outline-none focus:ring-1 focus:ring-orange-500/30"
                                    min={0}
                                    step={0.5}
                                />
                            </div>
                        ))}
                    </div>
                ))}
            </div>

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
                        onChange={(event) => setRpe(Number(event.target.value))}
                        className="w-full accent-orange-500"
                    />
                </div>
                <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                        Notas (opcional)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(event) => setNotes(event.target.value)}
                        placeholder="Como te sentiste?"
                        rows={2}
                        className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30 resize-none"
                    />
                </div>
            </div>

            <button
                onClick={handleFinish}
                disabled={isPending || totalSets === 0}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 py-3 text-sm font-bold text-white transition-all hover:from-orange-600 hover:to-red-600 disabled:opacity-40"
            >
                <Check className="h-4 w-4" />
                {isPending ? "Guardando..." : "Finalizar Entrenamiento"}
            </button>
        </motion.div>
    );
}
