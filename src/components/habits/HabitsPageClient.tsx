"use client";

import { Target, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreateHabitDialog } from "./CreateHabitDialog";

export function HabitsPageClient() {
    return (
        <>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight lg:text-3xl flex items-center gap-2">
                        <Target className="h-7 w-7 text-violet-400" />
                        Mis Hábitos
                    </h1>
                    <p className="text-muted-foreground">
                        Administrá y hacé seguimiento de tus hábitos diarios.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5">
                        <Filter className="h-3.5 w-3.5" />
                        Filtrar
                    </Button>
                    <CreateHabitDialog>
                        <Button
                            size="sm"
                            className="gap-1.5 bg-violet-600 hover:bg-violet-700"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Nuevo hábito
                        </Button>
                    </CreateHabitDialog>
                </div>
            </div>
        </>
    );
}

export function AddHabitCard() {
    return (
        <CreateHabitDialog>
            <Card className="border-dashed border-border/50 bg-transparent transition-smooth hover:border-violet-500/30 hover:bg-card/20 cursor-pointer group">
                <CardContent className="p-5 flex flex-col items-center justify-center h-full min-h-[150px] gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-muted-foreground/30 transition-smooth group-hover:border-violet-400 group-hover:bg-violet-500/10">
                        <Plus className="h-5 w-5 text-muted-foreground group-hover:text-violet-400 transition-smooth" />
                    </div>
                    <p className="text-sm text-muted-foreground group-hover:text-foreground transition-smooth">
                        Agregar hábito
                    </p>
                </CardContent>
            </Card>
        </CreateHabitDialog>
    );
}
