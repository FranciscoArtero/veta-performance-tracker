"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy } from "lucide-react";

type Props = {
    achievements: string[];
    onClose: () => void;
};

const MILESTONE_DETAILS: Record<string, { label: string, color: string, bg: string }> = {
    "BRONZE_7": { label: "Bronce (7 días)", color: "text-amber-500", bg: "from-amber-700/50 to-amber-900/50" },
    "SILVER_30": { label: "Plata (30 días)", color: "text-slate-300", bg: "from-slate-400/50 to-slate-600/50" },
    "GOLD_100": { label: "Oro (100 días)", color: "text-yellow-400", bg: "from-yellow-400/50 to-yellow-600/50" },
    "DIAMOND_365": { label: "Diamante (365 días)", color: "text-cyan-300", bg: "from-cyan-300/50 to-blue-500/50" },
};

export function CelebrationModal({ achievements, onClose }: Props) {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (achievements.length > 0) {
            setIsVisible(true);
            // Auto close after 5 seconds if not closed manually
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(onClose, 500); // Allow exit animation to run
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [achievements, onClose]);

    if (achievements.length === 0) return null;

    const achievementType = achievements[0]; // Usually only unlock 1 at a time
    const details = MILESTONE_DETAILS[achievementType];

    if (!details) return null;

    return (
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={() => {
                            setIsVisible(false);
                            setTimeout(onClose, 500);
                        }}
                    />

                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0, y: -20 }}
                        transition={{ type: "spring", damping: 20, stiffness: 300 }}
                        className={`relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-br ${details.bg} p-1 max-h-[90vh] overflow-hidden shadow-2xl shadow-yellow-500/10`}
                    >
                        <div className="absolute inset-0 bg-background/90 backdrop-blur-xl rounded-2xl" />

                        <div className="relative p-6 px-8 text-center flex flex-col items-center justify-center min-h-[300px]">
                            {/* Confetti / Lights effect behind icon */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-yellow-500/20 blur-3xl rounded-full" />

                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{ type: "spring", damping: 15, stiffness: 200, delay: 0.2 }}
                                className="relative flex items-center justify-center w-24 h-24 mb-6 rounded-full bg-black/20 border border-white/10 shadow-inner"
                            >
                                <Trophy className={`w-12 h-12 ${details.color} drop-shadow-[0_0_15px_rgba(250,204,21,0.5)]`} />
                            </motion.div>

                            <motion.h2
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 }}
                                className="text-2xl font-bold tracking-tight text-foreground mb-2"
                            >
                                ¡Nuevo Logro!
                            </motion.h2>

                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 }}
                                className={`text-lg font-semibold ${details.color} mb-4`}
                            >
                                {details.label}
                            </motion.p>

                            <motion.p
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.6 }}
                                className="text-sm text-muted-foreground/80 leading-relaxed mb-6"
                            >
                                ¡Increíble! Mantuviste tu racha y desbloqueaste una nueva medalla. Seguí así.
                            </motion.p>

                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.8 }}
                                onClick={() => {
                                    setIsVisible(false);
                                    setTimeout(onClose, 500);
                                }}
                                className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-foreground text-sm font-semibold transition-colors"
                            >
                                Continuar
                            </motion.button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
