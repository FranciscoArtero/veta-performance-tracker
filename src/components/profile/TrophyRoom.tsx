"use client";

import { motion } from "framer-motion";
import { Award, Trophy, Crown, Star, Flame, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type Achievement = {
    id: string;
    type: string;
    unlockedAt: string | Date;
};

type Props = {
    achievements: Achievement[];
};

const MILESTONES = [
    { type: "BRONZE_7", days: 7, label: "Bronce", desc: "7 días de racha", icon: Award, gradient: "from-amber-700 to-amber-900/80", border: "border-amber-700/50", text: "text-amber-500" },
    { type: "SILVER_30", days: 30, label: "Plata", desc: "30 días de racha", icon: Star, gradient: "from-slate-400 to-slate-600/80", border: "border-slate-400/50", text: "text-slate-300" },
    { type: "GOLD_100", days: 100, label: "Oro", desc: "100 días de racha", icon: Trophy, gradient: "from-yellow-400 to-yellow-600/80", border: "border-yellow-400/50", text: "text-yellow-300" },
    { type: "DIAMOND_365", days: 365, label: "Diamante", desc: "¡1 año de racha!", icon: Crown, gradient: "from-indigo-400 via-cyan-400 to-emerald-400", border: "border-cyan-300/50", text: "text-cyan-100" },
];

export function TrophyRoom({ achievements }: Props) {
    const unlockedTypes = new Set(achievements.map((a) => a.type));

    return (
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden relative">
            {/* Subtle background flair */}
            <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-yellow-500/5 blur-3xl pointer-events-none" />

            <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-4 w-4 text-yellow-500" />
                    Sala de Trofeos
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {MILESTONES.map((m, i) => {
                        const isUnlocked = unlockedTypes.has(m.type);
                        const IconComponent = m.icon;

                        return (
                            <motion.div
                                key={m.type}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1, duration: 0.4 }}
                                className={`group relative flex flex-col items-center justify-center rounded-xl border p-4 transition-all duration-500 ${isUnlocked
                                        ? `bg-black/20 dark:bg-white/5 border-white/10 dark:border-white/10 hover:scale-[1.02] shadow-sm overflow-hidden`
                                        : "bg-black/5 dark:bg-white/5 border-black/5 dark:border-white/5 opacity-60 grayscale"
                                    }`}
                            >
                                {isUnlocked && (
                                    <div className={`absolute inset-0 opacity-[0.15] bg-gradient-to-br ${m.gradient} transition-opacity duration-500 group-hover:opacity-30`} />
                                )}

                                <div
                                    className={`relative z-10 flex h-14 w-14 items-center justify-center rounded-full border mb-3 shadow-inner ${isUnlocked
                                            ? `bg-gradient-to-br ${m.gradient} ${m.border}`
                                            : "bg-muted border-muted-foreground/20"
                                        }`}
                                >
                                    {isUnlocked ? (
                                        <IconComponent className={`h-6 w-6 ${m.text} drop-shadow-md`} strokeWidth={2} />
                                    ) : (
                                        <Lock className="h-5 w-5 text-muted-foreground/50" />
                                    )}
                                </div>
                                <div className="text-center z-10">
                                    <p className={`text-sm font-bold tracking-wide ${isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {m.label}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5 font-medium">
                                        {m.desc}
                                    </p>
                                </div>

                                {isUnlocked && (
                                    <div className="absolute top-2 right-2 flex bg-amber-500/20 text-amber-500 px-1.5 py-0.5 rounded text-[8px] font-bold tracking-wider items-center gap-0.5">
                                        <Flame className="w-2.5 h-2.5" /> {m.days}
                                    </div>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
}
