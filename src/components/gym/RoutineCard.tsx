"use client";

import { Dumbbell, Play, Trash2 } from "lucide-react";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteRoutine } from "@/app/actions/gym";
import { useNetworkStatus } from "@/components/providers/NetworkStatusProvider";
import { addPendingOp } from "@/lib/offline-db";

type Props = {
    routine: {
        id: string;
        name: string;
        description: string | null;
        color: string;
        exercises: { id: string; name: string; category: string }[];
        _count: { logs: number };
    };
    onStart: () => void;
};

const categoryIcons: Record<string, string> = {
    chest: "🏋️",
    back: "🔙",
    legs: "🦵",
    shoulders: "💪",
    arms: "💪",
    core: "🎯",
    cardio: "🏃",
    general: "⚡",
};

export function RoutineCard({ routine, onStart }: Props) {
    const [isPending, startTransition] = useTransition();
    const router = useRouter();
    const { isOnline, refreshPending } = useNetworkStatus();

    function handleDelete() {
        if (!confirm("¿Eliminar esta rutina?")) return;
        startTransition(async () => {
            if (!isOnline) {
                await addPendingOp("DELETE_ROUTINE", { routineId: routine.id });
                await refreshPending();
                return;
            }
            await deleteRoutine(routine.id);
            router.refresh();
        });
    }

    const categories = Array.from(new Set(routine.exercises.map(e => e.category)));

    return (
        <div className="group relative rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden transition-all hover:border-border hover:shadow-lg">
            {/* Top accent bar */}
            <div
                className="h-1 w-full"
                style={{ backgroundColor: routine.color }}
            />

            <div className="p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="space-y-1">
                        <h3 className="font-semibold text-base leading-tight">{routine.name}</h3>
                        {routine.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                                {routine.description}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleDelete}
                        disabled={isPending}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>

                {/* Category badges */}
                <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                        <span
                            key={cat}
                            className="inline-flex items-center gap-1 rounded-md bg-black/5 dark:bg-white/5 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                        >
                            {categoryIcons[cat] || "⚡"} {cat}
                        </span>
                    ))}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Dumbbell className="h-3 w-3" />
                        {routine.exercises.length} ejercicios
                    </span>
                    <span>{routine._count.logs} sesiones</span>
                </div>

                {/* Start Button */}
                <button
                    onClick={onStart}
                    className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-all text-white"
                    style={{ backgroundColor: routine.color }}
                >
                    <Play className="h-4 w-4" />
                    Empezar
                </button>
            </div>
        </div>
    );
}
