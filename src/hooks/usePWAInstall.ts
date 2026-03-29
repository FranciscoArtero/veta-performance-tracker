"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{
        outcome: "accepted" | "dismissed";
    }>;
};

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

        const handleBeforeInstall = (event: Event) => {
            event.preventDefault();
            setDeferredPrompt(event as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstall);

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
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

            setDeferredPrompt(null);
            return outcome === "accepted";
        } catch {
            return false;
        }
    };

    return { isInstallable, isInstalled, isIOS, installApp };
}
