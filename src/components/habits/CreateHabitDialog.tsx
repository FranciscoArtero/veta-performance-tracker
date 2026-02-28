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
import { TEMP_USER_ID } from "@/lib/constants";
import { Plus } from "lucide-react";

const ICONS = ["💪", "📖", "🧘", "💧", "🏃", "🎯", "✍️", "💤", "🥗", "🧠", "🎵", "📱"];
const COLORS = [
    "#8b5cf6", // violet
    "#06b6d4", // cyan
    "#f97316", // orange
    "#ec4899", // pink
    "#10b981", // emerald
    "#f59e0b", // amber
    "#6366f1", // indigo
    "#ef4444", // red
];

type Props = {
    children: React.ReactNode;
};

export function CreateHabitDialog({ children }: Props) {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [icon, setIcon] = useState("💪");
    const [color, setColor] = useState("#8b5cf6");
    const [frequency, setFrequency] = useState("daily");
    const [isPending, startTransition] = useTransition();

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!name.trim()) return;

        startTransition(async () => {
            await createHabit(TEMP_USER_ID, name.trim(), icon, color, frequency);
            setOpen(false);
            // Reset form
            setName("");
            setIcon("💪");
            setColor("#8b5cf6");
            setFrequency("daily");
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
                        Creá un hábito para hacer seguimiento diario.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-5 pt-2">
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

                    {/* Icon Picker */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Ícono
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {ICONS.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    onClick={() => setIcon(emoji)}
                                    className={`flex h-10 w-10 items-center justify-center rounded-lg text-lg transition-smooth ${icon === emoji
                                        ? "bg-violet-500/20 ring-2 ring-violet-500 scale-110"
                                        : "bg-white/5 hover:bg-white/10"
                                        }`}
                                >
                                    {emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Color Picker */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Color
                        </label>
                        <div className="flex gap-2">
                            {COLORS.map((c) => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setColor(c)}
                                    aria-label={`Color ${c}`}
                                    className={`h-8 w-8 rounded-full transition-smooth ${color === c ? "ring-2 ring-white scale-110" : "hover:scale-110"
                                        }`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Frequency */}
                    <div className="space-y-2">
                        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Frecuencia
                        </label>
                        <div className="flex gap-2">
                            {[
                                { value: "daily", label: "Diario" },
                                { value: "weekly", label: "Semanal" },
                            ].map((f) => (
                                <button
                                    key={f.value}
                                    type="button"
                                    onClick={() => setFrequency(f.value)}
                                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-smooth ${frequency === f.value
                                        ? "bg-violet-500 text-white"
                                        : "bg-white/5 text-muted-foreground hover:bg-white/10"
                                        }`}
                                >
                                    {f.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    <div className="rounded-lg border border-border/30 bg-white/5 p-3 flex items-center gap-3">
                        <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-xl"
                            style={{ backgroundColor: `${color}20` }}
                        >
                            {icon}
                        </div>
                        <div>
                            <p className="text-sm font-medium">
                                {name || "Tu hábito"}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize">
                                {frequency === "daily" ? "Diario" : "Semanal"}
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
