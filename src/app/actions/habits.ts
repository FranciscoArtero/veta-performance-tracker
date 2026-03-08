"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";

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

/** Get diff in days between two dates */
function getDaysDiff(d1: Date, d2: Date) {
    const utc1 = Date.UTC(d1.getFullYear(), d1.getMonth(), d1.getDate());
    const utc2 = Date.UTC(d2.getFullYear(), d2.getMonth(), d2.getDate());
    return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
}

// ─────────────────────────────────────
// Gamification: Streak Engine
// ─────────────────────────────────────

/**
 * Checks if a user has earned a new achievement based on their new streak.
 * If yes, it creates the achievement.
 */
async function checkAchievements(userId: string, newGlobalStreak: number) {
    const milestones = [
        { type: "BRONZE_7", days: 7 },
        { type: "SILVER_30", days: 30 },
        { type: "GOLD_100", days: 100 },
        { type: "DIAMOND_365", days: 365 },
    ];

    const newlyUnlocked: string[] = [];
    for (const milestone of milestones) {
        if (newGlobalStreak >= milestone.days) {
            // Check if already unlocked
            const existing = await prisma.achievement.findUnique({
                where: { userId_type: { userId, type: milestone.type } },
            });
            if (!existing) {
                await prisma.achievement.create({
                    data: { userId, type: milestone.type },
                });
                console.log(`[Gamification] Achievement unlocked! ${milestone.type} for user ${userId}`);
                newlyUnlocked.push(milestone.type);
            }
        }
    }
    return newlyUnlocked;
}

/**
 * Recalculates the user's global streak.
 * The global streak increments if the user completes ALL their required daily/fixed habits for a day.
 * We evaluate today and yesterday to see if the streak is maintained or broken.
 */
export async function syncGlobalStreak(userId: string) {
    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const yesterdayUTC = new Date(todayUTC.getTime() - 24 * 60 * 60 * 1000);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { currentGlobalStreak: true, longestGlobalStreak: true, lastGlobalStreakDate: true },
    });
    if (!user) return [];

    // Get all habits to know what is required
    const habits = await prisma.habit.findMany({
        where: { userId, isActive: true },
        select: { id: true, frequency: true, targetDays: true },
    });

    if (habits.length === 0) return [];

    // Helper: did user complete all requirements for a specific date?
    const checkDayCompleted = async (checkDate: Date) => {
        const dow = checkDate.getUTCDay();

        // 1. Identify required habits for this day
        const requiredHabitIds = habits.filter((h) => {
            if (h.frequency === "weekly_flexible") return false;
            if (h.frequency === "weekly_fixed") return (h.targetDays ?? []).includes(dow);
            return true; // daily
        }).map((h) => h.id);

        if (requiredHabitIds.length === 0) return true; // Free day keeps streak alive

        // 2. Count completions
        const logs = await prisma.habitLog.count({
            where: {
                habitId: { in: requiredHabitIds },
                date: checkDate,
                completed: true,
            },
        });

        return logs === requiredHabitIds.length;
    };

    const isTodayComplete = await checkDayCompleted(todayUTC);
    const isYesterdayComplete = await checkDayCompleted(yesterdayUTC);

    let newCurrent = user.currentGlobalStreak;
    let newLastDate = user.lastGlobalStreakDate;

    // Safe gap calculation
    const daysSinceLastComplete = user.lastGlobalStreakDate
        ? getDaysDiff(new Date(user.lastGlobalStreakDate), todayUTC)
        : -1;

    // 1. If yesterday was NOT complete and today is NOT complete, streak breaks
    if (!isYesterdayComplete && !isTodayComplete && daysSinceLastComplete > 1) {
        newCurrent = 0;
    }

    // 2. If yesterday was complete, but lastGlobalDate isn't updated
    if (isYesterdayComplete && daysSinceLastComplete > 1) {
        // This implies a sync gap, let's just reset to 1
        newCurrent = 1;
        newLastDate = yesterdayUTC;
    }

    // 3. Complete today!
    if (isTodayComplete) {
        if (!user.lastGlobalStreakDate) {
            newCurrent = 1;
        } else if (daysSinceLastComplete === 1) {
            newCurrent = user.currentGlobalStreak + 1; // It was yesterday, so sequential
        } else if (daysSinceLastComplete > 1) {
            newCurrent = 1; // Gap
        } else if (daysSinceLastComplete === 0) {
            // Already counted today
            newCurrent = user.currentGlobalStreak;
        }
        newLastDate = todayUTC;
    } else {
        // If today is NOT complete, but yesterday WAS, they keep the streak until tomorrow
        if (isYesterdayComplete && daysSinceLastComplete > 0) {
            // Ensure yesterday is counted if not already
            if (daysSinceLastComplete > 1) newCurrent = 1;
            newLastDate = yesterdayUTC;
        }
    }

    const newLongest = Math.max(newCurrent, user.longestGlobalStreak);

    let unlockedAchievements: string[] = [];

    if (newCurrent !== user.currentGlobalStreak || newLongest !== user.longestGlobalStreak || newLastDate !== user.lastGlobalStreakDate) {
        await prisma.user.update({
            where: { id: userId },
            data: {
                currentGlobalStreak: newCurrent,
                longestGlobalStreak: newLongest,
                lastGlobalStreakDate: newLastDate,
            },
        });

        // Trigger achievements check
        if (newCurrent > user.currentGlobalStreak) {
            unlockedAchievements = await checkAchievements(userId, newCurrent);
        }
    }

    return unlockedAchievements;
}

