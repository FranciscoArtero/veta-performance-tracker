"use client";

import { useState, useOptimistic, useTransition } from "react";
import {
    Target,
    TrendingUp,
    Brain,
    Flame,
    CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toggleHabitLog } from "@/app/actions/habits";
import { createTask, toggleTask, deleteTask } from "@/app/actions/tasks";
import { MentalStateInput } from "./MentalStateInput";
import { MonthlyHeatmap } from "./MonthlyHeatmap";
import { Plus, Trash2, ListTodo } from "lucide-react";


type HabitWithLogs = {
    id: string;
    name: string;
    icon: string;
    color: string;
    frequency: string;
    weeklyMode?: string | null;
    goalDays?: number | null;
    targetDays?: number[];
    weekSessions?: number;
    logs: { id: string; date: Date; completed: boolean }[];
};

type MoodDataPoint = {
    day: string;
    mood: number;
    motivation: number;
};

type MonthlyData = {
    daysInMonth: number;
    data: { day: number; ratio: number }[];
};

type TaskItem = {
    id: string;
    title: string;
    completed: boolean;
};

type Props = {
    habits: HabitWithLogs[];
    streaks: Record<string, number>;
    bestStreak: number;
    moodData: MoodDataPoint[];
    monthlyData: MonthlyData;
    todayMood: { mood: number; motivation: number } | null;
    monthLabel: string;
    tasks: TaskItem[];
};

function getTodayISO() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isCompletedToday(logs: { date: Date; completed: boolean }[]) {
    const todayStr = getTodayISO();
    return logs.some((l) => {
        const d = new Date(l.date);
        const logStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        return logStr === todayStr && l.completed;
    });
}

