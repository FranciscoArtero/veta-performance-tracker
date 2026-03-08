"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from "react";
import { flushPendingOps } from "@/lib/sync-engine";
import { getPendingCount } from "@/lib/offline-db";

type NetworkStatus = {
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
    refreshPending: () => Promise<void>;
};

const NetworkStatusContext = createContext<NetworkStatus>({
    isOnline: true,
    isSyncing: false,
    pendingCount: 0,
    refreshPending: async () => { },
});

export function useNetworkStatus() {
    return useContext(NetworkStatusContext);
}

export function NetworkStatusProvider({ children }: { children: ReactNode }) {
    const [isOnline, setIsOnline] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const syncingRef = useRef(false);

    const refreshPending = useCallback(async () => {
        try {
            const count = await getPendingCount();
            setPendingCount(count);
        } catch {
            // IndexedDB not available (SSR)
        }
    }, []);

    const doSync = useCallback(async () => {
        if (syncingRef.current) return;
        syncingRef.current = true;
        setIsSyncing(true);

        try {
            const count = await getPendingCount();
            if (count > 0) {
                await flushPendingOps();
            }
        } catch (err) {
            console.warn("[NetworkStatus] Sync error:", err);
        } finally {
            syncingRef.current = false;
            setIsSyncing(false);
            await refreshPending();
        }
    }, [refreshPending]);

    useEffect(() => {
        // SSR guard
        if (typeof window === "undefined") return;

        setIsOnline(navigator.onLine);

        const goOnline = () => {
            setIsOnline(true);
            doSync();
        };
        const goOffline = () => setIsOnline(false);

        window.addEventListener("online", goOnline);
        window.addEventListener("offline", goOffline);

        // On mount: flush any stale ops
        refreshPending().then(() => {
            if (navigator.onLine) doSync();
        });

        return () => {
            window.removeEventListener("online", goOnline);
            window.removeEventListener("offline", goOffline);
        };
    }, [doSync, refreshPending]);

    return (
        <NetworkStatusContext.Provider value={{ isOnline, isSyncing, pendingCount, refreshPending }}>
            {children}
        </NetworkStatusContext.Provider>
    );
}
