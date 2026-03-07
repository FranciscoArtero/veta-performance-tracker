"use client";

import { useState, useCallback, useRef, useTransition } from "react";
import { upsertMentalState } from "@/app/actions/mental-state";

type Props = {
    initialState: { mood: number; motivation: number } | null;
};

export function MentalStateInput({ initialState }: Props) {
    const [mood, setMood] = useState(initialState?.mood ?? 5);
    const [motivation, setMotivation] = useState(initialState?.motivation ?? 5);
    const [saved, setSaved] = useState(false);
    const [isPending, startTransition] = useTransition();
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Track which slider is being dragged
    const [activeMood, setActiveMood] = useState(false);
    const [activeMotivation, setActiveMotivation] = useState(false);

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
        <div className="space-y-5">
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

            <div className="grid gap-5 sm:grid-cols-2">
                {/* Mood slider */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Mood
                        </span>
                    </div>
                    <div className="relative">
                        <input
                            type="range"
                            min={1}
                            max={10}
                            step={1}
                            value={mood}
                            onChange={(e) => {
                                const v = parseInt(e.target.value);
                                setMood(v);
                                save(v, motivation);
                            }}
                            onPointerDown={() => setActiveMood(true)}
                            onPointerUp={() => setActiveMood(false)}
                            onBlur={() => setActiveMood(false)}
                            className="slider-minimal slider-cyan w-full"
                        />
                        {/* Floating indicator */}
                        <div
                            className={`absolute -top-7 pointer-events-none transition-opacity duration-150 ${activeMood ? "opacity-100" : "opacity-0"
                                }`}
                            style={{ left: `calc(${((mood - 1) / 9) * 100}% - 12px)` }}
                        >
                            <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-cyan-500 text-[11px] font-bold text-white px-1.5">
                                {mood}
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground/40 px-0.5">
                        <span>1</span>
                        <span>10</span>
                    </div>
                </div>

                {/* Motivation slider */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Motivación
                        </span>
                    </div>
                    <div className="relative">
                        <input
                            type="range"
                            min={1}
                            max={10}
                            step={1}
                            value={motivation}
                            onChange={(e) => {
                                const v = parseInt(e.target.value);
                                setMotivation(v);
                                save(mood, v);
                            }}
                            onPointerDown={() => setActiveMotivation(true)}
                            onPointerUp={() => setActiveMotivation(false)}
                            onBlur={() => setActiveMotivation(false)}
                            className="slider-minimal slider-pink w-full"
                        />
                        <div
                            className={`absolute -top-7 pointer-events-none transition-opacity duration-150 ${activeMotivation ? "opacity-100" : "opacity-0"
                                }`}
                            style={{ left: `calc(${((motivation - 1) / 9) * 100}% - 12px)` }}
                        >
                            <span className="flex h-6 min-w-6 items-center justify-center rounded-md bg-pink-500 text-[11px] font-bold text-white px-1.5">
                                {motivation}
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground/40 px-0.5">
                        <span>1</span>
                        <span>10</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
