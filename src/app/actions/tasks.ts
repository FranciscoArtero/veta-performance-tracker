"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";

/**
 * Get tasks for a specific date.
 */
export async function getTasksForDate(dateISO: string) {
    const { id: userId } = await requireAuth();
    const d = new Date(dateISO);
    const dateOnly = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

    const tasks = await prisma.task.findMany({
        where: { userId, date: dateOnly },
        orderBy: { createdAt: "asc" },
    });

    return tasks;
}

/**
 * Get today's tasks.
 */
export async function getTodayTasks() {
    const { id: userId } = await requireAuth();
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const tasks = await prisma.task.findMany({
        where: { userId, date: today },
        orderBy: { createdAt: "asc" },
    });

    return tasks;
}

/**
 * Create a new task for today.
 */
export async function createTask(title: string, dateISO?: string) {
    const { id: userId } = await requireAuth();
    console.log("[createTask] userId:", userId, "title:", title);

    const d = dateISO ? new Date(dateISO) : new Date();
    const dateOnly = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

    const task = await prisma.task.create({
        data: {
            userId,
            title,
            date: dateOnly,
        },
    });

    console.log("[createTask] Created task:", task.id);
    revalidatePath("/");
    return task;
}

/**
 * Toggle a task's completed status.
 */
export async function toggleTask(taskId: string) {
    const { id: userId } = await requireAuth();
    console.log("[toggleTask] taskId:", taskId);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== userId) return;

    await prisma.task.update({
        where: { id: taskId },
        data: { completed: !task.completed },
    });

    revalidatePath("/");
}

/**
 * Delete a task.
 */
export async function deleteTask(taskId: string) {
    const { id: userId } = await requireAuth();
    console.log("[deleteTask] taskId:", taskId);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task || task.userId !== userId) return;

    await prisma.task.delete({ where: { id: taskId } });
    revalidatePath("/");
}

/**
 * Get day detail: habits, mood, tasks for a specific date.
 * Uses dynamic denominator: DAILY + WEEKLY_FIXED (on target day) = required.
 * WEEKLY_FLEXIBLE = bonus (doesn't penalise score).
 */
export async function getDayDetail(dateISO: string) {
    const { id: userId } = await requireAuth();
    const d = new Date(dateISO);
    const dateOnly = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayOfWeek = new Date(dateISO + "T12:00:00").getDay(); // 0=Sun ... 6=Sat

    const [habits, mentalState, tasks] = await Promise.all([
        prisma.habit.findMany({
            where: { userId, isActive: true },
            include: {
                logs: {
                    where: { date: dateOnly },
                },
            },
            orderBy: { order: "asc" },
        }),
        prisma.mentalState.findUnique({
            where: { userId_date: { userId, date: dateOnly } },
        }),
        prisma.task.findMany({
            where: { userId, date: dateOnly },
            orderBy: { createdAt: "asc" },
        }),
    ]);

    // Classify habits for this specific day
    const requiredHabits = habits.filter((h) => {
        if (h.frequency === "weekly_flexible") return false;
        if (h.frequency === "weekly_fixed") {
            return (h.targetDays ?? []).includes(dayOfWeek);
        }
        return true; // daily
    });

    const completedRequired = requiredHabits.filter((h) => h.logs.length > 0 && h.logs[0].completed).length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    const totalTasks = tasks.length;
    const totalRequired = requiredHabits.length;

    // Weighted score: 70% required habits + 30% tasks
    const habitScore = totalRequired > 0 ? completedRequired / totalRequired : 1;
    const taskScore = totalTasks > 0 ? completedTasks / totalTasks : 0;
    const weightedScore = totalRequired > 0 || totalTasks > 0
        ? (totalTasks > 0
            ? Math.round((habitScore * 0.7 + taskScore * 0.3) * 100)
            : Math.round(habitScore * 100))
        : 100;

    // Only show habits relevant to this day (required + flexible as bonus)
    const visibleHabits = habits.filter((h) => {
        if (h.frequency === "weekly_fixed") {
            return (h.targetDays ?? []).includes(dayOfWeek);
        }
        return true;
    });

    return {
        habits: visibleHabits.map((h) => ({
            id: h.id,
            name: h.name,
            icon: h.icon,
            color: h.color,
            completed: h.logs.length > 0 && h.logs[0].completed,
            isBonus: h.frequency === "weekly_flexible",
        })),
        mentalState: mentalState
            ? { mood: mentalState.mood, motivation: mentalState.motivation, notes: mentalState.notes }
            : null,
        tasks: tasks.map((t) => ({
            id: t.id,
            title: t.title,
            completed: t.completed,
        })),
        score: weightedScore,
        stats: { completedHabits: completedRequired, totalHabits: totalRequired, completedTasks, totalTasks },
    };
}