export function DashboardClient({
    habits,
    streaks,
    bestStreak,
    moodData,
    monthlyData,
    todayMood,
    monthLabel,
    tasks: initialTasks,
}: Props) {
    const [greeting, setGreeting] = useState("");
    const [todayFormatted, setTodayFormatted] = useState("");
    const [, startTransition] = useTransition();
    const [newTaskTitle, setNewTaskTitle] = useState("");
    const [optimisticTasks, setOptimisticTasks] = useOptimistic(
        initialTasks,
        (state: TaskItem[], action: { type: string; task?: TaskItem; id?: string }) => {
            switch (action.type) {
                case "add":
                    return action.task ? [...state, action.task] : state;
                case "toggle":
                    return state.map((t) => t.id === action.id ? { ...t, completed: !t.completed } : t);
                case "delete":
                    return state.filter((t) => t.id !== action.id);
                default:
                    return state;
            }
        }
    );

    // Build initial today-status map
    const initialTodayMap: Record<string, boolean> = {};
    for (const h of habits) {
        initialTodayMap[h.id] = isCompletedToday(h.logs);
    }
    const [optimisticToday, setOptimisticToday] = useOptimistic(
        initialTodayMap,
        (state: Record<string, boolean>, habitId: string) => ({
            ...state,
            [habitId]: !state[habitId],
        })
    );

    // Fix hydration: render dates only client-side
    useState(() => {
        const hour = new Date().getHours();
        if (hour < 12) setGreeting("Buenos días");
        else if (hour < 18) setGreeting("Buenas tardes");
        else setGreeting("Buenas noches");

        setTodayFormatted(
            new Date().toLocaleDateString("es-AR", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
            })
        );
    });

    const completedToday = Object.values(optimisticToday).filter(Boolean).length;
    const totalToday = habits.length;
    const completedTasksToday = optimisticTasks.filter((t) => t.completed).length;
    const totalTasksToday = optimisticTasks.length;

    // Weighted score: 70% habits + 30% tasks (if tasks exist)
    const habitScore = totalToday > 0 ? completedToday / totalToday : 0;
    const taskScore = totalTasksToday > 0 ? completedTasksToday / totalTasksToday : 0;
    const progressPercent = totalTasksToday > 0
        ? Math.round((habitScore * 0.7 + taskScore * 0.3) * 100)
        : Math.round(habitScore * 100);

    // Average mood from this week
    const moodValues = moodData.filter((d) => d.mood > 0);
    const avgMood =
        moodValues.length > 0
            ? (moodValues.reduce((s, d) => s + d.mood, 0) / moodValues.length).toFixed(1)
            : "—";



    function handleToggle(habitId: string) {
        const todayISO = getTodayISO();
        startTransition(async () => {
            setOptimisticToday(habitId);
            await toggleHabitLog(habitId, todayISO);
        });
    }

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8">
            {/* Header */}
            <div className="space-y-1">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight lg:text-3xl">
                    {greeting || "\u00A0"} 👋
                </h1>
                <p className="text-sm md:text-base text-muted-foreground capitalize">
                    {todayFormatted || "\u00A0"}
                </p>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                    Hoy
                                </p>
                                <p className="text-2xl font-bold">
                                    {completedToday}/{totalToday}
                                </p>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                                <CheckCircle2 className="h-5 w-5 text-violet-400" />
                            </div>
                        </div>
                        <Progress value={progressPercent} className="mt-3 h-1.5" />
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                    Mejor racha
                                </p>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-2xl font-bold">{bestStreak}</p>
                                    <span className="text-xs text-muted-foreground">días</span>
                                </div>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
                                <Flame className="h-5 w-5 text-orange-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                    Mood
                                </p>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-2xl font-bold">{avgMood}</p>
                                    <span className="text-xs text-muted-foreground">/10</span>
                                </div>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
                                <Brain className="h-5 w-5 text-cyan-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                    Este mes
                                </p>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-2xl font-bold">
                                        {monthlyData.data.filter((d) => d.ratio > 0).length > 0
                                            ? Math.round(
                                                (monthlyData.data
                                                    .filter((d) => d.ratio >= 0)
                                                    .reduce((s, d) => s + d.ratio, 0) /
                                                    monthlyData.data.filter((d) => d.ratio >= 0)
                                                        .length) *
                                                100
                                            )
                                            : 0}
                                        %
                                    </p>
                                </div>
                            </div>
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                                <TrendingUp className="h-5 w-5 text-emerald-400" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Today's Habits */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm lg:col-span-1">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Target className="h-4 w-4 text-violet-400" />
                                Hábitos de hoy
                            </CardTitle>
                            <Badge variant="secondary" className="text-xs">
                                {progressPercent}%
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-1.5">
                        {habits.map((habit) => {
                            const done = optimisticToday[habit.id];
                            const isFlexible = habit.frequency === "weekly_flexible";
                            const isFixed = habit.frequency === "weekly_fixed";
                            const todayDow = new Date().getDay();
                            const isTargetDay = isFixed ? (habit.targetDays ?? []).includes(todayDow) : true;

                            // Weekly flexible: show session counter
                            if (isFlexible) {
                                return (
                                    <div
                                        key={habit.id}
                                        className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-smooth hover:bg-white/5"
                                    >
                                        <span className="text-xl leading-none">{habit.icon}</span>
                                        <span className="flex-1 text-sm text-foreground">
                                            {habit.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground font-medium">
                                            {habit.weekSessions ?? 0}/{habit.goalDays ?? 3}
                                        </span>
                                        <button
                                            onClick={() => handleToggle(habit.id)}
                                            title="Agregar sesión"
                                            className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/20 text-amber-400 transition-smooth hover:scale-110"
                                        >
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>
                                );
                            }

                            // Weekly fixed: show disabled state if not target day
                            if (isFixed && !isTargetDay) {
                                return (
                                    <div
                                        key={habit.id}
                                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 opacity-40"
                                    >
                                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-border/50" />
                                        <span className="text-xl leading-none">{habit.icon}</span>
                                        <span className="flex-1 text-sm text-muted-foreground">
                                            {habit.name}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground/60">
                                            No es día
                                        </span>
                                    </div>
                                );
                            }

                            // Daily + Fixed (target day): normal checkbox
                            return (
                                <div
                                    key={habit.id}
                                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-smooth hover:bg-white/5 cursor-pointer"
                                    onClick={() => handleToggle(habit.id)}
                                >
                                    <button
                                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-smooth ${done
                                            ? "border-violet-500 bg-violet-500 text-white"
                                            : "border-border hover:border-violet-400"
                                            }`}
                                    >
                                        {done && <CheckCircle2 className="h-3.5 w-3.5" />}
                                    </button>
                                    <span className="text-xl leading-none">{habit.icon}</span>
                                    <span
                                        className={`flex-1 text-sm ${done
                                            ? "text-muted-foreground line-through"
                                            : "text-foreground"
                                            }`}
                                    >
                                        {habit.name}
                                    </span>
                                    {streaks[habit.id] > 0 && (
                                        <span className="text-xs text-orange-400 font-medium">
                                            🔥{streaks[habit.id]}
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>

                {/* Tasks of the Day */}
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm lg:col-span-1">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <ListTodo className="h-4 w-4 text-emerald-400" />
                                Tareas del día
                            </CardTitle>
                            <Badge variant="secondary" className="text-xs">
                                {optimisticTasks.filter((t) => t.completed).length}/{optimisticTasks.length}
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {/* Add task input */}
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!newTaskTitle.trim()) return;
                                const tempTask = { id: `temp-${Date.now()}`, title: newTaskTitle.trim(), completed: false };
                                startTransition(async () => {
                                    setOptimisticTasks({ type: "add", task: tempTask });
                                    await createTask(newTaskTitle.trim());
                                });
                                setNewTaskTitle("");
                            }}
                            className="flex gap-2"
                        >
                            <input
                                type="text"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                placeholder="Agregar tarea..."
                                className="flex-1 rounded-lg border border-border/50 bg-background/50 px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 transition-smooth"
                            />
                            <button
                                type="submit"
                                title="Agregar tarea"
                                disabled={!newTaskTitle.trim()}
                                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 transition-smooth hover:bg-emerald-500/30 disabled:opacity-30"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        </form>

                        {/* Task list */}
                        {optimisticTasks.length === 0 && (
                            <p className="text-xs text-muted-foreground/50 text-center py-4">
                                Sin tareas para hoy — ¡agregá una!
                            </p>
                        )}
                        {optimisticTasks.map((task) => (
                            <div
                                key={task.id}
                                className="group flex items-center gap-3 rounded-lg px-3 py-3 transition-smooth hover:bg-white/5 cursor-pointer select-none"
                                style={{ WebkitUserSelect: "none", touchAction: "manipulation" }}
                                onClick={() => {
                                    startTransition(async () => {
                                        setOptimisticTasks({ type: "toggle", id: task.id });
                                        await toggleTask(task.id);
                                    });
                                }}
                            >
                                <div
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-smooth ${task.completed
                                        ? "border-emerald-500 bg-emerald-500 text-white"
                                        : "border-border/70 hover:border-emerald-400"
                                        }`}
                                >
                                    {task.completed && <CheckCircle2 className="h-4 w-4" />}
                                </div>
                                <span
                                    className={`flex-1 text-sm ${task.completed ? "text-muted-foreground line-through" : "text-foreground"
                                        }`}
                                >
                                    {task.title}
                                </span>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        startTransition(async () => {
                                            setOptimisticTasks({ type: "delete", id: task.id });
                                            await deleteTask(task.id);
                                        });
                                    }}
                                    title="Eliminar tarea"
                                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-muted-foreground hover:text-red-400 transition-smooth p-1"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </CardContent>
                </Card>
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm lg:col-span-2">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Brain className="h-4 w-4 text-cyan-400" />
                                Estado mental
                            </CardTitle>
                            <Badge variant="secondary" className="text-xs">
                                Últimos 7 días
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {/* Chart */}
                            <div className="flex items-end gap-2 h-[140px]">
                                {moodData.map((d, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 flex flex-col items-center gap-1.5"
                                    >
                                        <div className="w-full flex items-end justify-center gap-0.5 flex-1">
                                            <div
                                                className="w-2.5 rounded-full bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-500"
                                                style={{
                                                    height: d.mood > 0 ? `${Math.max(d.mood * 10, 8)}%` : "0",
                                                }}
                                            />
                                            <div
                                                className="w-2.5 rounded-full bg-gradient-to-t from-pink-600 to-pink-400 transition-all duration-500"
                                                style={{
                                                    height: d.motivation > 0 ? `${Math.max(d.motivation * 10, 8)}%` : "0",
                                                }}
                                            />
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">
                                            {d.day}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center gap-4 justify-center">
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-cyan-400" />
                                    <span className="text-xs text-muted-foreground">Mood</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="h-2 w-2 rounded-full bg-pink-400" />
                                    <span className="text-xs text-muted-foreground">
                                        Motivación
                                    </span>
                                </div>
                            </div>

                            {/* Sliders */}
                            <div className="border-t border-border/50 pt-4">
                                <MentalStateInput initialState={todayMood} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Monthly Heatmap */}
            <MonthlyHeatmap data={monthlyData} monthLabel={monthLabel} />
        </div>
    );
}
