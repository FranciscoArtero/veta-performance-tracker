"use client";

import { useState, useOptimistic, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Target,
    Brain,
    Flame,
    CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import { toggleHabitLog } from "@/app/actions/habits";
import { createTask, toggleTask, deleteTask } from "@/app/actions/tasks";
import { MentalStateInput } from "./MentalStateInput";
import { MonthlyHeatmap } from "./MonthlyHeatmap";
import { Plus, Trash2, ListTodo } from "lucide-react";

// ─── Animation variants ──────────────────────────────────────
const fadeIn = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        transition: { delay: i * 0.08, duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
    }),
};

const stagger = {
    visible: { transition: { staggerChildren: 0.06 } },
};

const listItem = {
    hidden: { opacity: 0, x: -8 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: 8, height: 0, transition: { duration: 0.2 } },
};

// ─── Glass card class ─────────────────────────────────────────
const glassCard = "bg-zinc-900/40 backdrop-blur-md border-white/5";

// ─── Types ────────────────────────────────────────────────────
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

    const todayDow = new Date().getDay();

    // ─── Classify habits ───────────────────────────────────
    // "Required today" = DAILY + WEEKLY_FIXED on target day
    const requiredHabits = habits.filter((h) => {
        if (h.frequency === "weekly_flexible") return false;
        if (h.frequency === "weekly_fixed") {
            return (h.targetDays ?? []).includes(todayDow);
        }
        return true; // daily
    });

    // WEEKLY_FLEXIBLE habits shown separately as bonus
    // (they don't have a separate array — rendered inline with a "Bonus" badge)

    // Completed counts (only required habits count toward %)
    const completedRequired = requiredHabits.filter((h) => optimisticToday[h.id]).length;
    const totalRequired = requiredHabits.length;

    const completedTasksToday = optimisticTasks.filter((t) => t.completed).length;
    const totalTasksToday = optimisticTasks.length;

    // ─── Efficiency % ──────────────────────────────────────
    // Denominator = required habits + tasks. Flexible habits are bonus (don't subtract).
    const habitScore = totalRequired > 0 ? completedRequired / totalRequired : 1;
    const taskScore = totalTasksToday > 0 ? completedTasksToday / totalTasksToday : 0;
    const progressPercent = totalRequired > 0 || totalTasksToday > 0
        ? (totalTasksToday > 0
            ? Math.round((habitScore * 0.7 + taskScore * 0.3) * 100)
            : Math.round(habitScore * 100))
        : 100;

    const moodValues = moodData.filter((d) => d.mood > 0);
    const avgMood =
        moodValues.length > 0
            ? (moodValues.reduce((s, d) => s + d.mood, 0) / moodValues.length).toFixed(1)
            : "—";

    const monthlyPercent =
        monthlyData.data.filter((d) => d.ratio > 0).length > 0
            ? Math.round(
                (monthlyData.data
                    .filter((d) => d.ratio >= 0)
                    .reduce((s, d) => s + d.ratio, 0) /
                    monthlyData.data.filter((d) => d.ratio >= 0).length) *
                100
            )
            : 0;

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
            <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="space-y-1"
            >
                <h1 className="text-xl md:text-2xl font-bold tracking-tight lg:text-3xl">
                    {greeting || "\u00A0"} 👋
                </h1>
                <p className="text-sm md:text-base text-muted-foreground capitalize">
                    {todayFormatted || "\u00A0"}
                </p>
            </motion.div>

            {/* Stats Row with Progress Rings */}
            <motion.div
                className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4"
                initial="hidden"
                animate="visible"
                variants={stagger}
            >
                {/* Today's Progress */}
                <motion.div variants={fadeIn} custom={0}>
                    <Card className={glassCard}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                        Hoy
                                    </p>
                                    <p className="text-2xl font-bold">
                                        {completedRequired}/{totalRequired}
                                    </p>
                                </div>
                                <ProgressRing
                                    value={progressPercent}
                                    size={48}
                                    strokeWidth={4}
                                    color="#8b5cf6"
                                    label={`${progressPercent}%`}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Best Streak */}
                <motion.div variants={fadeIn} custom={1}>
                    <Card className={glassCard}>
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
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10">
                                    <Flame className="h-6 w-6 text-orange-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Mood */}
                <motion.div variants={fadeIn} custom={2}>
                    <Card className={glassCard}>
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
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
                                    <Brain className="h-6 w-6 text-cyan-400" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Monthly */}
                <motion.div variants={fadeIn} custom={3}>
                    <Card className={glassCard}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                        Este mes
                                    </p>
                                    <div className="flex items-baseline gap-1">
                                        <p className="text-2xl font-bold">{monthlyPercent}%</p>
                                    </div>
                                </div>
                                <ProgressRing
                                    value={monthlyPercent}
                                    size={48}
                                    strokeWidth={4}
                                    color="#10b981"
                                    label={`${monthlyPercent}%`}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Today's Habits */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.4 }}
                    className="lg:col-span-1"
                >
                    <Card className={glassCard}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Target className="h-4 w-4 text-violet-400" />
                                    Hábitos de hoy
                                </CardTitle>
                                <Badge variant="secondary" className="text-xs bg-white/5 border-white/10">
                                    {progressPercent}%
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-1.5">
                            <AnimatePresence mode="popLayout">
                                {habits.map((habit) => {
                                    const done = optimisticToday[habit.id];
                                    const isFlexible = habit.frequency === "weekly_flexible";
                                    const isFixed = habit.frequency === "weekly_fixed";
                                    const isTargetDay = isFixed ? (habit.targetDays ?? []).includes(todayDow) : true;

                                    // Hide WEEKLY_FIXED habits that are NOT for today
                                    if (isFixed && !isTargetDay) return null;

                                    if (isFlexible) {
                                        return (
                                            <motion.div
                                                key={habit.id}
                                                layout
                                                variants={listItem}
                                                initial="hidden"
                                                animate="visible"
                                                exit="exit"
                                                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-smooth hover:bg-white/5"
                                            >
                                                <span className="text-xl leading-none">{habit.icon}</span>
                                                <span className="flex-1 text-sm text-foreground">
                                                    {habit.name}
                                                </span>
                                                <span className="text-xs text-muted-foreground font-medium">
                                                    {habit.weekSessions ?? 0}/{habit.goalDays ?? 3}
                                                </span>
                                                <motion.button
                                                    whileTap={{ scale: 0.9 }}
                                                    onClick={() => handleToggle(habit.id)}
                                                    title="Agregar sesión"
                                                    className="flex h-5 w-5 items-center justify-center rounded-md bg-amber-500/20 text-amber-400 transition-smooth hover:scale-110"
                                                >
                                                    <Plus className="h-3 w-3" />
                                                </motion.button>
                                            </motion.div>
                                        );
                                    }

                                    // (non-target WEEKLY_FIXED already filtered above)

                                    return (
                                        <motion.div
                                            key={habit.id}
                                            layout
                                            variants={listItem}
                                            initial="hidden"
                                            animate="visible"
                                            exit="exit"
                                            whileTap={{ scale: 0.98 }}
                                            className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-smooth hover:bg-white/5 cursor-pointer"
                                            onClick={() => handleToggle(habit.id)}
                                        >
                                            <motion.button
                                                whileTap={{ scale: 0.85 }}
                                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-smooth ${done
                                                    ? "border-violet-500 bg-violet-500 text-white"
                                                    : "border-white/20 hover:border-violet-400"
                                                    }`}
                                            >
                                                {done && <CheckCircle2 className="h-3.5 w-3.5" />}
                                            </motion.button>
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
                                        </motion.div>
                                    );
                                })}
                            </AnimatePresence>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Tasks of the Day */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    className="lg:col-span-1"
                >
                    <Card className={glassCard}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <ListTodo className="h-4 w-4 text-emerald-400" />
                                    Tareas del día
                                </CardTitle>
                                <Badge variant="secondary" className="text-xs bg-white/5 border-white/10">
                                    {completedTasksToday}/{totalTasksToday}
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
                                    className="flex-1 rounded-lg border border-white/5 bg-white/[0.03] px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30 transition-smooth"
                                />
                                <motion.button
                                    type="submit"
                                    title="Agregar tarea"
                                    disabled={!newTaskTitle.trim()}
                                    whileTap={{ scale: 0.9 }}
                                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 transition-smooth hover:bg-emerald-500/30 disabled:opacity-30"
                                >
                                    <Plus className="h-4 w-4" />
                                </motion.button>
                            </form>

                            {/* Task list */}
                            {optimisticTasks.length === 0 && (
                                <p className="text-xs text-muted-foreground/50 text-center py-4">
                                    Sin tareas para hoy — ¡agregá una!
                                </p>
                            )}
                            <AnimatePresence mode="popLayout">
                                {optimisticTasks.map((task) => (
                                    <motion.div
                                        key={task.id}
                                        layout
                                        variants={listItem}
                                        initial="hidden"
                                        animate="visible"
                                        exit="exit"
                                        whileTap={{ scale: 0.98 }}
                                        className="group flex items-center gap-3 rounded-lg px-3 py-3 transition-smooth hover:bg-white/5 cursor-pointer select-none"
                                        style={{ WebkitUserSelect: "none", touchAction: "manipulation" }}
                                        onClick={() => {
                                            startTransition(async () => {
                                                setOptimisticTasks({ type: "toggle", id: task.id });
                                                await toggleTask(task.id);
                                            });
                                        }}
                                    >
                                        <motion.div
                                            whileTap={{ scale: 0.85 }}
                                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-smooth ${task.completed
                                                ? "border-emerald-500 bg-emerald-500 text-white"
                                                : "border-white/15 hover:border-emerald-400"
                                                }`}
                                        >
                                            {task.completed && <CheckCircle2 className="h-4 w-4" />}
                                        </motion.div>
                                        <span
                                            className={`flex-1 text-sm ${task.completed ? "text-muted-foreground line-through" : "text-foreground"
                                                }`}
                                        >
                                            {task.title}
                                        </span>
                                        <motion.button
                                            whileTap={{ scale: 0.85 }}
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
                                        </motion.button>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Mental State */}
                <motion.div
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.4 }}
                    className="lg:col-span-1"
                >
                    <Card className={glassCard}>
                        <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                                <CardTitle className="flex items-center gap-2 text-base">
                                    <Brain className="h-4 w-4 text-cyan-400" />
                                    Estado mental
                                </CardTitle>
                                <Badge variant="secondary" className="text-xs bg-white/5 border-white/10">
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
                                                <motion.div
                                                    className="w-2.5 rounded-full bg-gradient-to-t from-cyan-600 to-cyan-400"
                                                    initial={{ height: 0 }}
                                                    animate={{
                                                        height: d.mood > 0 ? `${Math.max(d.mood * 10, 8)}%` : "0",
                                                    }}
                                                    transition={{ delay: 0.5 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                                                />
                                                <motion.div
                                                    className="w-2.5 rounded-full bg-gradient-to-t from-pink-600 to-pink-400"
                                                    initial={{ height: 0 }}
                                                    animate={{
                                                        height: d.motivation > 0 ? `${Math.max(d.motivation * 10, 8)}%` : "0",
                                                    }}
                                                    transition={{ delay: 0.5 + i * 0.05, duration: 0.6, ease: "easeOut" }}
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
                                <div className="border-t border-white/5 pt-4">
                                    <MentalStateInput initialState={todayMood} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Monthly Heatmap */}
            <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.4 }}
            >
                <MonthlyHeatmap data={monthlyData} monthLabel={monthLabel} />
            </motion.div>
        </div>
    );
}
