import { Target, Plus, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const habits = [
    { name: "Despertar a las 6:00", icon: "⏰", color: "#8b5cf6", frequency: "daily", streak: 12 },
    { name: "Gym", icon: "🏋️", color: "#06b6d4", frequency: "daily", streak: 8 },
    { name: "Lectura / Learning", icon: "📚", color: "#f59e0b", frequency: "daily", streak: 15 },
    { name: "Day Trading", icon: "📈", color: "#10b981", frequency: "weekly", streak: 4 },
    { name: "Budget Tracking", icon: "💰", color: "#ec4899", frequency: "daily", streak: 6 },
    { name: "Prayer / Holy", icon: "🙏", color: "#a855f7", frequency: "daily", streak: 20 },
    { name: "No Alcohol", icon: "🚫", color: "#ef4444", frequency: "daily", streak: 30 },
    { name: "Read/Music/Sleep", icon: "🎵", color: "#3b82f6", frequency: "daily", streak: 10 },
    { name: "Goal Journaling", icon: "📝", color: "#6366f1", frequency: "daily", streak: 7 },
    { name: "Cold Shower", icon: "🧊", color: "#0ea5e9", frequency: "daily", streak: 3 },
];

export default function HabitsPage() {
    return (
        <div className="p-6 lg:p-8 space-y-8">
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
                    <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700">
                        <Plus className="h-3.5 w-3.5" />
                        Nuevo hábito
                    </Button>
                </div>
            </div>

            {/* Habits Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {habits.map((habit, i) => (
                    <Card
                        key={i}
                        className="group border-border/50 bg-card/50 backdrop-blur-sm transition-smooth hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 cursor-pointer"
                    >
                        <CardContent className="p-5">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-smooth group-hover:scale-110"
                                        style={{ backgroundColor: `${habit.color}15` }}
                                    >
                                        {habit.icon}
                                    </div>
                                    <div>
                                        <p className="font-medium text-sm">{habit.name}</p>
                                        <p className="text-xs text-muted-foreground capitalize">
                                            {habit.frequency === "daily" ? "Diario" : "Semanal"}
                                        </p>
                                    </div>
                                </div>
                                <Badge
                                    variant="secondary"
                                    className="text-[10px] font-semibold"
                                    style={{ color: habit.color }}
                                >
                                    🔥 {habit.streak}
                                </Badge>
                            </div>

                            {/* Mini week view */}
                            <div className="mt-4 flex gap-1">
                                {["L", "M", "X", "J", "V", "S", "D"].map((day, j) => {
                                    const done = Math.random() > 0.3;
                                    return (
                                        <div
                                            key={j}
                                            className="flex-1 flex flex-col items-center gap-1"
                                        >
                                            <div
                                                className="h-6 w-full rounded-sm transition-smooth"
                                                style={{
                                                    backgroundColor: done
                                                        ? `${habit.color}80`
                                                        : "hsl(var(--muted) / 0.3)",
                                                }}
                                            />
                                            <span className="text-[9px] text-muted-foreground">
                                                {day}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {/* Add New Habit Card */}
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
            </div>
        </div>
    );
}
