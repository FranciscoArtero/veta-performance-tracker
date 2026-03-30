"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Dumbbell, Search, Sparkles } from "lucide-react";
import { createGlobalExercise, createRoutine } from "@/app/actions/gym";
import { useNetworkStatus } from "@/components/providers/NetworkStatusProvider";
import { addPendingOp } from "@/lib/offline-db";
import { useMobileKeyboardAssist } from "@/hooks/useMobileKeyboardAssist";

type FocusType = "STRENGTH" | "HYPERTROPHY" | "ENDURANCE";

type GlobalExerciseOption = {
    id: string;
    name: string;
    muscleGroup: string;
};

type Props = {
    open: boolean;
    onClose: () => void;
    globalExercises: GlobalExerciseOption[];
};

const COLORS = [
    "#f97316",
    "#ef4444",
    "#8b5cf6",
    "#06b6d4",
    "#10b981",
    "#f59e0b",
    "#ec4899",
    "#6366f1",
];

const FOCUS_TYPES: { value: FocusType; label: string }[] = [
    { value: "STRENGTH", label: "Fuerza" },
    { value: "HYPERTROPHY", label: "Hipertrofia" },
    { value: "ENDURANCE", label: "Resistencia" },
];

export function CreateRoutineDialog({ open, onClose, globalExercises }: Props) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [color, setColor] = useState(COLORS[0]);
    const [focusType, setFocusType] = useState<FocusType>("HYPERTROPHY");

    const [library, setLibrary] = useState<GlobalExerciseOption[]>(globalExercises);
    const [selectedExercises, setSelectedExercises] = useState<GlobalExerciseOption[]>([]);
    const [search, setSearch] = useState("");
    const [newExerciseMuscleGroup, setNewExerciseMuscleGroup] = useState("");

    const [isPending, startTransition] = useTransition();
    const [isCreatingExercise, startCreateExerciseTransition] = useTransition();
    const router = useRouter();
    const { isOnline, refreshPending } = useNetworkStatus();
    const { dismissKeyboard } = useMobileKeyboardAssist();

    useEffect(() => {
        setLibrary(globalExercises);
    }, [globalExercises]);

    const selectedIds = useMemo(
        () => new Set(selectedExercises.map((exercise) => exercise.id)),
        [selectedExercises]
    );

    const searchLower = search.trim().toLowerCase();

    const filteredLibrary = useMemo(() => {
        return library
            .filter((exercise) => !selectedIds.has(exercise.id))
            .filter((exercise) => {
                if (!searchLower) return true;
                return (
                    exercise.name.toLowerCase().includes(searchLower) ||
                    exercise.muscleGroup.toLowerCase().includes(searchLower)
                );
            })
            .slice(0, 8);
    }, [library, searchLower, selectedIds]);

    const exactMatch = useMemo(() => {
        if (!searchLower) return false;
        return library.some((exercise) => exercise.name.toLowerCase() === searchLower);
    }, [library, searchLower]);

    function addFromLibrary(exercise: GlobalExerciseOption) {
        if (selectedIds.has(exercise.id)) return;
        setSelectedExercises((previous) => [...previous, exercise]);
        setSearch("");
    }

    function removeExercise(index: number) {
        setSelectedExercises((previous) => previous.filter((_, i) => i !== index));
    }

    function createAndAddExercise() {
        const cleanName = search.trim();
        const cleanMuscleGroup = newExerciseMuscleGroup.trim();
        if (!cleanName || !cleanMuscleGroup || !isOnline) return;
        dismissKeyboard();

        startCreateExerciseTransition(async () => {
            const created = await createGlobalExercise({
                name: cleanName,
                muscleGroup: cleanMuscleGroup,
            });

            const option: GlobalExerciseOption = {
                id: created.id,
                name: created.name,
                muscleGroup: created.muscleGroup,
            };

            setLibrary((previous) => {
                const deduped = previous.filter((exercise) => exercise.id !== option.id);
                return [...deduped, option].sort((a, b) => a.name.localeCompare(b.name));
            });
            setSelectedExercises((previous) => {
                if (previous.some((exercise) => exercise.id === option.id)) return previous;
                return [...previous, option];
            });

            setSearch("");
            setNewExerciseMuscleGroup("");
            router.refresh();
        });
    }

    function handleSubmit() {
        if (!name.trim() || selectedExercises.length === 0) return;
        dismissKeyboard();

        const exerciseIds = selectedExercises.map((exercise) => exercise.id);

        startTransition(async () => {
            if (!isOnline) {
                await addPendingOp("CREATE_ROUTINE", {
                    name: name.trim(),
                    description: description || "",
                    color,
                    focusType,
                    exercises: JSON.stringify(exerciseIds),
                });
                await refreshPending();
            } else {
                await createRoutine(name.trim(), description || null, color, focusType, exerciseIds);
            }

            router.refresh();
            resetAndClose();
        });
    }

    function resetAndClose() {
        dismissKeyboard();
        setName("");
        setDescription("");
        setColor(COLORS[0]);
        setFocusType("HYPERTROPHY");
        setSelectedExercises([]);
        setSearch("");
        setNewExerciseMuscleGroup("");
        onClose();
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={resetAndClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    />

                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="pointer-events-auto w-full max-w-xl rounded-2xl border border-border/50 bg-card p-6 shadow-2xl max-h-[88vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Dumbbell className="h-5 w-5 text-orange-400" />
                                    Nueva Rutina
                                </h2>
                                <button
                                    onClick={resetAndClose}
                                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                        Nombre
                                    </label>
                                    <input
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        placeholder="Ej: Push Day, Upper Body..."
                                        className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                        Descripcion (opcional)
                                    </label>
                                    <input
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                        placeholder="Ej: Pecho, hombros y triceps"
                                        className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                        Foco de la rutina
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {FOCUS_TYPES.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => setFocusType(option.value)}
                                                className={`rounded-lg border px-2 py-2 text-xs font-medium transition-all ${
                                                    focusType === option.value
                                                        ? "border-orange-400/60 bg-orange-500/15 text-orange-300"
                                                        : "border-border/50 bg-background text-muted-foreground hover:text-foreground"
                                                }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
                                        Color
                                    </label>
                                    <div className="flex gap-2">
                                        {COLORS.map((paletteColor) => (
                                            <button
                                                key={paletteColor}
                                                onClick={() => setColor(paletteColor)}
                                                className={`h-7 w-7 rounded-full transition-all ${
                                                    color === paletteColor
                                                        ? "ring-2 ring-offset-2 ring-offset-card scale-110"
                                                        : "opacity-60 hover:opacity-100"
                                                }`}
                                                style={{ backgroundColor: paletteColor }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-xs font-medium text-muted-foreground block">
                                        Ejercicios ({selectedExercises.length})
                                    </label>

                                    <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <input
                                            value={search}
                                            onChange={(event) => setSearch(event.target.value)}
                                            placeholder="Buscar en tu maestra de ejercicios..."
                                            className="w-full rounded-lg border border-border/50 bg-background pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                        />
                                    </div>

                                    {selectedExercises.length > 0 && (
                                        <div className="space-y-1.5">
                                            {selectedExercises.map((exercise, index) => (
                                                <div
                                                    key={`${exercise.id}-${index}`}
                                                    className="flex items-center gap-2 rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2"
                                                >
                                                    <span className="text-xs text-muted-foreground w-5">
                                                        {index + 1}.
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm truncate">{exercise.name}</p>
                                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                            {exercise.muscleGroup}
                                                        </p>
                                                    </div>
                                                    <button
                                                        onClick={() => removeExercise(index)}
                                                        className="text-muted-foreground hover:text-red-400"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                                        {filteredLibrary.map((exercise) => (
                                            <button
                                                key={exercise.id}
                                                type="button"
                                                onClick={() => addFromLibrary(exercise)}
                                                className="w-full flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/40 px-3 py-2 text-left hover:border-orange-400/30 hover:bg-orange-500/5 transition-colors"
                                            >
                                                <div className="min-w-0">
                                                    <p className="text-sm truncate">{exercise.name}</p>
                                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                                        {exercise.muscleGroup}
                                                    </p>
                                                </div>
                                                <Plus className="h-3.5 w-3.5 text-orange-300 shrink-0" />
                                            </button>
                                        ))}
                                    </div>

                                    {!exactMatch && search.trim() && (
                                        <div className="rounded-lg border border-orange-400/30 bg-orange-500/10 p-3 space-y-2">
                                            <div className="flex items-center gap-2 text-xs text-orange-200">
                                                <Sparkles className="h-3.5 w-3.5" />
                                                Crear &quot;{search.trim()}&quot; y agregarlo a la rutina
                                            </div>
                                            <input
                                                value={newExerciseMuscleGroup}
                                                onChange={(event) =>
                                                    setNewExerciseMuscleGroup(event.target.value)
                                                }
                                                placeholder="Grupo muscular (ej: pecho)"
                                                className="w-full rounded-lg border border-orange-400/30 bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                            />
                                            <button
                                                type="button"
                                                onClick={createAndAddExercise}
                                                disabled={
                                                    !isOnline ||
                                                    isCreatingExercise ||
                                                    !newExerciseMuscleGroup.trim()
                                                }
                                                className="w-full rounded-lg bg-orange-500/20 text-orange-200 py-2 text-xs font-medium hover:bg-orange-500/30 disabled:opacity-40 transition-colors"
                                            >
                                                {isCreatingExercise
                                                    ? "Creando..."
                                                    : isOnline
                                                      ? "Crear y agregar"
                                                      : "Disponible solo online"}
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={!name.trim() || selectedExercises.length === 0 || isPending}
                                    className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-red-500 py-2.5 text-sm font-medium text-white transition-all hover:from-orange-600 hover:to-red-600 disabled:opacity-40"
                                >
                                    {isPending ? "Creando..." : "Crear Rutina"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
