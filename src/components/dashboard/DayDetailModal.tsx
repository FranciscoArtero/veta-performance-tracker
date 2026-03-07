"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { getDayDetail } from "@/app/actions/tasks";
import { upsertMentalState } from "@/app/actions/mental-state";

import { CheckCircle2 } from "lucide-react";

type DayData = {
    habits: { id: string; name: string; icon: string; color: string; completed: boolean; isBonus?: boolean }[];
    mentalState: { mood: number; motivation: number; notes: string | null } | null;
    tasks: { id: string; title: string; completed: boolean }[];
    score: number;
    stats: { completedHabits: number; totalHabits: number; completedTasks: number; totalTasks: number };
};

type Props = {
    open: boolean;
    onClose: () => void;
    dateISO: string;
};

export function DayDetailModal({ open, onClose, dateISO }: Props) {
    const [data, setData] = useState<DayData | null>(null);
    const [loading, setLoading] = useState(false);
    const [notes, setNotes] = useState("");
    const [, startTransition] = useTransition();

    // Fetch data when modal opens or dateISO changes
    const loadData = useCallback(async () => {
        if (!dateISO) return;
        setLoading(true);
        setData(null);
        try {
            const result = await getDayDetail(dateISO);
            setData(result);
            setNotes(result.mentalState?.notes ?? "");
        } catch (e) {
            console.error("Failed to load day detail:", e);
        }
        setLoading(false);
    }, [dateISO]);

    useEffect(() => {
        if (open && dateISO) {
            loadData();
        } else {
            setData(null);
            setNotes("");
        }
    }, [open, dateISO, loadData]);

    // Save notes (micro-journaling)
    function handleSaveNotes() {
        if (!dateISO) return;
        startTransition(async () => {
            await upsertMentalState(
                dateISO,
                data?.mentalState?.mood ?? 5,
                data?.mentalState?.motivation ?? 5,
                notes || null
            );
        });
    }

    // Format date label
    const dateLabel = dateISO
        ? new Date(dateISO + "T12:00:00").toLocaleDateString("es-AR", {
            weekday: "long",
            day: "numeric",
            month: "long",
        })
        : "";

    return (
        <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span className="capitalize">{dateLabel}</span>
                        {data && (
                            <span
                                className={`text-sm font-bold px-2.5 py-1 rounded-lg ${data.score >= 80
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : data.score >= 50
                                        ? "bg-amber-500/20 text-amber-400"
                                        : "bg-red-500/20 text-red-400"
                                    }`}
                            >
                                {data.score}%
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-violet-500/30 border-t-violet-500" />
                    </div>
                )}

                {!loading && data && (
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {/* Habits */}
                        <div className="space-y-1.5">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Hábitos ({data.stats.completedHabits}/{data.stats.totalHabits})
                            </h3>
                            {data.habits.length === 0 ? (
                                <p className="text-xs text-muted-foreground/50">Sin hábitos</p>
                            ) : (
                                data.habits.map((h) => (
                                    <div
                                        key={h.id}
                                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm"
                                    >
                                        <div
                                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border ${h.completed
                                                ? "border-violet-500 bg-violet-500 text-white"
                                                : "border-border/50"
                                                }`}
                                        >
                                            {h.completed && <CheckCircle2 className="h-3 w-3" />}
                                        </div>
                                        <span className="text-base leading-none">{h.icon}</span>
                                        <span
                                            className={`flex-1 text-sm ${h.completed ? "text-muted-foreground line-through" : ""
                                                }`}
                                        >
                                            {h.name}
                                        </span>

                                    </div>
                                ))
                            )}
                        </div>

                        {/* Tasks */}
                        <div className="space-y-1.5">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Tareas ({data.stats.completedTasks}/{data.stats.totalTasks})
                            </h3>
                            {data.tasks.length === 0 ? (
                                <p className="text-xs text-muted-foreground/50">Sin tareas</p>
                            ) : (
                                data.tasks.map((t) => (
                                    <div
                                        key={t.id}
                                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm"
                                    >
                                        <div
                                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-md border ${t.completed
                                                ? "border-emerald-500 bg-emerald-500 text-white"
                                                : "border-border/50"
                                                }`}
                                        >
                                            {t.completed && <CheckCircle2 className="h-3 w-3" />}
                                        </div>
                                        <span
                                            className={`flex-1 text-sm ${t.completed ? "text-muted-foreground line-through" : ""
                                                }`}
                                        >
                                            {t.title}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Mood */}
                        {data.mentalState && (
                            <div className="space-y-1.5">
                                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    Estado Mental
                                </h3>
                                <div className="flex gap-3">
                                    <div className="flex-1 rounded-lg bg-cyan-500/10 px-3 py-2 text-center">
                                        <p className="text-lg font-bold text-cyan-400">{data.mentalState.mood}</p>
                                        <p className="text-[10px] text-muted-foreground">Mood</p>
                                    </div>
                                    <div className="flex-1 rounded-lg bg-pink-500/10 px-3 py-2 text-center">
                                        <p className="text-lg font-bold text-pink-400">{data.mentalState.motivation}</p>
                                        <p className="text-[10px] text-muted-foreground">Motivación</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Micro-Journaling */}
                        <div className="space-y-1.5">
                            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Notas del Día
                            </h3>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                onBlur={handleSaveNotes}
                                placeholder="Pensamientos, agradecimientos, reflexiones..."
                                aria-label="Notas del día"
                                className="w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-smooth resize-none"
                                rows={3}
                            />
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
