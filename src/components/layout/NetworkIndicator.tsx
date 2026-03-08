"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Cloud, CloudOff, RefreshCw } from "lucide-react";
import { useNetworkStatus } from "@/components/providers/NetworkStatusProvider";

export function NetworkIndicator() {
    const { isOnline, isSyncing, pendingCount } = useNetworkStatus();

    const dotColor = !isOnline
        ? "bg-red-500"
        : isSyncing
            ? "bg-amber-500"
            : "bg-emerald-500";

    const Icon = !isOnline ? CloudOff : isSyncing ? RefreshCw : Cloud;
    const label = !isOnline
        ? `Offline${pendingCount > 0 ? ` (${pendingCount})` : ""}`
        : isSyncing
            ? "Sincronizando…"
            : "Online";

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.03] border border-black/5 dark:border-white/5"
            >
                {/* Pulsing dot */}
                <span className="relative flex h-2.5 w-2.5">
                    {(!isOnline || isSyncing) && (
                        <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${dotColor} opacity-75`} />
                    )}
                    <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${dotColor}`} />
                </span>

                <Icon className={`h-3.5 w-3.5 text-muted-foreground ${isSyncing ? "animate-spin" : ""}`} />
                <span className="text-[11px] text-muted-foreground font-medium">{label}</span>

                {/* Pending count badge */}
                {pendingCount > 0 && isOnline && !isSyncing && (
                    <span className="ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold px-1">
                        {pendingCount}
                    </span>
                )}
            </motion.div>
        </AnimatePresence>
    );
}