/**
 * Recalculate streak for a specific habit by iterating over its logs.
 */
export async function recalculateHabitStreak(habitId: string) {
    const habit = await prisma.habit.findUnique({
        where: { id: habitId },
        select: { frequency: true, targetDays: true, currentStreak: true, longestStreak: true },
    });
    if (!habit || habit.frequency === "weekly_flexible") return;

    const logs = await prisma.habitLog.findMany({
        where: { habitId, completed: true },
        orderBy: { date: "desc" },
    });

    const completedTimeSet = new Set(logs.map(l => new Date(l.date).getTime()));

    const now = new Date();
    const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    let currentStreak = 0;
    const checkDate = new Date(todayUTC);

    // Safety break loop
    for (let i = 0; i < 3650; i++) {
        const dow = checkDate.getUTCDay();
        const isTargetDay = habit.frequency === "daily" || habit.targetDays.includes(dow);

        if (isTargetDay) {
            if (completedTimeSet.has(checkDate.getTime())) {
                currentStreak++;
            } else {
                // If the block breaks AT today, it's fine (they have until midnight).
                // If it breaks BEFORE today, the streak is over.
                if (i > 0) {
                    break;
                }
            }
        }

        checkDate.setDate(checkDate.getDate() - 1);
    }

    // We update only if changed to avoid unnecessary writes
    const newLongest = Math.max(currentStreak, habit.longestStreak);
    if (currentStreak !== habit.currentStreak || newLongest !== habit.longestStreak) {
        await prisma.habit.update({
            where: { id: habitId },
            data: { currentStreak, longestStreak: newLongest },
        });
    }
}

// ─────────────────────────────────────
// Toggle Habit Log (Daily + Weekly Fixed)
// ─────────────────────────────────────

/**
 * Toggle a habit log for a given date.
 * For WEEKLY_FIXED: only allows toggle if the day is in targetDays.
 */
