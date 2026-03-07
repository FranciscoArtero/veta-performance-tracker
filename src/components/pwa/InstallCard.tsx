"use client";

import { useEffect, useState } from "react";
import { Zap, Share, PlusSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function InstallCard() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(true); // default true to avoid hydration mismatch flash

    useEffect(() => {
        // Detect if already installed / standalone
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isAppMode = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
        setIsStandalone(isAppMode);

        if (isAppMode) return;

        // Detect iOS (iPad, iPhone, iPod)
        const ua = window.navigator.userAgent;
        const iOS = !!ua.match(/iPad/i) || !!ua.match(/iPhone/i);
        const macOS = !!ua.match(/Mac OS/i);
        // iPad on iOS 13 detection
        const isIPadOS = macOS && window.navigator.maxTouchPoints > 2;

        if (iOS || isIPadOS) {
            setIsIOS(true);
        }

        // Catch Android / Chrome PWA prompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };

        window.addEventListener("beforeinstallprompt", handler);

        return () => window.removeEventListener("beforeinstallprompt", handler);
    }, []);

    if (isStandalone) return null;

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setDeferredPrompt(null);
        }
    };

    // If it's not iOS and we don't have a prompt yet, better not show anything to avoid a dead button
    // (Except maybe on desktop it takes a bit, but usually we just want to hide if not installable)
    if (!isIOS && !deferredPrompt) return null;

    return (
        <Card className="border-border/50 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 overflow-hidden relative">
            <div className="absolute inset-0 bg-white/5 backdrop-blur-sm pointer-events-none" />
            <CardContent className="p-4 relative flex items-center gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
                    <Zap className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">Instalar App</h3>
                    {isIOS ? (
                        <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                            Toca <Share className="inline h-3 w-3 mx-0.5" /> y luego{" "}
                            <span className="font-medium text-foreground">
                                <PlusSquare className="inline h-3 w-3 mx-0.5" /> Agregar a inicio
                            </span>
                        </p>
                    ) : (
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Descargá CORE para una mejor y más rápida experiencia.
                        </p>
                    )}
                </div>
                {!isIOS && deferredPrompt && (
                    <button
                        onClick={handleInstallClick}
                        className="shrink-0 rounded-full bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white transition-smooth hover:bg-violet-700 active:scale-95"
                    >
                        Instalar
                    </button>
                )}
            </CardContent>
        </Card>
    );
}
