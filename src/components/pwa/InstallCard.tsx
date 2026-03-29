"use client";

import { useEffect, useState } from "react";
import { Zap, Share, PlusSquare, ArrowBigDown, Smartphone, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function InstallCard() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
    const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");
    const [isStandalone, setIsStandalone] = useState(true); // default true to avoid hydration mismatch flash
    const [showGuide, setShowGuide] = useState(false);

    useEffect(() => {
        // Detect if already installed / standalone
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isAppMode = window.matchMedia("(display-mode: standalone)").matches || (window.navigator as any).standalone;
        setIsStandalone(isAppMode);

        if (isAppMode) return;

        // Robust Platform Detection
        const ua = window.navigator.userAgent;
        const isIOS = /iPad|iPhone|iPod/.test(ua) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
        const isAndroid = /Android/i.test(ua);

        if (isIOS) setPlatform("ios");
        else if (isAndroid) setPlatform("android");
        else setPlatform("other");

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
            setShowGuide(!showGuide);
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === "accepted") {
            setDeferredPrompt(null);
        }
    };

    return (
        <Card className="border-border/50 bg-gradient-to-br from-violet-600/10 via-indigo-600/10 to-transparent overflow-hidden relative shadow-2xl">
            <div className="absolute inset-0 bg-black/5 dark:bg-white/5 backdrop-blur-md pointer-events-none" />
            <CardContent className="p-5 relative">
                {/* Header Section */}
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-400 shadow-inner">
                        <Zap className="h-6 w-6 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-foreground tracking-tight">
                            {platform === "ios" ? "Instalar en iPhone" : "Descargar App de CORE"}
                        </h3>
                        <p className="text-[12px] text-muted-foreground font-medium">
                            Disfrutá una experiencia fluida y hasta 2x más rápida.
                        </p>
                    </div>
                    {platform !== "ios" && (
                        <button
                            onClick={handleInstallClick}
                            className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95 shadow-lg shadow-violet-600/30 flex items-center gap-2"
                        >
                            {deferredPrompt ? (
                                <>
                                    <ArrowBigDown className="h-4 w-4" />
                                    Descargar
                                </>
                            ) : (
                                "Cómo Instalar"
                            )}
                        </button>
                    )}
                </div>

                {/* iPhone Specific Guide (Always visible or toggle?) */}
                {platform === "ios" && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 space-y-3 shadow-inner">
                        <p className="text-[13px] font-semibold text-zinc-200">Apple requiere estos pasos:</p>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-black">1</div>
                                <p className="text-[12px] text-zinc-300">
                                    Toca el botón <Share className="inline h-4 w-4 mx-1 text-violet-400" /> (Compartir) del navegador.
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-black">2</div>
                                <p className="text-[12px] text-zinc-300 leading-tight">
                                    Buscá y toca <span className="font-bold text-white flex items-center gap-1.5 mt-1 underline decoration-violet-500/50 underline-offset-4 decoration-2"><PlusSquare className="h-4 w-4" /> Agregar a Inicio</span>
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Manual Fallback Guide for Android/PC */}
                {showGuide && !deferredPrompt && platform !== "ios" && (
                    <div className="bg-black/30 border border-white/10 rounded-2xl p-4 mt-2 animate-in fade-in slide-in-from-top-2">
                        <div className="flex items-center gap-2 mb-3 text-violet-400">
                            <Smartphone className="h-4 w-4" />
                            <p className="text-[12px] font-bold">Guía de instalación manual:</p>
                        </div>
                        <ul className="space-y-3">
                            <li className="flex gap-2 text-[11.5px] text-zinc-400">
                                <Info className="h-3.5 w-3.5 shrink-0 text-violet-500/50" />
                                <span>Abrí el menú del navegador (tres puntos <span className="font-bold tracking-widest text-white">⋮</span>).</span>
                            </li>
                            <li className="flex gap-2 text-[11.5px] text-zinc-400">
                                <Info className="h-3.5 w-3.5 shrink-0 text-violet-500/50" />
                                <span>Buscá la opción <span className="text-white font-bold">&quot;Instalar aplicación&quot;</span> o <span className="text-white font-bold">&quot;Instalar en el dispositivo&quot;</span>.</span>
                            </li>
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

