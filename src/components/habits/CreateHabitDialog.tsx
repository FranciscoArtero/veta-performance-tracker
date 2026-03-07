"use client";

import { useState, useTransition } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createHabit } from "@/app/actions/habits";

import { Plus } from "lucide-react";

const ICONS = ["💪", "📖", "🧘", "💧", "🏃", "🎯", "✍️", "💤", "🥗", "🧠", "🎵", "📱"];
const COLORS = [
    "#8b5cf6", "#06b6d4", "#f97316", "#ec4899",
    "#10b981", "#f59e0b", "#6366f1", "#ef4444",
];

const DAYS = [
    { value: 1, label: "L" },
    { value: 2, label: "M" },
    { value: 3, label: "X" },
    { value: 4, label: "J" },
    { value: 5, label: "V" },
    { value: 6, label: "S" },
    { value: 0, label: "D" },
];

type Props = { children: React.ReactNode };

export function CreateHabitDialog({ children }: Props) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [icon, setIcon] = useState("💪");
    const [color, setColor] = useState("#8b5cf6");

    // Frequency state
    const [freqType, setFreqType] = useState<"daily" | "weekly">("daily");
    const [weeklyMode, setWeeklyMode] = useState<"fixed" | "flexible">("fixed");
    const [targetDays, setTargetDays] = useState<number[]>([1, 3, 5]); // L-X-V
    const [goalDays, setGoalDays] = useState(3);

    const [isPending, startTransition] = useTransition();

    function toggleDay(day: number) {
        setTargetDays((prev) =>
            prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
        );
    }

    function getFrequencyValue() {
        if (freqType === "daily") return "daily";
        return weeklyMode === "fixed" ? "weekly_fixed" : "weekly_flexible";
    }

    function getPreviewLabel() {
        if (freqType === "daily") return "Diario — todos los días";
        if (weeklyMode === "fixed") {
            const dayLabels = DAYS.filter((d) => targetDays.includes(d.value)).map((d) => d.label);
            return `Semanal fijo — ${dayLabels.join("-") || "sin días"}`;
        }
        return `Semanal flexible — ${goalDays}x por semana`;
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;

        const freq = getFrequencyValue();
        startTransition(async () => {
            await createHabit(
                name.trim(),
                icon,
                color,
                freq,
                freqType === "weekly" ? weeklyMode : null,
                freqType === "weekly" && weeklyMode === "flexible" ? goalDays : null,
                freqType === "weekly" && weeklyMode === "fixed" ? targetDays : []
            );
            setOpen(false);
            setName("");
            setIcon("💪");
            setColor("#8b5cf6");
            setFreqType("daily");
            setWeeklyMode("fixed");
            setTargetDays([1, 3, 5]);
            setGoalDays(3);
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5 text-violet-400" />
                        Nuevo hábito
                    </DialogTitle>
                    <DialogDescription>
                        Creá un hábito y elegí cómo querés hacerle seguimiento.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Nombre
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Meditar 10 minutos"
                            className="w-full rounded-lg border border-border/50 bg-background/50 px-3 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500/50 transition-smooth"
                            autoFocus
                        />
                    </div>

                    {/* Icons + Colors in a compact row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Ícono
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {ICONS.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setIcon(emoji)}
                                        className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition-smooth ${icon === emoji
                                            ? "bg-violet-500/20 ring-2 ring-violet-500 scale-110"
                                            : "bg-white/5 hover:bg-white/10"
                                            }`}
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                Color
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {COLORS.map((c) => (
                                    <button
                                        key={c}
                                        type="button"
                                        onClick={() => setColor(c)}
                                        aria-label={`Color ${c}`}
                                        className={`h-7 w-7 rounded-full transition-smooth ${color === c ? "ring-2 ring-white scale-110" : "hover:scale-110"
                                            }`}
                                        style={{ backgroundColor: c }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Frequency Type */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Frecuencia
                        </label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setFreqType("daily")}
                                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth ${freqType === "daily"
                                    ? "bg-violet-500 text-white"
                                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                                    }`}
                            >
                                🔁 Diario
                            </button>
                            <button
                                type="button"
                                onClick={() => setFreqType("weekly")}
                                className={`flex-1 rounded-lg px-3 py-2.5 text-sm font-medium transition-smooth ${freqType === "weekly"
                                    ? "bg-violet-500 text-white"
                                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                                    }`}
                            >
                                📅 Semanal
                            </button>
                        </div>
                    </div>

                    {/* Weekly Sub-Options (only if weekly) */}
                    {freqType === "weekly" && (
                        <div className="space-y-3 rounded-lg border border-border/30 bg-white/[0.02] p-3">
                            {/* Fixed vs Flexible toggle */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setWeeklyMode("fixed")}
                                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-smooth ${weeklyMode === "fixed"
                                        ? "bg-cyan-500/20 text-cyan-300 ring-1 ring-cyan-500/50"
                                        : "bg-white/5 text-muted-foreground hover:bg-white/10"
                                        }`}
                                >
                                    📌 Días fijos
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setWeeklyMode("flexible")}
                                    className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-smooth ${weeklyMode === "flexible"
                                        ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50"
                                        : "bg-white/5 text-muted-foreground hover:bg-white/10"
                                        }`}
                                >
                                    🎯 Flexible
                                </button>
                            </div>

                            {/* Fixed: Day selector */}
                            {weeklyMode === "fixed" && (
                                <div className="space-y-1.5">
                                    <p className="text-[11px] text-muted-foreground">
                                        Elegí qué días es obligatorio:
                                    </p>
                                    <div className="flex gap-1.5">
                                        {DAYS.map((d) => (
                                            <button
                                                key={d.value}
                                                type="button"
                                                onClick={() => toggleDay(d.value)}
                                                className={`flex-1 rounded-lg py-2 text-xs font-bold transition-smooth ${targetDays.includes(d.value)
                                                    ? "bg-cyan-500 text-white"
                                                    : "bg-white/5 text-muted-foreground hover:bg-white/10"
                                                    }`}
                                            >
                                                {d.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Flexible: Goal slider */}
                            {weeklyMode === "flexible" && (
                                <div className="space-y-1.5">
                                    <p className="text-[11px] text-muted-foreground">
                                        ¿Cuántas veces por semana?
                                    </p>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min={1}
                                            max={7}
                                            value={goalDays}
                                            onChange={(e) => setGoalDays(Number(e.target.value))}
                                            aria-label="Veces por semana"
                                            className="flex-1 accent-amber-500"
                                        />
                                        <span className="text-lg font-bold text-amber-400 w-6 text-center">
                                            {goalDays}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Preview */}
                    <div className="rounded-lg border border-border/30 bg-white/5 p-3 flex items-center gap-3">
                        <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-xl shrink-0"
                            style={{ backgroundColor: `${color}20` }}
                        >
                            {icon}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                                {name || "Tu hábito"}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                {getPreviewLabel()}
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOpen(false)}
                            className="sm:w-auto"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="submit"
                            disabled={!name.trim() || isPending}
                            className="bg-violet-600 hover:bg-violet-700 sm:w-auto gap-1.5"
                        >
                            {isPending ? (
                                <>
                                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                    Creando...
                                </>
                            ) : (
                                <>
                                    <Plus className="h-3.5 w-3.5" />
                                    Crear hábito
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
