"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

/**
 * Add water intake for today.
 */
export async function addWater(amountMl: number) {
    const { id: userId } = await requireAuth();

    if (amountMl <= 0 || amountMl > 5000) {
        return { error: "Cantidad inválida" };
    }

    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    await prisma.hydrationLog.create({
        data: {
            userId,
            date: today,
            amountMl,
        },
    });

    // Return updated totals
    const logs = await prisma.hydrationLog.findMany({
        where: { userId, date: today },
    });
    const totalMl = logs.reduce((sum, l) => sum + l.amountMl, 0);

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { hydrationGoalMl: true },
    });

    return {
        totalMl,
        goalMl: user?.hydrationGoalMl ?? 2000,
        percent: Math.min(Math.round((totalMl / (user?.hydrationGoalMl ?? 2000)) * 100), 100),
    };
}

/**
 * Get today's hydration data.
 */
export async function getTodayHydration() {
    const { id: userId } = await requireAuth();

    const now = new Date();
    const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));

    const [logs, user] = await Promise.all([
        prisma.hydrationLog.findMany({
            where: { userId, date: today },
            orderBy: { createdAt: "desc" },
            select: { id: true, amountMl: true, createdAt: true },
        }),
        prisma.user.findUnique({
            where: { id: userId },
            select: { hydrationGoalMl: true, isHydrationEnabled: true },
        }),
    ]);

    const totalMl = logs.reduce((sum, l) => sum + l.amountMl, 0);
    const goalMl = user?.hydrationGoalMl ?? 2000;

    return {
        totalMl,
        goalMl,
        percent: Math.min(Math.round((totalMl / goalMl) * 100), 100),
        logs: logs.map((l) => ({
            id: l.id,
            amountMl: l.amountMl,
            time: l.createdAt.toISOString(),
        })),
    };
}

/**
 * Toggle hydration module on/off.
 */
export async function toggleHydrationModule(enabled: boolean) {
    const { id } = await requireAuth();
    await prisma.user.update({
        where: { id },
        data: { isHydrationEnabled: enabled },
    });
    return { success: true };
}

/**
 * Update daily hydration goal.
 */
export async function updateHydrationGoal(goalMl: number) {
    const { id } = await requireAuth();

    if (goalMl < 500 || goalMl > 10000) {
        return { error: "El objetivo debe estar entre 500ml y 10000ml" };
    }

    await prisma.user.update({
        where: { id },
        data: { hydrationGoalMl: goalMl },
    });
    return { success: true };
}
