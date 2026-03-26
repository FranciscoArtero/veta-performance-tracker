"use client";

import { motion } from "framer-motion";
import { FinancialCategory, Budget } from "@prisma/client";
import { 
    CircleDollarSign,
    Utensils,
    Car,
    Home,
    ShoppingBag,
    Coffee,
    Zap,
    HeartPulse,
    Plane,
    Gamepad2,
    GraduationCap,
    type LucideIcon
} from "lucide-react";

type BudgetWithCategory = Budget & { category: FinancialCategory };

interface CategoryBarListProps {
    budgets: BudgetWithCategory[];
}

// Simple resolver for common money icons to avoid huge client bundle
function resolveMoneyIcon(name: string): LucideIcon {
    const icons: Record<string, LucideIcon> = {
        "circle-dollar-sign": CircleDollarSign,
        "utensils": Utensils,
        "car": Car,
        "home": Home,
        "shopping-bag": ShoppingBag,
        "coffee": Coffee,
        "zap": Zap,
        "heart-pulse": HeartPulse,
        "plane": Plane,
        "gamepad-2": Gamepad2,
        "graduation-cap": GraduationCap
    };
    return icons[name.toLowerCase()] || CircleDollarSign;
}

const listItem = {
    hidden: { opacity: 0, x: -8 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
};

export function CategoryBarList({ budgets }: CategoryBarListProps) {
    const formatMoney = (val: number) => 
        new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(val);

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {budgets.map((budget, index) => {
                const { category, plannedAmount, actualAmount } = budget;
                const planned = Number(plannedAmount);
                const actual = Number(actualAmount);
                
                // Progress calculations
                const isOverBudget = actual > planned && planned > 0;
                // If planned is 0, percentage is 100% if actual > 0, else 0%
                const percentage = planned > 0 
                    ? Math.min(100, (actual / planned) * 100) 
                    : (actual > 0 ? 100 : 0);
                    
                const Icon = resolveMoneyIcon(category.icon);

                return (
                    <motion.div
                        key={budget.id}
                        variants={listItem}
                        initial="hidden"
                        animate="visible"
                        transition={{ delay: index * 0.05 }}
                        className="group relative flex flex-col gap-3 rounded-xl p-4 bg-black/[0.02] dark:bg-zinc-900/40 border border-black/5 dark:border-zinc-800/50 hover:bg-black/5 dark:hover:bg-zinc-800/40 transition-smooth overflow-hidden"
                    >
                        {/* Over-budget background subtle glow */}
                        {isOverBudget && (
                            <div className="absolute inset-0 bg-red-500/5 pointer-events-none" />
                        )}

                        <div className="flex items-start justify-between z-10">
                            <div className="flex items-center gap-3">
                                <div 
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-smooth"
                                    style={{ 
                                        backgroundColor: isOverBudget ? 'rgba(239, 68, 68, 0.1)' : `${category.color}15`,
                                        color: isOverBudget ? '#ef4444' : category.color
                                    }}
                                >
                                    <Icon className="h-5 w-5" strokeWidth={1.25} />
                                </div>
                                <div className="space-y-0.5">
                                    <p className="text-sm font-semibold tracking-tight text-foreground leading-none">
                                        {category.name}
                                    </p>
                                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                        Plan: {formatMoney(planned)}
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className={`text-sm font-bold tracking-tight ${isOverBudget ? 'text-red-500 dark:text-red-400' : 'text-foreground'}`}>
                                    {formatMoney(actual)}
                                </p>
                            </div>
                        </div>

                        {/* Dual Progress Bar */}
                        <div className="relative h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden z-10">
                            <motion.div
                                className="absolute left-0 top-0 h-full rounded-full"
                                style={{
                                    backgroundColor: isOverBudget ? '#ef4444' : category.color,
                                    boxShadow: isOverBudget 
                                        ? "0 0 8px rgba(239,68,68,0.5)" 
                                        : `0 0 8px ${category.color}40`
                                }}
                                initial={{ width: "0%" }}
                                animate={{ width: `${percentage}%` }}
                                transition={{ duration: 1, ease: "easeOut", delay: 0.2 + (index * 0.05) }}
                            />
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}
