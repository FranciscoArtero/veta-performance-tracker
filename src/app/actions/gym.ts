"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// ─── Queries ──────────────────────────────────────────────────

export async function getRoutines() {
    const { id: userId } = await requireAuth();
    return prisma.workoutRoutine.findMany({
        where: { userId },
        include: {
            exercises: { orderBy: { order: "asc" } },
            _count: { select: { logs: true } },
        },
        orderBy: { createdAt: "desc" },
    });
}

export async function getWorkoutLogs(limit = 20) {
    const { id: userId } = await requireAuth();
    return prisma.workoutLog.findMany({
        where: { userId },
        include: {
            routine: { select: { name: true, color: true } },
            sets: {
                include: { exercise: { select: { name: true, category: true } } },
                orderBy: { setNumber: "asc" },
            },
        },
        orderBy: { date: "desc" },
        take: limit,
    });
}

// ─── Mutations ────────────────────────────────────────────────

export async function createRoutine(
    name: string,
    description: string | null,
    color: string,
    exercises: { name: string; category: string }[]
) {
    const { id: userId } = await requireAuth();
    return prisma.workoutRoutine.create({
        data: {
            name,
            description,
            color,
            userId,
            exercises: {
                create: exercises.map((e, i) => ({
                    name: e.name,
                    category: e.category,
                    order: i,
                })),
            },
        },
        include: { exercises: true },
    });
}

export async function deleteRoutine(routineId: string) {
    const { id: userId } = await requireAuth();
    // Ensure the routine belongs to this user
    const routine = await prisma.workoutRoutine.findFirst({
        where: { id: routineId, userId },
    });
    if (!routine) throw new Error("Rutina no encontrada");
    await prisma.workoutRoutine.delete({ where: { id: routineId } });
}

export async function logWorkout(data: {
    routineId: string;
    dateISO: string;
    rpe?: number;
    notes?: string;
    durationMinutes?: number;
    sets: {
        exerciseId: string;
        setNumber: number;
        reps?: number;
        weight?: number;
        durationSec?: number;
    }[];
}) {
    const { id: userId } = await requireAuth();

    // Verify routine belongs to user
    const routine = await prisma.workoutRoutine.findFirst({
        where: { id: data.routineId, userId },
    });
    if (!routine) throw new Error("Rutina no encontrada");

    return prisma.workoutLog.create({
        data: {
            date: new Date(data.dateISO),
            rpe: data.rpe,
            notes: data.notes,
            durationMinutes: data.durationMinutes,
            routineId: data.routineId,
            userId,
            sets: {
                create: data.sets.map((s) => ({
                    exerciseId: s.exerciseId,
                    setNumber: s.setNumber,
                    reps: s.reps,
                    weight: s.weight,
                    durationSec: s.durationSec,
                })),
            },
        },
    });
}
