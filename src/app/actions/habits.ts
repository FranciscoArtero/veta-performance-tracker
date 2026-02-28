"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Toggle a habit log for a given date.
 * If one exists → delete it (un-complete). If not → create it (complete).
 */
export async function toggleHabitLog(habitId: string, dateISO: string) {
    console.log("[toggleHabitLog] habitId:", habitId, "dateISO:", dateISO);
    const date = new Date(dateISO);
    // Normalize to date-only (strip time)
    const dateOnly = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );

    const existing = await prisma.habitLog.findUnique({
        where: {
            habitId_date: {
                habitId,
                date: dateOnly,
            },
        },
    });

    if (existing) {
        console.log("[toggleHabitLog] Deleting existing log:", existing.id);
        await prisma.habitLog.delete({ where: { id: existing.id } });
    } else {
        const created = await prisma.habitLog.create({
            data: {
                habitId,
                date: dateOnly,
                completed: true,
            },
        });
        console.log("[toggleHabitLog] Created new log:", created.id);
    }

    revalidatePath("/");
    revalidatePath("/habits");
}

/**
 * Get all habits for a user with logs from the last 7 days.
 */
export async function getHabitsWithLogs(userId: string) {
    console.log("[getHabitsWithLogs] userId:", userId);
    // Ensure the TEMP user exists first so relations don't break in empty DBs
    await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: {
            id: userId,
            email: "temp@example.com",
            name: "Temp User",
        },
    });

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const startDate = new Date(
        Date.UTC(
            sevenDaysAgo.getFullYear(),
            sevenDaysAgo.getMonth(),
            sevenDaysAgo.getDate()
        )
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

    console.log("[getHabitsWithLogs] Found", habits.length, "habits");
    return habits;
}

/**
 * Get all habits for a user with logs from the last 7 weeks (49 days)
 * for the weekly contribution grid.
 */
export async function getHabitsWithWeeklyLogs(userId: string) {
    // Ensure the TEMP user exists first
    await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: "temp@example.com", name: "Temp User" },
    });

    const now = new Date();
    const fortyNineDaysAgo = new Date(now);
    fortyNineDaysAgo.setDate(fortyNineDaysAgo.getDate() - 48);
    const startDate = new Date(
        Date.UTC(
            fortyNineDaysAgo.getFullYear(),
            fortyNineDaysAgo.getMonth(),
            fortyNineDaysAgo.getDate()
        )
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

    return habits;
}


/**
 * Get logs for the current month for the heatmap.
 */
export async function getMonthlyLogs(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = new Date(
        Date.UTC(now.getFullYear(), now.getMonth() + 1, 0)
    );

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

    // Build a map: dayOfMonth → completion ratio
    const daysInMonth = endOfMonth.getUTCDate();
    const dayMap: Record<number, number> = {};
    for (let d = 1; d <= daysInMonth; d++) {
        dayMap[d] = 0;
    }

    for (const log of logs) {
        const day = new Date(log.date).getUTCDate();
        dayMap[day] = (dayMap[day] || 0) + 1;
    }

    // Normalize to 0-1
    const result: { day: number; ratio: number }[] = [];
    const todayDay = now.getDate();
    for (let d = 1; d <= daysInMonth; d++) {
        result.push({
            day: d,
            ratio: d <= todayDay ? dayMap[d] / totalHabits : -1, // -1 = future
        });
    }

    return { daysInMonth, data: result };
}
