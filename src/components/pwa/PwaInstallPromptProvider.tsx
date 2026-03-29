"use client";

import { useEffect } from "react";

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

export function PwaInstallPromptProvider() {
    useEffect(() => {
        const onBeforeInstallPrompt = (event: Event) => {
            event.preventDefault();
            window.__coreDeferredPrompt = event as BeforeInstallPromptEvent;
            window.dispatchEvent(new Event("core:pwa-install-ready"));
        };

        const onAppInstalled = () => {
            window.__coreDeferredPrompt = null;
            window.dispatchEvent(new Event("core:pwa-installed"));
        };

        window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
        window.addEventListener("appinstalled", onAppInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
            window.removeEventListener("appinstalled", onAppInstalled);
        };
    }, []);

    return null;
}
