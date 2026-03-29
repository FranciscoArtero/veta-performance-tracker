"use client";

import { useState, useEffect } from "react";
import { Zap, Share, PlusSquare, ArrowBigDown, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export function InstallCard() {
    const { isInstallable, isInstalled, isIOS, installApp } = usePWAInstall();
    const [mounted, setMounted] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const [showIosGuide, setShowIosGuide] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) return null;
    if (isInstalled) return null;
    if (dismissed) return null;
    if (!isInstallable && !isIOS) return null;

    return (
        <Card className="border-border/50 bg-gradient-to-br from-violet-600/10 via-indigo-600/10 to-transparent overflow-hidden relative shadow-2xl">
            <div className="absolute inset-0 bg-black/5 dark:bg-white/5 backdrop-blur-md pointer-events-none" />
            <CardContent className="p-5 relative">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <button
                        type="button"
                        onClick={() => setDismissed(true)}
                        aria-label="Cerrar"
                        className="order-3 text-muted-foreground/70 hover:text-foreground transition-smooth"
                    >
                        <X className="h-4 w-4" />
                    </button>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-400 shadow-inner">
                        <Zap className="h-6 w-6 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-foreground tracking-tight">
                            {isIOS ? "Instalar en iPhone" : "Descargar App de CORE"}
                        </h3>
                        <p className="text-[12px] text-muted-foreground font-medium">
                            Disfruta una experiencia fluida y hasta 2x mas rapida.
                        </p>
                        {!isIOS && (
                            <button
                                type="button"
                                onClick={installApp}
                                className="mt-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95 shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 w-full sm:w-auto"
                            >
                                <ArrowBigDown className="h-4 w-4" />
                                Instalar
                            </button>
                        )}
                    </div>
                </div>

                {isIOS && (
                    <div className="space-y-3">
                        <button
                            type="button"
                            onClick={() => setShowIosGuide((prev) => !prev)}
                            className="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all active:scale-95 shadow-lg shadow-violet-600/30 flex items-center justify-center gap-2 w-full"
                        >
                            Como poner en inicio
                        </button>
                    </div>
                )}

                {isIOS && showIosGuide && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-3 space-y-3 shadow-inner">
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
            </CardContent>
        </Card>
    );
}
