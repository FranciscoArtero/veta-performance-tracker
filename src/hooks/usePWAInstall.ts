"use client";

import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: "accepted" | "dismissed";
        platform: string;
    }>;
};

declare global {
    interface Window {
        __coreDeferredPrompt?: BeforeInstallPromptEvent | null;
    }
}

function isStandaloneMode() {
    return (
        window.matchMedia("(display-mode: standalone)").matches ||
        Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone)
    );
}

export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(true);

    useEffect(() => {
        const installed = isStandaloneMode();
        setIsInstalled(installed);

        const initialPrompt = window.__coreDeferredPrompt ?? null;
        setDeferredPrompt(initialPrompt);
        setIsInstallable(!installed && initialPrompt !== null);

        const onInstallReady = () => {
            const prompt = window.__coreDeferredPrompt ?? null;
            setDeferredPrompt(prompt);
            setIsInstallable(!isStandaloneMode() && prompt !== null);
        };

        const onAppInstalled = () => {
            window.__coreDeferredPrompt = null;
            setDeferredPrompt(null);
            setIsInstallable(false);
            setIsInstalled(true);
        };

        window.addEventListener("core:pwa-install-ready", onInstallReady);
        window.addEventListener("core:pwa-installed", onAppInstalled);
        window.addEventListener("appinstalled", onAppInstalled);

        return () => {
            window.removeEventListener("core:pwa-install-ready", onInstallReady);
            window.removeEventListener("core:pwa-installed", onAppInstalled);
            window.removeEventListener("appinstalled", onAppInstalled);
        };
    }, []);

    const installApp = useCallback(async () => {
        if (!deferredPrompt) return false;

        try {
            await deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            window.__coreDeferredPrompt = null;
            setDeferredPrompt(null);
            setIsInstallable(false);

            if (outcome === "accepted") {
                setIsInstalled(true);
            }

            return outcome === "accepted";
        } catch {
            return false;
        }
    }, [deferredPrompt]);

    return { isInstallable, isInstalled, installApp };
}
