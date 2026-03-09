"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Trash2, Dumbbell, Palette } from "lucide-react";
import { createRoutine } from "@/app/actions/gym";
import { useNetworkStatus } from "@/components/providers/NetworkStatusProvider";
import { addPendingOp } from "@/lib/offline-db";

type Props = {
    open: boolean;
    onClose: () => void;
};

const CATEGORIES = [
    { value: "chest", label: "Pecho", emoji: "🏋️" },
    { value: "back", label: "Espalda", emoji: "🔙" },
    { value: "legs", label: "Piernas", emoji: "🦵" },
    { value: "shoulders", label: "Hombros", emoji: "💪" },
    { value: "arms", label: "Brazos", emoji: "💪" },
    { value: "core", label: "Core", emoji: "🎯" },
    { value: "cardio", label: "Cardio", emoji: "🏃" },
    { value: "general", label: "General", emoji: "⚡" },
];

const COLORS = [
    "#f97316", "#ef4444", "#8b5cf6", "#06b6d4",
    "#10b981", "#f59e0b", "#ec4899", "#6366f1",
];

type ExerciseEntry = { name: string; category: string };

export function CreateRoutineDialog({ open, onClose }: Props) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [color, setColor] = useState(COLORS[0]);
    const [exercises, setExercises] = useState<ExerciseEntry[]>([]);
    const [newExName, setNewExName] = useState("");
    const [newExCategory, setNewExCategory] = useState("general");
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { isOnline, refreshPending } = useNetworkStatus();

    function addExercise() {
        if (!newExName.trim()) return;
        setExercises([...exercises, { name: newExName.trim(), category: newExCategory }]);
        setNewExName("");
    }

    function removeExercise(idx: number) {
        setExercises(exercises.filter((_, i) => i !== idx));
    }

    function handleSubmit() {
        if (!name.trim() || exercises.length === 0) return;
        startTransition(async () => {
            if (!isOnline) {
                await addPendingOp("CREATE_ROUTINE", {
                    name: name.trim(),
                    description: description || "",
                    color,
                    exercises: JSON.stringify(exercises),
                });
                await refreshPending();
            } else {
                await createRoutine(name.trim(), description || null, color, exercises);
            }
            router.refresh();
            resetAndClose();
        });
    }

    function resetAndClose() {
        setName("");
        setDescription("");
        setColor(COLORS[0]);
        setExercises([]);
        setNewExName("");
        onClose();
    }

    return (
        <AnimatePresence>
            {open && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={resetAndClose}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Dialog — centered with flexbox */}
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="pointer-events-auto w-full max-w-lg rounded-2xl border border-border/50 bg-card p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
                        >
                            {/* Header */}
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
                                {/* Name */}
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Nombre</label>
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Ej: Push Day, Upper Body..."
                                        className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Descripción (opcional)</label>
                                    <input
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="Ej: Pecho, hombros y tríceps"
                                        className="w-full rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                    />
                                </div>

                                {/* Color */}
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                                        <Palette className="h-3 w-3" /> Color
                                    </label>
                                    <div className="flex gap-2">
                                        {COLORS.map((c) => (
                                            <button
                                                key={c}
                                                onClick={() => setColor(c)}
                                                className={`h-7 w-7 rounded-full transition-all ${color === c ? "ring-2 ring-offset-2 ring-offset-card scale-110" : "opacity-60 hover:opacity-100"}`}
                                                style={{ backgroundColor: c }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Exercises */}
                                <div>
                                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                                        Ejercicios ({exercises.length})
                                    </label>

                                    {exercises.length > 0 && (
                                        <div className="space-y-1.5 mb-3">
                                            {exercises.map((ex, i) => (
                                                <div
                                                    key={i}
                                                    className="flex items-center gap-2 rounded-lg bg-black/5 dark:bg-white/5 px-3 py-2"
                                                >
                                                    <span className="text-sm flex-1">{ex.name}</span>
                                                    <span className="text-[10px] text-muted-foreground bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded">
                                                        {CATEGORIES.find(c => c.value === ex.category)?.label || ex.category}
                                                    </span>
                                                    <button onClick={() => removeExercise(i)} className="text-muted-foreground hover:text-red-400">
                                                        <Trash2 className="h-3 w-3" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Add exercise row */}
                                    <div className="flex gap-2">
                                        <input
                                            value={newExName}
                                            onChange={(e) => setNewExName(e.target.value)}
                                            placeholder="Nombre del ejercicio"
                                            onKeyDown={(e) => e.key === "Enter" && addExercise()}
                                            className="flex-1 rounded-lg border border-border/50 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                        />
                                        <select
                                            value={newExCategory}
                                            onChange={(e) => setNewExCategory(e.target.value)}
                                            className="rounded-lg border border-border/50 bg-background px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500/30"
                                        >
                                            {CATEGORIES.map((cat) => (
                                                <option key={cat.value} value={cat.value}>
                                                    {cat.emoji} {cat.label}
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

                                {/* Submit */}
                                <button
                                    onClick={handleSubmit}
                                    disabled={!name.trim() || exercises.length === 0 || isPending}
                                    className="w-full rounded-lg bg-gradient-to-r from-orange-500 to-red-500 py-2.5 text-sm font-medium text-white transition-all hover:from-orange-600 hover:to-red-600 disabled:opacity-40"
                                >
                                    {isPending ? "Creando…" : "Crear Rutina"}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
