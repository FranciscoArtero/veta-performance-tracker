"use client";

import { useState } from "react";
import { FinancialCategory } from "@prisma/client";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import { createTransaction } from "@/app/actions/money";
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
    type LucideIcon,
} from "lucide-react";

// Local resolver
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

interface TransactionFABProps {
    categories: FinancialCategory[];
    onSaveOptimistic: (amount: number, categoryId: string, type: "Income" | "Expense") => void;
}

export function TransactionFAB({ categories, onSaveOptimistic }: TransactionFABProps) {
    const [open, setOpen] = useState(false);
    
    // Form state
    const [amountStr, setAmountStr] = useState("");
    const [type, setType] = useState<"Income" | "Expense">("Expense");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Categories filter
    const activeCategories = categories.filter((c) => c.type === type || (c.type === "Debt" && type === "Expense") || (c.type === "Savings" && type === "Expense"));

    const handleSave = async () => {
        const amount = Number(amountStr);
        if (!amount || amount <= 0 || !selectedCategoryId) return;

        setIsSubmitting(true);
        try {
            // Optimistic update
            onSaveOptimistic(amount, selectedCategoryId, type);
            setOpen(false);

            // Background server action and offline-db
            const dateISO = new Date().toISOString();
            
            // NOTE: Offline queueing could be added via `coreOfflineDB.addPendingOp()` if implemented fully.
            // For now we directly call the server action which is the requested basic flow.
            await createTransaction({
                amount,
                categoryId: selectedCategoryId,
                type,
                dateISO,
            });

        } catch (e) {
            console.error(e);
        } finally {
            setIsSubmitting(false);
            setAmountStr("");
            setSelectedCategoryId(null);
            setType("Expense");
        }
    };

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <div className="fixed bottom-20 right-4 sm:bottom-8 sm:right-8 z-50">
                    <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center justify-center p-4 bg-zinc-900 border border-zinc-800 text-white rounded-full shadow-2xl backdrop-blur-md"
                    >
                        <Plus className="w-8 h-8" strokeWidth={1.5} />
                    </motion.button>
                </div>
            </DrawerTrigger>

            <DrawerContent className="bg-zinc-950 border-zinc-900">
                <div className="mx-auto w-full max-w-sm flex flex-col items-center justify-center px-6 pt-8 pb-12 space-y-8">
                    {/* Header: Toggle Switch */}
                    <DrawerTitle className="sr-only">Nueva Transacción</DrawerTitle>
                    <div className="flex bg-zinc-900/50 p-1 rounded-full border border-zinc-800/50">
                        <button
                            onClick={() => { setType("Expense"); setSelectedCategoryId(null); }}
                            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                                type === "Expense" ? "bg-zinc-800 text-white shadow-sm" : "text-muted-foreground hover:text-white"
                            }`}
                        >
                            Gasto
                        </button>
                        <button
                            onClick={() => { setType("Income"); setSelectedCategoryId(null); }}
                            className={`px-6 py-2 rounded-full text-sm font-semibold transition-all ${
                                type === "Income" ? "bg-zinc-800 text-white shadow-sm" : "text-muted-foreground hover:text-white"
                            }`}
                        >
                            Ingreso
                        </button>
                    </div>

                    {/* Giant Input */}
                    <div className="w-full flex justify-center items-baseline gap-1 overflow-hidden">
                        <span className="text-4xl text-zinc-500 font-black shrink-0">
                            $
                        </span>
                        <input
                            type="text"
                            inputMode="decimal"
                            pattern="[0-9]*"
                            placeholder="0"
                            value={amountStr}
                            onChange={(e) => {
                                // Only allow digits
                                const val = e.target.value.replace(/[^0-9]/g, "");
                                setAmountStr(val);
                            }}
                            className="bg-transparent text-center text-6xl md:text-7xl font-black text-white focus:outline-none w-full min-w-0 placeholder:text-zinc-800 shrink-1"
                            autoFocus
                        />
                    </div>

                    {/* Category Grid */}
                    <div className="w-full">
                        <p className="text-xs uppercase tracking-[0.2em] text-center text-muted-foreground font-medium mb-4">
                            Categoría
                        </p>
                        <div className="grid grid-cols-4 gap-3">
                            {activeCategories.map((cat) => {
                                const Icon = resolveMoneyIcon(cat.icon);
                                const isSelected = selectedCategoryId === cat.id;
                                return (
                                    <button
                                        key={cat.id}
                                        onClick={() => setSelectedCategoryId(cat.id)}
                                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-2xl transition-all border ${
                                            isSelected 
                                                ? "bg-zinc-800 border-zinc-700 shadow-md" 
                                                : "bg-transparent border-transparent hover:bg-zinc-900/50"
                                        }`}
                                    >
                                        <Icon 
                                            className="w-6 h-6" 
                                            strokeWidth={1.5} 
                                            style={{ color: isSelected ? cat.color : "#71717a" }} 
                                        />
                                        <span className={`text-[10px] uppercase font-bold tracking-wider ${isSelected ? "text-white" : "text-zinc-500"}`}>
                                            {cat.name.substring(0, 6)}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Save Button */}
                    <button
                        disabled={!amountStr || !selectedCategoryId || isSubmitting}
                        onClick={handleSave}
                        className="w-full py-4 bg-white text-black font-black text-lg rounded-full disabled:opacity-50 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all active:scale-[0.98]"
                    >
                        {isSubmitting ? "Guardando..." : "Guardar Transacción"}
                    </button>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
