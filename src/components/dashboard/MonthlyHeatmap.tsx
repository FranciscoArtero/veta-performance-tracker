"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

type Props = {
    data: {
        daysInMonth: number;
        data: { day: number; ratio: number }[];
    };
    monthLabel: string;
};

export function MonthlyHeatmap({ data, monthLabel }: Props) {
    return (
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
                        return (
                            <div
                                key={i}
                                className="aspect-square rounded-sm transition-smooth hover:scale-110"
                                style={{
                                    backgroundColor: isFuture
                                        ? "hsl(var(--muted) / 0.3)"
                                        : `hsla(263, 70%, 55%, ${0.15 + intensity * 0.7})`,
                                }}
                                title={
                                    isFuture
                                        ? `Día ${d.day}`
                                        : `Día ${d.day}: ${Math.round(intensity * 100)}%`
                                }
                            />
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
    );
}
