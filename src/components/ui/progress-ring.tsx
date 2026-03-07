"use client";

import { motion } from "framer-motion";

type Props = {
    /** 0–100 */
    value: number;
    /** Ring diameter in px */
    size?: number;
    /** Stroke width in px */
    strokeWidth?: number;
    /** Tailwind-compatible color for the progress arc, e.g. "#8b5cf6" */
    color?: string;
    /** Optional label rendered in the center */
    label?: string;
    /** Optional sub-label rendered below the main label */
    sublabel?: string;
};

export function ProgressRing({
    value,
    size = 80,
    strokeWidth = 6,
    color = "#8b5cf6",
    label,
    sublabel,
}: Props) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (Math.min(value, 100) / 100) * circumference;

    return (
        <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    className="text-white/5"
                />
                {/* Animated progress arc */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: offset }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                />
            </svg>
            {/* Center label */}
            {(label || sublabel) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {label && <span className="text-sm font-bold leading-none">{label}</span>}
                    {sublabel && <span className="text-[9px] text-muted-foreground mt-0.5">{sublabel}</span>}
                </div>
            )}
        </div>
    );
}
