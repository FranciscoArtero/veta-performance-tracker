"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────
// Helpers
// ─────────────────────────────────────

/** Get Monday 00:00 UTC of the current week */
function getWeekStart(): Date {
    const now = new Date();
    const day = now.getUTCDay(); // 0=Sun
    const diff = day === 0 ? 6 : day - 1; // Monday=0
    const monday = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - diff));
    return monday;
}

/** Normalize a date string to date-only UTC */
function toDateOnly(dateISO: string): Date {
    const d = new Date(dateISO);
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

// ─────────────────────────────────────
// Toggle Habit Log (Daily + Weekly Fixed)
// ─────────────────────────────────────

/**
 * Toggle a habit log for a given date.
 * For WEEKLY_FIXED: only allows toggle if the day is in targetDays.
 */
export async function toggleHabitLog(habitId: string, dateISO: string) {
    console.log("[toggleHabitLog] habitId:", habitId, "dateISO:", dateISO);
    const dateOnly = toDateOnly(dateISO);

    // Check if this is a fixed weekly habit — validate day
    const habit = await prisma.habit.findUnique({
        where: { id: habitId },
        select: { frequency: true, targetDays: true },
    });

    if (habit?.frequency === "weekly_fixed" && habit.targetDays.length > 0) {
        const dayOfWeek = dateOnly.getUTCDay();
        if (!habit.targetDays.includes(dayOfWeek)) {
            console.log("[toggleHabitLog] Day blocked for fixed habit:", dayOfWeek);
            return; // Don't allow toggle on non-target days
        }
    }

    const existing = await prisma.habitLog.findUnique({
        where: {
            habitId_date: { habitId, date: dateOnly },
        },
    });

    if (existing) {
        console.log("[toggleHabitLog] Deleting existing log:", existing.id);
        await prisma.habitLog.delete({ where: { id: existing.id } });
    } else {
        const created = await prisma.habitLog.create({
            data: { habitId, date: dateOnly, completed: true },
        });
        console.log("[toggleHabitLog] Created new log:", created.id);
    }

    revalidatePath("/");
    revalidatePath("/habits");
}

// ─────────────────────────────────────
// Weekly Flexible: Add/Remove Session
// ─────────────────────────────────────

/**
 * Add a session for a weekly_flexible habit (logs today's date).
 * If today already has a log, remove it (untoggle).
 */
export async function addWeeklySession(habitId: string) {
    console.log("[addWeeklySession] habitId:", habitId);
    const now = new Date();
    const todayOnly = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const existing = await prisma.habitLog.findUnique({
        where: {
            habitId_date: { habitId, date: todayOnly },
        },
    });

    if (existing) {
        await prisma.habitLog.delete({ where: { id: existing.id } });
        console.log("[addWeeklySession] Removed today's session");
    } else {
        await prisma.habitLog.create({
            data: { habitId, date: todayOnly, completed: true },
        });
        console.log("[addWeeklySession] Added today's session");
    }

    revalidatePath("/");
    revalidatePath("/habits");
}

/**
 * Count sessions this week (Mon-Sun) for a flexible habit.
 */
export async function getWeeklySessionCount(habitId: string): Promise<number> {
    const weekStart = getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const count = await prisma.habitLog.count({
        where: {
            habitId,
            date: { gte: weekStart, lt: weekEnd },
            completed: true,
        },
    });
    return count;
}

// ─────────────────────────────────────
// Data Fetching
// ─────────────────────────────────────

/**
 * Get all habits for a user with logs from the last 7 days.
 */
export async function getHabitsWithLogs(userId: string) {
    console.log("[getHabitsWithLogs] userId:", userId);
    await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: "temp@example.com", name: "Temp User" },
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const startDate = new Date(
        Date.UTC(sevenDaysAgo.getFullYear(), sevenDaysAgo.getMonth(), sevenDaysAgo.getDate())
    );

    const habits = await prisma.habit.findMany({
        where: { userId, isActive: true },
        orderBy: { order: "asc" },
        include: {
            logs: {
                where: { date: { gte: startDate } },
                orderBy: { date: "asc" },
            },
        },
    });

    // For flexible habits, also count this week's sessions
    const weekStart = getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const enriched = habits.map((h) => {
        if (h.frequency === "weekly_flexible") {
            const weekSessions = h.logs.filter(
                (l) => l.date >= weekStart && l.date < weekEnd && l.completed
            ).length;
            return { ...h, weekSessions };
        }
        return { ...h, weekSessions: 0 };
    });

    console.log("[getHabitsWithLogs] Found", enriched.length, "habits");
    return enriched;
}

