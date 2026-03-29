"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: "accepted" | "dismissed";
    }>;
};

declare global {
    interface Window {
        __coreDeferredPrompt?: BeforeInstallPromptEvent | null;
    }
}

export function usePWAInstall() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent);
        setIsIOS(isIOSDevice);

        const standalone =
            window.matchMedia("(display-mode: standalone)").matches ||
            (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
        setIsInstalled(standalone);
        setDeferredPrompt(window.__coreDeferredPrompt ?? null);
        setIsInstallable(!standalone && Boolean(window.__coreDeferredPrompt));

        const handleBeforeInstall = (event: Event) => {
            event.preventDefault();
            setDeferredPrompt(event as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        const onInstallReady = () => {
            const prompt = window.__coreDeferredPrompt ?? null;
            setDeferredPrompt(prompt);
            setIsInstallable(!standalone && Boolean(prompt));
        };

        const onAppInstalled = () => {
            window.__coreDeferredPrompt = null;
            setDeferredPrompt(null);
            setIsInstallable(false);
            setIsInstalled(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstall);
        window.addEventListener("core:pwa-install-ready", onInstallReady);
        window.addEventListener("core:pwa-installed", onAppInstalled);
        window.addEventListener("appinstalled", onAppInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
            window.removeEventListener("core:pwa-install-ready", onInstallReady);
            window.removeEventListener("core:pwa-installed", onAppInstalled);
            window.removeEventListener("appinstalled", onAppInstalled);
        };
    }, []);

    const installApp = async () => {
        if (!deferredPrompt) return false;

        try {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;

            if (outcome === "accepted") {
                setIsInstalled(true);
                setIsInstallable(false);
            }

            window.__coreDeferredPrompt = null;
            setDeferredPrompt(null);
            return outcome === "accepted";
        } catch {
            return false;
        }
    };

    return { isInstallable, isInstalled, isIOS, installApp };
}
