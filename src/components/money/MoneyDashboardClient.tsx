"use client";

import { useMemo, useOptimistic } from "react";
import { FinancialCategory, Budget } from "@prisma/client";
import { CategoryBarList } from "./CategoryBarList";
import { BudgetRing } from "./BudgetRing";
import { TransactionFAB } from "./TransactionFAB";
import { motion } from "framer-motion";

type BudgetWithCategory = Budget & { category: FinancialCategory };

interface MoneyDashboardProps {
    budgets: BudgetWithCategory[];
    categories: FinancialCategory[];
    currentMonth: Date;
}

export function MoneyDashboardClient({ budgets: initialBudgets, categories, currentMonth }: MoneyDashboardProps) {
    // Optimistic UI state
    const [budgets, addOptimisticBudgetUpdate] = useOptimistic(
        initialBudgets,
        (state, newTransaction: { amount: number; categoryId: string; type: "Income" | "Expense" }) => {
            return state.map(b => {
                if (b.categoryId === newTransaction.categoryId) {
                    return {
                        ...b,
                        actualAmount: (Number(b.actualAmount) + newTransaction.amount) as unknown as typeof b.actualAmount,
                    };
                }
                return b;
            });
            // Note: If no budget exists for this category yet, it won't show optimistically 
            // until server revalidates, which is an edge case we accept for simplicity here.
        }
    );
    // Basic calcs: Total planned vs Total actual (excluding "Income" typically, but let's see how user defines it)
    // Zero-Based Budgeting usually plans Income first, then zeroes it out by assigning to Expense/Savings categories.
    // For the "Budget Ring", it's usually Total Expenses / Total Income. If Income is not clearly defined,
    // we take the sum of `plannedAmount` of all Expense categories vs `actualAmount`.

    const expenseBudgets = useMemo(
        () => budgets.filter((b) => b.category.type === "Expense" || b.category.type === "Debt"),
        [budgets]
    );

    const incomeBudgets = useMemo(
        () => budgets.filter((b) => b.category.type === "Income"),
        [budgets]
    );

    const totalPlannedExpenses = expenseBudgets.reduce((acc, b) => acc + Number(b.plannedAmount), 0);
    const totalActualExpenses = expenseBudgets.reduce((acc, b) => acc + Number(b.actualAmount), 0);
    
    // For "Remaining Amount" ($Income - Actual Expenses), we need the actual income. 
    // If user has Income budgets, we use their actualAmount. If none, we fallback to planned income.
    const totalIncome = incomeBudgets.reduce((acc, b) => acc + Number(b.actualAmount || b.plannedAmount), 0);

    // If there's no income defined yet, default to planned expenses as the total available to spend to avoid NaN%
    const baselineTotal = totalIncome > 0 ? totalIncome : totalPlannedExpenses;
    const remainingAmount = Math.max(0, baselineTotal - totalActualExpenses);

    // Month label
    const monthLabel = new Date(currentMonth).toLocaleDateString("es-AR", {
        month: "long",
        year: "numeric"
    });

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8 pb-32">
            
            <motion.div 
                initial={{ opacity: 0, y: -10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="text-center space-y-1"
            >
                <h1 className="text-2xl font-bold tracking-tight capitalize">Presupuesto Real</h1>
                <p className="text-sm text-muted-foreground capitalize">{monthLabel}</p>
            </motion.div>

            {/* Main Ring Area */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring" }}
                className="flex flex-col items-center justify-center py-6 border-b border-black/5 dark:border-white/5"
            >
                <BudgetRing 
                    spent={totalActualExpenses} 
                    total={baselineTotal} 
                    remaining={remainingAmount} 
                />
            </motion.div>

            {/* Categories List */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="space-y-4"
            >
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-lg font-semibold tracking-tight">Tus Categorías</h2>
                    <span className="text-xs text-muted-foreground uppercase tracking-widest font-medium">
                        Plan vs Real
                    </span>
                </div>
                
                {expenseBudgets.length > 0 ? (
                    <CategoryBarList budgets={expenseBudgets} />
                ) : (
                    <div className="text-center py-12 px-4 rounded-xl bg-black/[0.02] dark:bg-zinc-900/40 border border-black/5 dark:border-zinc-800/50">
                        <p className="text-sm text-muted-foreground">No tienes presupuestos activos para este mes.</p>
                    </div>
                )}
            </motion.div>

            {/* Floating Action Button for New Transaction */}
            <TransactionFAB 
                categories={categories} 
                onSaveOptimistic={(amount, categoryId, type) => {
                    addOptimisticBudgetUpdate({ amount, categoryId, type });
                }}
            />
        </div>
    );
}
