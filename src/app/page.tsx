"use client";

import {
  Target,
  TrendingUp,
  Brain,
  Calendar,
  Flame,
  CheckCircle2,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Mock data for dashboard placeholders
const todayHabits = [
  { name: "Despertar a las 6:00", icon: "⏰", done: true, color: "#8b5cf6" },
  { name: "Gym", icon: "🏋️", done: true, color: "#06b6d4" },
  { name: "Lectura", icon: "📚", done: false, color: "#f59e0b" },
  { name: "Day Trading", icon: "📈", done: false, color: "#10b981" },
  { name: "Budget Tracking", icon: "💰", done: false, color: "#ec4899" },
  { name: "No Alcohol", icon: "🚫", done: true, color: "#ef4444" },
  { name: "Journaling", icon: "📝", done: false, color: "#6366f1" },
  { name: "Cold Shower", icon: "🧊", done: false, color: "#3b82f6" },
];

const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const weekProgress = [85, 72, 90, 65, 78, 45, 0];

const moodData = [
  { day: "Lun", mood: 8, motivation: 7 },
  { day: "Mar", mood: 7, motivation: 8 },
  { day: "Mié", mood: 9, motivation: 9 },
  { day: "Jue", mood: 6, motivation: 5 },
  { day: "Vie", mood: 8, motivation: 7 },
  { day: "Sáb", mood: 7, motivation: 6 },
  { day: "Dom", mood: 0, motivation: 0 },
];

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

function getTodayFormatted() {
  return new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function DashboardPage() {
  const completedToday = todayHabits.filter((h) => h.done).length;
  const totalToday = todayHabits.length;
  const progressPercent = Math.round((completedToday / totalToday) * 100);

  return (
    <div className="p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
          {getGreeting()} 👋
        </h1>
        <p className="text-muted-foreground capitalize">{getTodayFormatted()}</p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
                  Racha
                </p>
                <div className="flex items-baseline gap-1">
                  <p className="text-2xl font-bold">12</p>
                  <span className="text-xs text-muted-foreground">días</span>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10">
                <Flame className="h-5 w-5 text-orange-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-emerald-400">
              <ArrowUpRight className="h-3 w-3" />
              <span>+3 vs semana pasada</span>
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
                  <p className="text-2xl font-bold">8</p>
                  <span className="text-xs text-muted-foreground">/10</span>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
                <Brain className="h-5 w-5 text-cyan-400" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-1 text-xs text-emerald-400">
              <ArrowUpRight className="h-3 w-3" />
              <span>+1.2 vs promedio</span>
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
                  <p className="text-2xl font-bold">74%</p>
                </div>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <Progress value={74} className="mt-3 h-1.5" />
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
            {todayHabits.map((habit, i) => (
              <div
                key={i}
                className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-smooth hover:bg-white/5"
              >
                <button
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-smooth ${habit.done
                      ? "border-violet-500 bg-violet-500 text-white"
                      : "border-border hover:border-violet-400"
                    }`}
                >
                  {habit.done && <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>
                <span className="text-xl leading-none">{habit.icon}</span>
                <span
                  className={`flex-1 text-sm ${habit.done
                      ? "text-muted-foreground line-through"
                      : "text-foreground"
                    }`}
                >
                  {habit.name}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Weekly Progress Chart */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4 text-emerald-400" />
                Progreso semanal
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                Esta semana
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Bar Chart Placeholder */}
            <div className="flex items-end gap-3 h-[200px] pt-4">
              {weekDays.map((day, i) => (
                <div key={day} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full relative flex-1 flex items-end">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-violet-600/80 to-violet-400/80 transition-all duration-500 ease-out hover:from-violet-500 hover:to-violet-300"
                      style={{
                        height: `${weekProgress[i]}%`,
                        minHeight: weekProgress[i] > 0 ? "8px" : "0px",
                      }}
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
                        {weekProgress[i]}%
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground font-medium">
                    {day}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Mental State */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
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
            {/* Mini area chart placeholder */}
            <div className="space-y-4">
              <div className="flex items-end gap-2 h-[140px]">
                {moodData.map((d, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full flex flex-col items-center gap-1 flex-1 justify-end">
                      {/* Mood bar */}
                      <div
                        className="w-3 rounded-full bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-500"
                        style={{ height: `${d.mood * 10}%`, minHeight: d.mood > 0 ? "4px" : "0" }}
                      />
                      {/* Motivation bar */}
                      <div
                        className="w-3 rounded-full bg-gradient-to-t from-pink-600 to-pink-400 transition-all duration-500"
                        style={{ height: `${d.motivation * 10}%`, minHeight: d.motivation > 0 ? "4px" : "0" }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{d.day}</span>
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
                  <span className="text-xs text-muted-foreground">Motivación</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Overview */}
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-amber-400" />
                Resumen mensual
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                Febrero 2026
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {/* Monthly grid placeholder - habit completion heatmap */}
            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: 28 }, (_, i) => {
                const intensity = Math.random();
                return (
                  <div
                    key={i}
                    className="aspect-square rounded-sm transition-smooth hover:scale-110"
                    style={{
                      backgroundColor:
                        i < 26
                          ? `hsla(263, 70%, 55%, ${0.15 + intensity * 0.7})`
                          : "hsl(var(--muted) / 0.3)",
                    }}
                    title={`Día ${i + 1}: ${Math.round(intensity * 100)}%`}
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
      </div>
    </div>
  );
}
