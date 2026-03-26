"use client";

import { motion } from "framer-motion";

interface BudgetRingProps {
    spent: number;
    total: number;
    remaining: number;
}

export function BudgetRing({ spent, total, remaining }: BudgetRingProps) {
    const size = 300;
    const strokeWidth = 14;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    
    const percentage = total > 0 ? Math.min(1, spent / total) : 0;
    const strokeDashoffset = circumference - percentage * circumference;

    const isOverBudget = spent > total && total > 0;

    function getRingColorClass(p: number) {
        if (p < 0.20) return "stroke-emerald-200";
        if (p < 0.40) return "stroke-emerald-400";
        if (p < 0.60) return "stroke-emerald-600";
        if (p < 0.80) return "stroke-yellow-400";
        if (p < 0.90) return "stroke-orange-500";
        return "stroke-red-500";
    }



    function getRingShadow(p: number) {
        if (p < 0.25) return "drop-shadow(0 0 12px rgba(52,211,153,0.3))";
        if (p < 0.50) return "drop-shadow(0 0 12px rgba(16,185,129,0.3))";
        if (p < 0.75) return "drop-shadow(0 0 12px rgba(250,204,21,0.3))";
        if (p < 0.90) return "drop-shadow(0 0 12px rgba(249,115,22,0.3))";
        return "drop-shadow(0 0 16px rgba(239,68,68,0.5))";
    }

    // Formatting currency
    const formatMoney = (val: number) => {
        return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(val);
    };

    return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
            {/* SVG Ring */}
            <svg 
                width={size} 
                height={size} 
                viewBox={`0 0 ${size} ${size}`}
                className="transform -rotate-90"
            >
                {/* Background Ring - Zinc 900 */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    className="stroke-zinc-200 dark:stroke-zinc-800/80"
                />
                
                {/* Foreground Ring - Animated */}
                <motion.circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    className={`transition-colors duration-500 ${isOverBudget ? "stroke-red-500" : getRingColorClass(percentage)}`}
                    style={{
                        strokeDasharray: circumference,
                        filter: isOverBudget ? "drop-shadow(0 0 16px rgba(239,68,68,0.6))" : getRingShadow(percentage)
                    }}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 1.2, ease: "easeOut", delay: 0.1 }}
                />
            </svg>

            {/* Inner Content */}
            <div className="absolute flex flex-col items-center justify-center text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium mb-1">
                    Restante
                </p>
                <motion.h2 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", delay: 0.4 }}
                    className={`text-4xl md:text-5xl font-black tracking-tighter ${
                        isOverBudget ? "text-red-500 dark:text-red-400" : getRingColorClass(percentage).replace('stroke-','text-')
                    }`}
                >
                    {formatMoney(remaining)}
                </motion.h2>
                <div className="mt-3 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                    <span className="text-[11px] font-medium text-muted-foreground">Gastado:</span>
                    <span className="text-[11px] font-bold text-foreground">{formatMoney(spent)}</span>
                </div>
            </div>
        </div>
    );
}