export async function toggleHabitLog(habitId: string, dateISO: string) {
    const { id: userId } = await requireAuth();
    console.log("[toggleHabitLog] habitId:", habitId, "dateISO:", dateISO);
    const dateOnly = toDateOnly(dateISO);

    // Check if this is a fixed weekly habit — validate day + ownership
    const habit = await prisma.habit.findUnique({
        where: { id: habitId },
        select: { frequency: true, targetDays: true, userId: true },
    });

    if (!habit || habit.userId !== userId) return;

    if (habit.frequency === "weekly_fixed" && habit.targetDays.length > 0) {
        const dayOfWeek = dateOnly.getUTCDay();
        if (!habit.targetDays.includes(dayOfWeek)) {
            console.log("[toggleHabitLog] Day blocked for fixed habit:", dayOfWeek);
            return { newlyUnlockedAchievements: [] }; // Don't allow toggle on non-target days
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

    // Sync individual streak first
    await recalculateHabitStreak(habitId);
    // Sync global streak
    const newlyUnlockedAchievements = await syncGlobalStreak(userId) || [];

    revalidatePath("/");
    revalidatePath("/habits");

    return { newlyUnlockedAchievements };
}

// ─────────────────────────────────────
// Weekly Flexible: Add/Remove Session
// ─────────────────────────────────────

/**
 * Add a session for a weekly_flexible habit (logs today's date).
 * If today already has a log, remove it (untoggle).
 */
export async function addWeeklySession(habitId: string) {
    const { id: userId } = await requireAuth();
    console.log("[addWeeklySession] habitId:", habitId);

    // Ownership check
    const habit = await prisma.habit.findUnique({
        where: { id: habitId },
        select: { userId: true },
    });
    if (!habit || habit.userId !== userId) return;

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
    await requireAuth();
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
 * Get all habits for the authenticated user with logs from the last 7 days.
 */
export async function getHabitsWithLogs() {
    const { id: userId } = await requireAuth();
    console.log("[getHabitsWithLogs] userId:", userId);

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
export async function getHabitsWithWeeklyLogs() {
    const { id: userId } = await requireAuth();

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
 * Dynamic denominator per day: DAILY + WEEKLY_FIXED (on target day) = required.
 * WEEKLY_FLEXIBLE excluded from denominator (bonus only).
 * Ratio uses weighted scoring: 70% required habits + 30% tasks.
 */
export async function getMonthlyLogs() {
    const { id: userId } = await requireAuth();
    const now = new Date();
    const startOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    const endOfMonth = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 0));

    const habits = await prisma.habit.findMany({
        where: { userId, isActive: true },
        select: { id: true, frequency: true, targetDays: true },
    });

    const [logs, tasks] = await Promise.all([
        prisma.habitLog.findMany({
            where: {
                habitId: { in: habits.map((h) => h.id) },
                date: { gte: startOfMonth, lte: endOfMonth },
                completed: true,
            },
        }),
        prisma.task.findMany({
            where: {
                userId,
                date: { gte: startOfMonth, lte: endOfMonth },
            },
            select: { date: true, completed: true },
        }),
    ]);

    const daysInMonth = endOfMonth.getUTCDate();

    // Build per-day habit completion map
    const habitCompletionMap: Record<number, Set<string>> = {};
    for (let d = 1; d <= daysInMonth; d++) habitCompletionMap[d] = new Set();
    for (const log of logs) {
        const day = new Date(log.date).getUTCDate();
        habitCompletionMap[day].add(log.habitId);
    }

    // Count tasks per day
    const taskTotalMap: Record<number, number> = {};
    const taskDoneMap: Record<number, number> = {};
    for (const t of tasks) {
        const day = new Date(t.date).getUTCDate();
        taskTotalMap[day] = (taskTotalMap[day] || 0) + 1;
        if (t.completed) taskDoneMap[day] = (taskDoneMap[day] || 0) + 1;
    }

    const result: { day: number; ratio: number }[] = [];
    const todayDay = now.getDate();
    const year = now.getFullYear();
    const month = now.getMonth();

    for (let d = 1; d <= daysInMonth; d++) {
        if (d > todayDay) {
            result.push({ day: d, ratio: -1 });
        } else {
            // Get day of week for this specific day
            const dow = new Date(year, month, d).getDay();

            // Count required habits for this day
            const requiredHabitIds = habits.filter((h) => {
                if (h.frequency === "weekly_flexible") return false;
                if (h.frequency === "weekly_fixed") {
                    return (h.targetDays ?? []).includes(dow);
                }
                return true; // daily
            }).map((h) => h.id);

            const totalRequired = requiredHabitIds.length;
            const completedRequired = requiredHabitIds.filter((id) => habitCompletionMap[d].has(id)).length;

            const habitScore = totalRequired > 0 ? completedRequired / totalRequired : 1;
            const dayTasks = taskTotalMap[d] || 0;

            if (totalRequired > 0 || dayTasks > 0) {
                if (dayTasks > 0) {
                    const taskScore = (taskDoneMap[d] || 0) / dayTasks;
                    result.push({ day: d, ratio: habitScore * 0.7 + taskScore * 0.3 });
                } else {
                    result.push({ day: d, ratio: habitScore });
                }
            } else {
                result.push({ day: d, ratio: 1 }); // no obligations = 100%
            }
        }
    }

    return { daysInMonth, data: result };
}

// ─────────────────────────────────────
// CRUD
// ─────────────────────────────────────

/**
 * Create a new habit for the authenticated user.
 */
export async function createHabit(
    name: string,
    icon: string,
    color: string,
    frequency: string,
    weeklyMode?: string | null,
    goalDays?: number | null,
    targetDays?: number[]
) {
    const { id: userId } = await requireAuth();
    console.log("[createHabit] userId:", userId, "name:", name, "frequency:", frequency,
        "weeklyMode:", weeklyMode, "goalDays:", goalDays, "targetDays:", targetDays);

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
    const { id: userId } = await requireAuth();
    console.log("[deleteHabit] habitId:", habitId);

    // Ownership check
    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== userId) return;

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
    const { id: userId } = await requireAuth();
    console.log("[updateHabit] habitId:", habitId, "data:", data);

    // Ownership check
    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit || habit.userId !== userId) return;

    await prisma.habit.update({ where: { id: habitId }, data });
    revalidatePath("/");
    revalidatePath("/habits");
}