/**
 * Get all habits with logs for the weekly view (last 7 days).
 */
export async function getHabitsWithWeeklyLogs(userId: string) {
    await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: "temp@example.com", name: "Temp User" },
    });

    const now = new Date();
    const fortyNineDaysAgo = new Date(now);
    fortyNineDaysAgo.setDate(fortyNineDaysAgo.getDate() - 48);
    const startDate = new Date(
        Date.UTC(fortyNineDaysAgo.getFullYear(), fortyNineDaysAgo.getMonth(), fortyNineDaysAgo.getDate())
    );

    // Also compute weekStart for flexible habits
    const weekStart = getWeekStart();
    const weekEnd = new Date(weekStart);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

    const habits = await prisma.habit.findMany({
        where: { userId, isActive: true },
        orderBy: { order: "asc" },
        include: {
            logs: {
                where: { date: { gte: startDate } },
                orderBy: { date: "asc" },
            },
        },
    });

    const enriched = habits.map((h) => {
        if (h.frequency === "weekly_flexible") {
            const weekSessions = h.logs.filter(
                (l) => l.date >= weekStart && l.date < weekEnd && l.completed
            ).length;
            return { ...h, weekSessions };
        }
        return { ...h, weekSessions: 0 };
    });

    return enriched;
}

/**
 * Get logs for the current month for the heatmap.
 */
export async function getMonthlyLogs(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));

    const habits = await prisma.habit.findMany({
        where: { userId, isActive: true },
        select: { id: true },
    });

    const totalHabits = habits.length || 1;

    const logs = await prisma.habitLog.findMany({
        where: {
            habitId: { in: habits.map((h) => h.id) },
            date: { gte: startOfMonth, lte: endOfMonth },
            completed: true,
        },
    });

    const daysInMonth = endOfMonth.getUTCDate();
    const dayMap: Record<number, number> = {};
    for (let d = 1; d <= daysInMonth; d++) dayMap[d] = 0;
    for (const log of logs) {
        const day = new Date(log.date).getUTCDate();
        dayMap[day] = (dayMap[day] || 0) + 1;
    }

    const result: { day: number; ratio: number }[] = [];
    const todayDay = now.getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        result.push({
            day: d,
            ratio: d <= todayDay ? dayMap[d] / totalHabits : -1,
        });
    }

    return { daysInMonth, data: result };
}

// ─────────────────────────────────────
// CRUD
// ─────────────────────────────────────

/**
 * Create a new habit for a user.
 */
export async function createHabit(
    userId: string,
    name: string,
    icon: string,
    color: string,
    frequency: string,
    weeklyMode?: string | null,
    goalDays?: number | null,
    targetDays?: number[]
) {
    console.log("[createHabit] userId:", userId, "name:", name, "frequency:", frequency,
        "weeklyMode:", weeklyMode, "goalDays:", goalDays, "targetDays:", targetDays);

    await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: "temp@example.com", name: "Temp User" },
    });

    const lastHabit = await prisma.habit.findFirst({
        where: { userId },
        orderBy: { order: "desc" },
        select: { order: true },
    });

    const habit = await prisma.habit.create({
        data: {
            userId,
            name,
            icon,
            color,
            frequency,
            weeklyMode: weeklyMode ?? null,
            goalDays: goalDays ?? null,
            targetDays: targetDays ?? [],
            order: (lastHabit?.order ?? -1) + 1,
        },
    });

    console.log("[createHabit] Created habit:", habit.id);
    revalidatePath("/");
    revalidatePath("/habits");
    return habit;
}

/**
 * Delete a habit and all its logs.
 */
export async function deleteHabit(habitId: string) {
    console.log("[deleteHabit] habitId:", habitId);
    await prisma.habit.delete({ where: { id: habitId } });
    revalidatePath("/");
    revalidatePath("/habits");
}

/**
 * Update a habit's properties.
 */
export async function updateHabit(
    habitId: string,
    data: {
        name?: string;
        icon?: string;
        color?: string;
        frequency?: string;
        weeklyMode?: string | null;
        goalDays?: number | null;
        targetDays?: number[];
        isActive?: boolean;
    }
) {
    console.log("[updateHabit] habitId:", habitId, "data:", data);
    await prisma.habit.update({ where: { id: habitId }, data });
    revalidatePath("/");
    revalidatePath("/habits");
}
