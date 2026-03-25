"use client";

import { motion } from "framer-motion";
import { Droplet } from "lucide-react";

type RingData = {
    value: number; // 0–100
    color: string;
    label: string;
};

type Props = {
    habits: number;   // 0-100
    tasks: number;    // 0-100
    mood: number;     // 0-100
    hydration?: number; // 0-100, undefined = disabled
    size?: number;
};

/**
 * Concentric activity rings (Apple Watch style).
 * Outer → Inner: Habits (violet), Tasks (emerald), Mood (pink), Hydration (cyan).
 */
export function ActivityRings({ habits, tasks, mood, hydration, size = 160 }: Props) {
    const strokeWidth = 10;
    const gap = 4;

    const rings: RingData[] = [
        { value: habits, color: "#8b5cf6", label: "Hábitos" },
        { value: tasks, color: "#10b981", label: "Tareas" },
        { value: mood, color: "#ec4899", label: "Mood" },
    ];

    if (hydration !== undefined) {
        rings.push({ value: hydration, color: "#06b6d4", label: "Agua" });
    }

    const totalRings = rings.length;
    const outerRadius = (size - strokeWidth) / 2;

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                {rings.map((ring, i) => {
                    const radius = outerRadius - i * (strokeWidth + gap);
                    const circumference = 2 * Math.PI * radius;
                    const offset = circumference - (Math.min(ring.value, 100) / 100) * circumference;
                    const isComplete = ring.value >= 100;
                    const isHydrationRing = i === totalRings - 1 && hydration !== undefined;

                    return (
                        <g key={ring.label}>
                            {/* Background track */}
                            <circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={strokeWidth}
                                className="text-white/[0.04]"
                            />
                            {/* Animated progress arc */}
                            <motion.circle
                                cx={size / 2}
                                cy={size / 2}
                                r={radius}
                                fill="none"
                                stroke={ring.color}
                                strokeWidth={strokeWidth}
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset: offset }}
                                transition={{ duration: 1.2, ease: "easeOut", delay: 0.15 + i * 0.15 }}
                                style={{
                                    filter: isComplete && isHydrationRing
                                        ? `drop-shadow(0 0 6px ${ring.color}) drop-shadow(0 0 12px ${ring.color}40)`
                                        : isComplete
                                            ? `drop-shadow(0 0 4px ${ring.color}80)`
                                            : "none",
                                }}
                            />
                        </g>
                    );
                })}
            </svg>

            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
                {hydration !== undefined ? (
                    <Droplet
                        className={`h-5 w-5 transition-colors duration-500 ${
                            hydration >= 100 ? "text-cyan-400" : "text-cyan-600/60"
                        }`}
                        style={{
                            filter: hydration >= 100 ? "drop-shadow(0 0 6px #06b6d4)" : "none",
                        }}
                    />
                ) : null}
            </div>

            {/* Legend dots */}
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
                {rings.map((ring) => (
                    <div key={ring.label} className="flex items-center gap-1">
                        <div
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: ring.color }}
                        />
                        <span className="text-[9px] text-muted-foreground whitespace-nowrap">{ring.label}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
