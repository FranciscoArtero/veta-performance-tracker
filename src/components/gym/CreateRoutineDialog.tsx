"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Dumbbell } from "lucide-react";
import { createRoutine } from "@/app/actions/gym";
import { useNetworkStatus } from "@/components/providers/NetworkStatusProvider";
import { addPendingOp } from "@/lib/offline-db";

type Props = {
    open: boolean;
    onClose: () => void;
};

type FocusType = "STRENGTH" | "HYPERTROPHY" | "ENDURANCE";

type ExerciseInput = {
    name: string;
    category: string;
    muscleGroup: string;
};

const COLORS = [
    "#f97316", "#ef4444", "#8b5cf6", "#06b6d4",
    "#10b981", "#f59e0b", "#ec4899", "#6366f1",
];

const FOCUS_TYPES: { value: FocusType; label: string }[] = [
    { value: "STRENGTH", label: "Fuerza" },
    { value: "HYPERTROPHY", label: "Hipertrofia" },
    { value: "ENDURANCE", label: "Resistencia" },
];

const CATEGORIES = ["compound", "isolation", "bodyweight", "cardio", "mobility", "general"];
const MUSCLE_GROUPS = [
    "chest",
    "back",
    "legs",
    "shoulders",
    "arms",
    "core",
    "full body",
    "general",
];

export function CreateRoutineDialog({ open, onClose }: Props) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [color, setColor] = useState(COLORS[0]);
    const [focusType, setFocusType] = useState<FocusType>("HYPERTROPHY");

    const [exercises, setExercises] = useState<ExerciseInput[]>([]);
    const [newExName, setNewExName] = useState("");
    const [newCategory, setNewCategory] = useState("general");
    const [newMuscleGroup, setNewMuscleGroup] = useState("general");

    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { isOnline, refreshPending } = useNetworkStatus();

    function addExercise() {
        const cleanName = newExName.trim();
        if (!cleanName) return;

        const exists = exercises.some(
            (exercise) => exercise.name.toLowerCase() === cleanName.toLowerCase()
        );
        if (exists) {
            setNewExName("");
            return;
        }

        setExercises([
            ...exercises,
            {
                name: cleanName,
                category: newCategory,
                muscleGroup: newMuscleGroup,
            },
        ]);
        setNewExName("");
    }

    function removeExercise(index: number) {
        setExercises(exercises.filter((_, i) => i !== index));
    }

    function handleSubmit() {
        if (!name.trim() || exercises.length === 0) return;

        startTransition(async () => {
            if (!isOnline) {
                await addPendingOp("CREATE_ROUTINE", {
                    name: name.trim(),
                    description: description || "",
                    color,
                    focusType,
                    exercises: JSON.stringify(exercises),
                });
                await refreshPending();
            } else {
                await createRoutine(name.trim(), description || null, color, focusType, exercises);
            }

            router.refresh();
            resetAndClose();
        });
    }

    function resetAndClose() {
        setName("");
        setDescription("");
        setColor(COLORS[0]);
        setFocusType("HYPERTROPHY");
        setExercises([]);
        setNewExName("");
        setNewCategory("general");
        setNewMuscleGroup("general");
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
                            className="pointer-events-auto w-full max-w-lg rounded-2xl border border-border/50 bg-card p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-5">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Dumbbell className="h-5 w-5 text-orange-400" />
                                    Nueva Rutina
                                </h2>
                                <button onClick={resetAndClose} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre</label>
                                    <input
                                        value={name}
                                        onChange={(event) => setName(event.target.value)}
                                        placeholder="Ej: Push Day, Upper Body..."
                                        className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descripcion (opcional)</label>
                                    <input
                                        value={description}
                                        onChange={(event) => setDescription(event.target.value)}
                                        placeholder="Ej: Pecho, hombros y triceps"
                                        className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Foco de la rutina</label>
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
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Color</label>
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

                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                                        Ejercicios ({exercises.length})
                                    </label>

                                    {exercises.length > 0 && (
                                        <div className="space-y-1.5 mb-3">
                                            {exercises.map((exercise, index) => (
                                                <div
                                                    key={`${exercise.name}-${index}`}
                                                    className="flex items-center gap-2 rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2"
                                                >
                                                    <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm truncate">{exercise.name}</p>
                                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                                                            {exercise.muscleGroup} · {exercise.category}
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

                                    <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2">
                                        <input
                                            value={newExName}
                                            onChange={(event) => setNewExName(event.target.value)}
                                            placeholder="Ej: Press banca, Sentadilla..."
                                            onKeyDown={(event) => event.key === "Enter" && addExercise()}
                                            className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                        />
                                        <select
                                            value={newMuscleGroup}
                                            onChange={(event) => setNewMuscleGroup(event.target.value)}
                                            className="rounded-lg border border-border/50 bg-background px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                        >
                                            {MUSCLE_GROUPS.map((group) => (
                                                <option key={group} value={group}>
                                                    {group}
                                                </option>
                                            ))}
                                        </select>
                                        <select
                                            value={newCategory}
                                            onChange={(event) => setNewCategory(event.target.value)}
                                            className="rounded-lg border border-border/50 bg-background px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                        >
                                            {CATEGORIES.map((category) => (
                                                <option key={category} value={category}>
                                                    {category}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={addExercise}
                                            disabled={!newExName.trim()}
                                            className="shrink-0 flex items-center justify-center h-9 w-9 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 disabled:opacity-40 transition-all"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSubmit}
                                    disabled={!name.trim() || exercises.length === 0 || isPending}
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

