"use client";

import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { DayDetailModal } from "./DayDetailModal";

type Props = {
    data: {
        daysInMonth: number;
        data: { day: number; ratio: number }[];
    };
    monthLabel: string;
};

export function MonthlyHeatmap({ data, monthLabel }: Props) {
    const [selectedDay, setSelectedDay] = useState<number | null>(null);
    const [tooltipDay, setTooltipDay] = useState<number | null>(null);

    // Long press detection
    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isLongPress = useRef(false);

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    function getDayISO(day: number) {
        return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }

    // --- Touch / click handlers ---

    const handleTouchStart = useCallback((day: number, isFuture: boolean) => {
        if (isFuture) return;
        isLongPress.current = false;

        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            setTooltipDay(day);
        }, 300);
    }, []);

    const handleTouchEnd = useCallback((day: number, isFuture: boolean) => {
        if (isFuture) return;

        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        if (isLongPress.current) {
            // Was a long press — just dismiss tooltip, don't open modal
            setTooltipDay(null);
        } else {
            // Short tap — open modal
            setSelectedDay(day);
        }

        isLongPress.current = false;
    }, []);

    const handleTouchCancel = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
        setTooltipDay(null);
        isLongPress.current = false;
    }, []);

    // Desktop click
    function handleClick(day: number, isFuture: boolean) {
        if (isFuture) return;
        setSelectedDay(day);
    }

    return (
        <>
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <Sparkles className="h-4 w-4 text-amber-400" />
                            Resumen mensual
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs capitalize">
                            {monthLabel}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-7 gap-1.5">
                        {data.data.map((d, i) => {
                            const isFuture = d.ratio < 0;
                            const intensity = isFuture ? 0 : d.ratio;
                            const pct = Math.round(intensity * 100);
                            const dateLabel = new Date(year, month, d.day).toLocaleDateString("es-AR", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                            });
                            const showTooltip = tooltipDay === d.day || undefined;

                            return (
                                <div
                                    key={i}
                                    className={`aspect-square rounded-sm transition-smooth relative group select-none ${isFuture
                                        ? "cursor-default"
                                        : "cursor-pointer hover:scale-110 hover:ring-1 hover:ring-violet-400/50 active:scale-95"
                                        }`}
                                    style={{
                                        backgroundColor: isFuture
                                            ? "hsl(var(--muted) / 0.3)"
                                            : `hsla(263, 70%, 55%, ${0.15 + intensity * 0.7})`,
                                        WebkitUserSelect: "none",
                                        touchAction: "manipulation",
                                        WebkitTouchCallout: "none",
                                    }}
                                    // Desktop: hover tooltip + click to open
                                    onClick={() => handleClick(d.day, isFuture)}
                                    // Mobile: long press = tooltip, short tap = modal
                                    onTouchStart={(e) => { e.preventDefault(); handleTouchStart(d.day, isFuture); }}
                                    onTouchEnd={(e) => { e.preventDefault(); handleTouchEnd(d.day, isFuture); }}
                                    onTouchCancel={handleTouchCancel}
                                >
                                    {/* Tooltip — shows on desktop hover OR mobile long press */}
                                    {!isFuture && (
                                        <div
                                            className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 pointer-events-none transition-opacity z-50 ${showTooltip
                                                ? "opacity-100"
                                                : "opacity-0 group-hover:opacity-100"
                                                }`}
                                        >
                                            <div className="bg-popover border border-border rounded-md px-2 py-1 shadow-lg whitespace-nowrap">
                                                <p className="text-[10px] font-medium text-foreground">{pct}% eficiencia</p>
                                                <p className="text-[9px] text-muted-foreground capitalize">{dateLabel}</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Menos</span>
                        <div className="flex gap-1">
                            {[0.15, 0.35, 0.55, 0.75, 0.95].map((op, i) => (
                                <div
                                    key={i}
                                    className="h-3 w-3 rounded-sm"
                                    style={{
                                        backgroundColor: `hsla(263, 70%, 55%, ${op})`,
                                    }}
                                />
                            ))}
                        </div>
                        <span>Más</span>
                    </div>
                </CardContent>
            </Card>

            {/* Day Detail Modal */}
            <DayDetailModal
                open={selectedDay !== null}
                onClose={() => setSelectedDay(null)}
                dateISO={selectedDay ? getDayISO(selectedDay) : ""}
            />
        </>
    );
}
