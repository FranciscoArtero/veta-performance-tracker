"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import { Slider } from "@/components/ui/slider";
import { upsertMentalState } from "@/app/actions/mental-state";


type Props = {
    initialState: { mood: number; motivation: number } | null;
};

const moodEmojis = ["", "😞", "😔", "😕", "😐", "🙂", "😊", "😄", "😁", "🤩", "🔥"];

export function MentalStateInput({ initialState }: Props) {
    const [mood, setMood] = useState(initialState?.mood ?? 5);
    const [motivation, setMotivation] = useState(initialState?.motivation ?? 5);
    const [saved, setSaved] = useState(false);
    const [isPending, startTransition] = useTransition();
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const save = useCallback(
        (m: number, mot: number) => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
            debounceRef.current = setTimeout(() => {
                setSaved(false);
                const today = new Date();
                const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
                startTransition(async () => {
                    await upsertMentalState(todayISO, m, mot);
                    setSaved(true);
                    setTimeout(() => setSaved(false), 2000);
                });
            }, 600);
        },
        [startTransition]
    );

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    ¿Cómo te sentís hoy?
                </p>
                {saved && (
                    <span className="text-xs text-emerald-400 font-medium animate-pulse-soft">
                        ✓ Guardado
                    </span>
                )}
                {isPending && !saved && (
                    <span className="text-xs text-muted-foreground">Guardando...</span>
                )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                    <Slider
                        label="Mood"
                        valueDisplay={`${moodEmojis[mood]} ${mood}/10`}
                        min={1}
                        max={10}
                        step={1}
                        value={mood}
                        onChange={(e) => {
                            const v = parseInt(e.target.value);
                            setMood(v);
                            save(v, motivation);
                        }}
                        className="accent-cyan-500"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground/50 px-0.5">
                        <span>😞</span>
                        <span>🔥</span>
                    </div>
                </div>

                <div className="space-y-3">
                    <Slider
                        label="Motivación"
                        valueDisplay={`${moodEmojis[motivation]} ${motivation}/10`}
                        min={1}
                        max={10}
                        step={1}
                        value={motivation}
                        onChange={(e) => {
                            const v = parseInt(e.target.value);
                            setMotivation(v);
                            save(mood, v);
                        }}
                        className="accent-pink-500"
                    />
                    <div className="flex justify-between text-[10px] text-muted-foreground/50 px-0.5">
                        <span>😞</span>
                        <span>🔥</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
