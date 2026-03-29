"use client";

import { useEffect, useState } from "react";
import { Zap, Share, PlusSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function InstallCard() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(true); // default true to avoid hydration mismatch flash
    const [showHowTo, setShowHowTo] = useState(false);

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
        if (!deferredPrompt) {
            setShowHowTo(true);
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setDeferredPrompt(null);
        }
    };

    // Just don't hide it unless standalone. Users want to see it as a branding/info element.
    // if (!isIOS && !deferredPrompt) return null;

    return (
        <Card className="border-border/50 bg-gradient-to-br from-violet-500/10 to-indigo-500/10 overflow-hidden relative">
            <div className="absolute inset-0 bg-black/5 dark:bg-white/5 backdrop-blur-sm pointer-events-none" />
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
                {!isIOS && (
                    <button
                        onClick={handleInstallClick}
                        className="shrink-0 rounded-full bg-violet-600 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-violet-700 active:scale-95 shadow-lg shadow-violet-500/20"
                    >
                        {deferredPrompt ? "Instalar" : "Cómo Instalar"}
                    </button>
                )}
            </CardContent>
            {showHowTo && !deferredPrompt && (
                <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1">
                    <div className="rounded-lg bg-black/20 p-3 text-[11px] text-zinc-300 border border-white/5">
                        <p>Para instalar en este navegador:</p>
                        <ul className="list-disc list-inside mt-1 space-y-1 text-zinc-400">
                            <li>Buscá el ícono de <span className="text-violet-400 font-bold">Instalar</span> en la barra de direcciones superior.</li>
                            <li>O abrí el menú (tres puntos <span className="font-bold">⋮</span>) y seleccioná <span className="text-violet-400 font-bold">Instalar aplicación</span>.</li>
                        </ul>
                        <button 
                            onClick={() => setShowHowTo(false)}
                            className="mt-2 text-violet-400 font-bold hover:text-violet-300"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </Card>
    );
}
