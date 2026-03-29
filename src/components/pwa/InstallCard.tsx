"use client";

import { useCallback, useEffect, useState } from "react";
import { Zap, Share, PlusSquare, ArrowBigDown, Info } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Platform = "ios" | "android" | "other";

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

export function InstallCard() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [platform, setPlatform] = useState<Platform>("other");
    const [isStandalone, setIsStandalone] = useState(true);
    const [showIosGuide, setShowIosGuide] = useState(false);
    const [showManualGuide, setShowManualGuide] = useState(false);

    const openInstallPrompt = useCallback(async (promptEvent: BeforeInstallPromptEvent) => {
        try {
            await promptEvent.prompt();
            await promptEvent.userChoice;
            window.__coreDeferredPrompt = null;
            setDeferredPrompt(null);
            setShowManualGuide(false);
        } catch {
            setShowManualGuide(true);
        }
    }, []);

    useEffect(() => {
        const isAppMode =
            window.matchMedia("(display-mode: standalone)").matches ||
            Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

        setIsStandalone(isAppMode);
        if (isAppMode) return;

        const ua = window.navigator.userAgent;
        const isIOS =
            /iPad|iPhone|iPod/.test(ua) ||
            (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
        const isAndroid = /Android/i.test(ua);

        if (isIOS) setPlatform("ios");
        else if (isAndroid) setPlatform("android");
        else setPlatform("other");

        setDeferredPrompt(window.__coreDeferredPrompt ?? null);

        const onInstallReady = () => {
            setDeferredPrompt(window.__coreDeferredPrompt ?? null);
        };
        const onAppInstalled = () => {
            setDeferredPrompt(null);
            setIsStandalone(true);
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

    const handleInstallClick = async () => {
        if (platform === "ios") {
            setShowIosGuide((prev) => !prev);
            return;
        }

        if (!deferredPrompt) {
            setShowManualGuide(true);
            return;
        }

        await openInstallPrompt(deferredPrompt);
    };

    if (isStandalone) return null;

    return (
        <Card className="border-border/50 bg-gradient-to-br from-violet-600/10 via-indigo-600/10 to-transparent overflow-hidden relative shadow-2xl">
            <div className="absolute inset-0 bg-black/5 dark:bg-white/5 backdrop-blur-md pointer-events-none" />
            <CardContent className="p-5 relative">
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-400 shadow-inner">
                        <Zap className="h-6 w-6 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-foreground tracking-tight">
                            {platform === "ios" ? "Instalar en iPhone" : "Descargar App de CORE"}
                        </h3>
                        <p className="text-[12px] text-muted-foreground font-medium">
                            Disfruta una experiencia fluida y hasta 2x mas rapida.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleInstallClick}
                        className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95 shadow-lg shadow-violet-600/30 flex items-center gap-2"
                    >
                        {platform !== "ios" && <ArrowBigDown className="h-4 w-4" />}
                        {platform === "ios" ? "Como poner en inicio" : "Instalar"}
                    </button>
                </div>

                {platform === "ios" && showIosGuide && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 space-y-3 shadow-inner">
                        <p className="text-[13px] font-semibold text-zinc-200">Segui estos pasos en Safari:</p>
                        <div className="space-y-4">
                            <div className="flex items-start gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-black">1</div>
                                <p className="text-[12px] text-zinc-300">
                                    Toca el boton <Share className="inline h-4 w-4 mx-1 text-violet-400" /> (Compartir).
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-600 text-[11px] font-black">2</div>
                                <p className="text-[12px] text-zinc-300 leading-tight">
                                    Toca <span className="font-bold text-white inline-flex items-center gap-1"><PlusSquare className="h-4 w-4" /> Agregar a inicio</span>.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {platform !== "ios" && showManualGuide && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-2 space-y-3 shadow-inner">
                        <p className="text-[13px] font-semibold text-zinc-200">Instalacion manual (Android/PC):</p>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3">
                                <Info className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                                <p className="text-[12px] text-zinc-300">
                                    Abri el menu del navegador (tres puntos o icono de instalar).
                                </p>
                            </div>
                            <div className="flex items-start gap-3">
                                <Info className="h-4 w-4 text-violet-400 mt-0.5 shrink-0" />
                                <p className="text-[12px] text-zinc-300">
                                    Toca <span className="font-semibold text-white">Instalar aplicacion</span> o <span className="font-semibold text-white">Instalar app</span>.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
