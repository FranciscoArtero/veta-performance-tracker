"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Get tasks for a specific date.
 */
export async function getTasksForDate(userId: string, dateISO: string) {
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
export async function getTodayTasks(userId: string) {
    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    // Ensure user exists
    await prisma.user.upsert({
        where: { id: userId },
        update: {},
        create: { id: userId, email: "temp@example.com", name: "Temp User" },
    });

    const tasks = await prisma.task.findMany({
        where: { userId, date: today },
        orderBy: { createdAt: "asc" },
    });

    return tasks;
}

/**
 * Create a new task for today.
 */
export async function createTask(userId: string, title: string, dateISO?: string) {
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
    console.log("[toggleTask] taskId:", taskId);

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return;

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
    console.log("[deleteTask] taskId:", taskId);
    await prisma.task.delete({ where: { id: taskId } });
    revalidatePath("/");
}

/**
 * Get day detail: habits, mood, tasks for a specific date.
 */
export async function getDayDetail(userId: string, dateISO: string) {
    const d = new Date(dateISO);
    const dateOnly = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

    const [habits, mentalState, tasks] = await Promise.all([
        // Get all active habits with logs for this specific date
        prisma.habit.findMany({
            where: { userId, isActive: true },
            include: {
                logs: {
                    where: { date: dateOnly },
                },
            },
            orderBy: { order: "asc" },
        }),
        // Get mental state for this date
        prisma.mentalState.findUnique({
            where: { userId_date: { userId, date: dateOnly } },
        }),
        // Get tasks for this date
        prisma.task.findMany({
            where: { userId, date: dateOnly },
            orderBy: { createdAt: "asc" },
        }),
    ]);

    const completedHabits = habits.filter((h) => h.logs.length > 0 && h.logs[0].completed).length;
    const completedTasks = tasks.filter((t) => t.completed).length;
    const totalTasks = tasks.length;
    const totalHabits = habits.length;

    // Weighted score: 70% habits + 30% tasks
    const habitScore = totalHabits > 0 ? completedHabits / totalHabits : 0;
    const taskScore = totalTasks > 0 ? completedTasks / totalTasks : 0;
    const weightedScore = totalTasks > 0
        ? Math.round((habitScore * 0.7 + taskScore * 0.3) * 100)
        : Math.round(habitScore * 100);

    return {
        habits: habits.map((h) => ({
            id: h.id,
            name: h.name,
            icon: h.icon,
            color: h.color,
            completed: h.logs.length > 0 && h.logs[0].completed,
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
        stats: { completedHabits, totalHabits, completedTasks, totalTasks },
    };
}
