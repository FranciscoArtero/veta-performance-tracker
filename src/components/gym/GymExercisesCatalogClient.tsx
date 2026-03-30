"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Target, Save, Dumbbell } from "lucide-react";
import { createGlobalExercise, updateGlobalExerciseGoals } from "@/app/actions/gym";
import { useMobileKeyboardAssist } from "@/hooks/useMobileKeyboardAssist";

type GlobalExercise = {
    id: string;
    name: string;
    muscleGroup: string;
    currentWeightGoal: number | null;
    goalDate: Date | null;
    _count: { exercises: number };
};

type Props = {
    exercises: GlobalExercise[];
};

type GoalDraft = {
    weight: string;
    goalDateISO: string;
};

function dateToInputValue(date: Date | null) {
    if (!date) return "";
    return new Date(date).toISOString().slice(0, 10);
}

export function GymExercisesCatalogClient({ exercises }: Props) {
    const router = useRouter();
    const [isAdding, startAddTransition] = useTransition();
    const [savingExerciseId, setSavingExerciseId] = useState<string | null>(null);
    const { dismissKeyboard } = useMobileKeyboardAssist();

    const [name, setName] = useState("");
    const [muscleGroup, setMuscleGroup] = useState("");
    const [currentWeightGoal, setCurrentWeightGoal] = useState("");
    const [goalDateISO, setGoalDateISO] = useState("");

    const initialDrafts = useMemo<Record<string, GoalDraft>>(
        () =>
            Object.fromEntries(
                exercises.map((exercise) => [
                    exercise.id,
                    {
                        weight:
                            typeof exercise.currentWeightGoal === "number"
                                ? String(exercise.currentWeightGoal)
                                : "",
                        goalDateISO: dateToInputValue(exercise.goalDate),
                    },
                ])
            ),
        [exercises]
    );

    const [drafts, setDrafts] = useState<Record<string, GoalDraft>>(initialDrafts);

    useEffect(() => {
        setDrafts(initialDrafts);
    }, [initialDrafts]);

    function onChangeDraft(exerciseId: string, patch: Partial<GoalDraft>) {
        setDrafts((previous) => ({
            ...previous,
            [exerciseId]: {
                ...previous[exerciseId],
                ...patch,
            },
        }));
    }

    function handleAddExercise() {
        const cleanName = name.trim();
        const cleanMuscleGroup = muscleGroup.trim();
        if (!cleanName || !cleanMuscleGroup) return;
        dismissKeyboard();

        startAddTransition(async () => {
            await createGlobalExercise({
                name: cleanName,
                muscleGroup: cleanMuscleGroup,
                currentWeightGoal: currentWeightGoal ? Number(currentWeightGoal) : null,
                goalDateISO: goalDateISO || null,
            });

            setName("");
            setMuscleGroup("");
            setCurrentWeightGoal("");
            setGoalDateISO("");
            router.refresh();
        });
    }

    async function handleSaveGoals(exerciseId: string) {
        dismissKeyboard();
        const draft = drafts[exerciseId];
        setSavingExerciseId(exerciseId);
        try {
            await updateGlobalExerciseGoals({
                globalExerciseId: exerciseId,
                currentWeightGoal: draft?.weight ? Number(draft.weight) : null,
                goalDateISO: draft?.goalDateISO || null,
            });
            router.refresh();
        } finally {
            setSavingExerciseId(null);
        }
    }

    return (
        <div className="space-y-6" data-keyboard-scroll-container="true">
            <header className="flex items-center gap-3">
                <Link
                    href="/gym"
                    className="h-9 w-9 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center"
                >
                    <ArrowLeft className="h-4 w-4" />
                </Link>
                <div>
                    <h1 className="text-xl md:text-2xl font-bold">Mis Ejercicios</h1>
                    <p className="text-sm text-muted-foreground">
                        Gestiona tu maestra global y audita objetivos.
                    </p>
                </div>
            </header>

            <section className="rounded-xl border border-border/50 bg-card/50 p-4 md:p-5 space-y-3">
                <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-cyan-300" />
                    <h2 className="text-sm font-semibold">Agregar ejercicio</h2>
                </div>

                <div className="grid gap-2 md:grid-cols-4">
                    <input
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Ej: Press de Banca"
                        className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    />
                    <input
                        value={muscleGroup}
                        onChange={(event) => setMuscleGroup(event.target.value)}
                        placeholder="Grupo muscular (ej: pecho)"
                        className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    />
                    <input
                        type="number"
                        step={0.5}
                        value={currentWeightGoal}
                        onChange={(event) => setCurrentWeightGoal(event.target.value)}
                        placeholder="Objetivo kg (opcional)"
                        className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm font-[family-name:var(--font-geist-mono)] focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    />
                    <input
                        type="date"
                        value={goalDateISO}
                        onChange={(event) => setGoalDateISO(event.target.value)}
                        className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                    />
                </div>

                <button
                    onClick={handleAddExercise}
                    disabled={isAdding || !name.trim() || !muscleGroup.trim()}
                    className="w-full md:w-auto rounded-lg bg-cyan-500/20 text-cyan-100 px-4 py-2 text-sm font-medium hover:bg-cyan-500/30 disabled:opacity-40 transition-colors"
                >
                    {isAdding ? "Agregando..." : "Agregar a la maestra"}
                </button>
            </section>

            <section className="space-y-2">
                {exercises.length === 0 ? (
                    <div className="rounded-xl border border-border/50 bg-card/40 p-6 text-sm text-muted-foreground text-center">
                        Todavia no tienes ejercicios en tu maestra.
                    </div>
                ) : (
                    exercises.map((exercise) => {
                        const draft = drafts[exercise.id] ?? { weight: "", goalDateISO: "" };
                        const isSaving = savingExerciseId === exercise.id;

                        return (
                            <div
                                key={exercise.id}
                                className="rounded-xl border border-border/50 bg-card/50 p-4 md:p-5 space-y-3"
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <p className="text-base font-semibold truncate">{exercise.name}</p>
                                        <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                            {exercise.muscleGroup}
                                        </p>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                        <Dumbbell className="h-3.5 w-3.5" />
                                        {exercise._count.exercises} rutinas
                                    </div>
                                </div>

                                <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
                                    <div>
                                        <label className="text-[11px] text-muted-foreground">Peso objetivo</label>
                                        <input
                                            type="number"
                                            step={0.5}
                                            value={draft.weight}
                                            onChange={(event) =>
                                                onChangeDraft(exercise.id, { weight: event.target.value })
                                            }
                                            placeholder="100"
                                            className="mt-1 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm font-[family-name:var(--font-geist-mono)] focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[11px] text-muted-foreground">Fecha objetivo</label>
                                        <input
                                            type="date"
                                            value={draft.goalDateISO}
                                            onChange={(event) =>
                                                onChangeDraft(exercise.id, {
                                                    goalDateISO: event.target.value,
                                                })
                                            }
                                            className="mt-1 w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleSaveGoals(exercise.id)}
                                        disabled={isSaving}
                                        className="self-end rounded-lg bg-orange-500/20 text-orange-100 px-3 py-2 text-sm font-medium hover:bg-orange-500/30 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                                    >
                                        <Save className="h-3.5 w-3.5" />
                                        {isSaving ? "Guardando..." : "Guardar"}
                                    </button>
                                </div>

                                {(exercise.currentWeightGoal || exercise.goalDate) && (
                                    <div className="text-[11px] text-cyan-200 flex items-center gap-1.5">
                                        <Target className="h-3.5 w-3.5" />
                                        Objetivo actual:
                                        {exercise.currentWeightGoal
                                            ? ` ${exercise.currentWeightGoal.toFixed(1)}kg`
                                            : " --"}
                                        {exercise.goalDate
                                            ? ` antes del ${new Date(exercise.goalDate).toLocaleDateString(
                                                "es-AR"
                                            )}`
                                            : ""}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </section>
        </div>
    );
}
