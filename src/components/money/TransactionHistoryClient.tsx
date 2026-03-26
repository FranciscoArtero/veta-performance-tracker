"use client";

import { useMemo, useOptimistic, useTransition } from "react";
import { FinancialCategory, Transaction } from "@prisma/client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { deleteTransaction } from "@/app/actions/money";
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
    Download,
    Trash2,
    ArrowLeft,
    type LucideIcon,
} from "lucide-react";
import Link from "next/link";

type FullTransaction = Transaction & { category: FinancialCategory };

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
        "graduation-cap": GraduationCap,
    };
    return icons[name.toLowerCase()] || CircleDollarSign;
}

interface TransactionHistoryProps {
    transactions: FullTransaction[];
    currentMonth: Date;
}

export function TransactionHistoryClient({ transactions: initialTransactions, currentMonth }: TransactionHistoryProps) {
    const [, startTransition] = useTransition();

    // Optimistic UI for deletion
    const [transactions, removeOptimisticList] = useOptimistic(
        initialTransactions,
        (state, idToRemove: string) => state.filter((t) => t.id !== idToRemove)
    );

    // 1. Data Prep for Donut Chart (Expenses only)
    const chartData = useMemo(() => {
        const expenses = transactions.filter(t => t.type === "Expense");
        const grouped = expenses.reduce((acc, t) => {
            const catName = t.category.name;
            if (!acc[catName]) {
                acc[catName] = {
                    name: catName,
                    value: 0,
                    color: t.category.color,
                };
            }
            acc[catName].value += Number(t.amount);
            return acc;
        }, {} as Record<string, { name: string; value: number; color: string }>);
        
        const chartDataArray = Object.values(grouped) as { name: string; value: number; color: string }[];
        return chartDataArray.sort((a, b) => b.value - a.value);
    }, [transactions]);

    // 2. Data Prep for Chronological List (Grouped by Day)
    const groupedTransactions = useMemo(() => {
        const groups: Record<string, FullTransaction[]> = {};
        const formatter = new Intl.DateTimeFormat("es-AR", {
            weekday: "long",
            day: "numeric",
            timeZone: "America/Argentina/Buenos_Aires" // Or dynamic based on user
        });

        transactions.forEach((t) => {
            const dateStr = formatter.format(new Date(t.date));
            // Capitalize first letter
            const title = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
            if (!groups[title]) {
                groups[title] = [];
            }
            groups[title].push(t);
        });

        return groups;
    }, [transactions]);

    const formatARS = (amount: number) => {
        return new Intl.NumberFormat("es-AR", {
            style: "currency",
            currency: "ARS",
            maximumFractionDigits: 0,
        }).format(amount);
    };

    // 3. Export to CSV
    const exportToCSV = () => {
        const headers = ["Fecha", "Categoria", "Tipo", "Monto"];
        const rows = transactions.map(t => [
            new Date(t.date).toISOString().split("T")[0],
            t.category.name,
            t.type,
            Number(t.amount).toString()
        ]);
        
        const csvContent = [headers, ...rows]
            .map(e => e.join(","))
            .join("\n");
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `VETA_Gastos_${currentMonth.getMonth() + 1}_${currentMonth.getFullYear()}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // 4. Handle Delete
    const handleDelete = (id: string) => {
        startTransition(async () => {
            removeOptimisticList(id);
            await deleteTransaction(id);
        });
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white pb-32">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900/50 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/finances" className="p-2 bg-zinc-900 rounded-full hover:bg-zinc-800 transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-black tracking-tight">Reporte Mensual</h1>
                </div>
                <button 
                    onClick={exportToCSV}
                    className="p-2 text-zinc-400 hover:text-white transition-colors"
                    title="Exportar CSV"
                >
                    <Download className="w-5 h-5" />
                </button>
            </header>

            <main className="px-4 py-6 max-w-2xl mx-auto space-y-12">
                
                {/* Donut Chart (Mix de Gastos) */}
                <section>
                    <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-6 px-2">Mix de Gastos</h2>
                    {chartData.length > 0 ? (
                        <div className="w-full h-64 bg-zinc-900/20 rounded-3xl border border-zinc-900/50 flex flex-col items-center justify-center p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                        stroke="none"
                                        animationDuration={1500}
                                        animationEasing="ease-out"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip 
                                        formatter={(value: number | undefined) => formatARS(Number(value || 0))}
                                        contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="w-full h-40 bg-zinc-900/20 rounded-3xl border border-zinc-900/50 flex items-center justify-center">
                            <p className="text-zinc-600 text-sm">Sin gastos registrados</p>
                        </div>
                    )}
                </section>

                {/* Historial Cronólogico */}
                <section>
                    <h2 className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-6 px-2">Historial de Transacciones</h2>
                    
                    <div className="space-y-8">
                        <AnimatePresence>
                            {Object.entries(groupedTransactions).map(([dateLabel, dayTransactions]) => (
                                <motion.div 
                                    key={dateLabel}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="space-y-3"
                                >
                                    <h3 className="text-sm font-semibold text-zinc-400 pl-2">{dateLabel}</h3>
                                    
                                    <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl overflow-hidden divide-y divide-zinc-800/50">
                                        <AnimatePresence>
                                            {dayTransactions.map((t) => {
                                                const Icon = resolveMoneyIcon(t.category.icon);
                                                const isIncome = t.type === "Income";
                                                
                                                return (
                                                    <motion.div 
                                                        key={t.id}
                                                        layout
                                                        initial={{ opacity: 0, x: -10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        exit={{ opacity: 0, x: -50 }}
                                                        className="group flex items-center justify-between p-4 hover:bg-zinc-800/30 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div 
                                                                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                                                style={{ backgroundColor: `${t.category.color}15` }}
                                                            >
                                                                <Icon className="w-5 h-5" style={{ color: t.category.color }} strokeWidth={1.5} />
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-zinc-200">
                                                                    {t.category.name}
                                                                </span>
                                                                {/* Opcional: descripción si existiera transaccion.description */}
                                                                <span className="text-xs text-zinc-500">
                                                                    {isIncome ? "Ingreso" : "Gasto"}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-4">
                                                            <span className={`font-mono text-base ${isIncome ? "text-cyan-400" : "text-zinc-100"}`}>
                                                                {isIncome ? "+" : "-"}{formatARS(Number(t.amount))}
                                                            </span>
                                                            
                                                            <button 
                                                                onClick={() => handleDelete(t.id)}
                                                                className="p-2 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all sm:flex hidden"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                            {/* Mobile wipe/fallback tap */}
                                                            <button 
                                                                onClick={() => handleDelete(t.id)}
                                                                className="p-2 text-red-500/80 active:text-red-400 transition-all sm:hidden flex"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </AnimatePresence>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                        
                        {transactions.length === 0 && (
                            <div className="text-center py-12 text-zinc-500">
                                No se encontraron transacciones en este periodo.
                            </div>
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
