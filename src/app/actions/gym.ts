"use server";

import type { FocusType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type RoutineExerciseInput = {
    name: string;
    muscleGroup?: string;
    category?: string;
};

type ExerciseSummaryAccumulator = {
    id: string;
    name: string;
    muscleGroup: string;
    category: string;
    lastTrainedAt: Date | null;
    bestWeight: number;
    bestEffectiveWeight: number;
    lastWeight: number | null;
    sessionIds: Set<string>;
};

const DEFAULT_CATEGORY = "general";
const DEFAULT_MUSCLE_GROUP = "general";
const DEFAULT_FOCUS_TYPE: FocusType = "HYPERTROPHY";

function normalizeText(value: string) {
    return value.trim().replace(/\s+/g, " ");
}

function titleCase(value: string) {
    return value
        .split(" ")
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(" ");
}

function normalizeExerciseName(value: string) {
    const cleaned = normalizeText(value);
    return titleCase(cleaned);
}

function normalizeTag(value: string | undefined, fallback: string) {
    const cleaned = normalizeText(value || fallback);
    return cleaned.toLowerCase();
}

function calcEffectiveWeight(weight: number, reps?: number | null) {
    if (!reps || reps <= 1) return weight;
    return weight * (1 + reps / 30);
}

function toDateKey(date: Date) {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function dedupeExercises(exercises: RoutineExerciseInput[]) {
    const seen = new Set<string>();
    const unique: { name: string; category: string; muscleGroup: string }[] = [];

    for (const exercise of exercises) {
        const name = normalizeExerciseName(exercise.name);
        if (!name) continue;

        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        unique.push({
            name,
            category: normalizeTag(exercise.category, DEFAULT_CATEGORY),
            muscleGroup: normalizeTag(exercise.muscleGroup, DEFAULT_MUSCLE_GROUP),
        });
    }

    return unique;
}

// Queries

export async function getRoutines() {
    const { id: userId } = await requireAuth();
    return prisma.workoutRoutine.findMany({
        where: { userId },
        include: {
            exercises: {
                orderBy: { order: "asc" },
                include: {
                    globalExercise: {
                        select: { id: true, name: true, muscleGroup: true, category: true },
                    },
                },
            },
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
                include: {
                    exercise: {
                        select: {
                            id: true,
                            name: true,
                            category: true,
                            globalExercise: {
                                select: { id: true, name: true, category: true, muscleGroup: true },
                            },
                        },
                    },
                },
                orderBy: { setNumber: "asc" },
            },
        },
        orderBy: { date: "desc" },
        take: limit,
    });
}

export async function getExerciseProgressSummaries(limit = 12) {
    const { id: userId } = await requireAuth();

    const sets = await prisma.exerciseSet.findMany({
        where: {
            workoutLog: { userId },
            exercise: { globalExerciseId: { not: null } },
        },
        select: {
            reps: true,
            weight: true,
            workoutLog: { select: { id: true, date: true } },
            exercise: {
                select: {
                    globalExercise: {
                        select: { id: true, name: true, muscleGroup: true, category: true },
                    },
                },
            },
        },
        orderBy: [{ workoutLog: { date: "desc" } }],
    });

    const byExercise = new Map<string, ExerciseSummaryAccumulator>();

    for (const row of sets) {
        const globalExercise = row.exercise.globalExercise;
        if (!globalExercise) continue;

        let summary = byExercise.get(globalExercise.id);
        if (!summary) {
            summary = {
                id: globalExercise.id,
                name: globalExercise.name,
                muscleGroup: globalExercise.muscleGroup,
                category: globalExercise.category,
                lastTrainedAt: null,
                bestWeight: 0,
                bestEffectiveWeight: 0,
                lastWeight: null,
                sessionIds: new Set<string>(),
            };
            byExercise.set(globalExercise.id, summary);
        }

        summary.sessionIds.add(row.workoutLog.id);

        if (!summary.lastTrainedAt || row.workoutLog.date > summary.lastTrainedAt) {
            summary.lastTrainedAt = row.workoutLog.date;
            summary.lastWeight = row.weight ?? null;
        } else if (
            summary.lastWeight === null &&
            summary.lastTrainedAt &&
            row.workoutLog.date.getTime() === summary.lastTrainedAt.getTime()
        ) {
            summary.lastWeight = row.weight ?? null;
        }

        if (typeof row.weight === "number") {
            summary.bestWeight = Math.max(summary.bestWeight, row.weight);
            summary.bestEffectiveWeight = Math.max(
                summary.bestEffectiveWeight,
                calcEffectiveWeight(row.weight, row.reps)
            );
        }
    }

    return Array.from(byExercise.values())
        .map((summary) => ({
            id: summary.id,
            name: summary.name,
            muscleGroup: summary.muscleGroup,
            category: summary.category,
            lastTrainedAt: summary.lastTrainedAt,
            bestWeight: Number(summary.bestWeight.toFixed(2)),
            bestEffectiveWeight: Number(summary.bestEffectiveWeight.toFixed(2)),
            lastWeight:
                typeof summary.lastWeight === "number"
                    ? Number(summary.lastWeight.toFixed(2))
                    : null,
            totalSessions: summary.sessionIds.size,
        }))
        .sort((a, b) => {
            const aTime = a.lastTrainedAt ? new Date(a.lastTrainedAt).getTime() : 0;
            const bTime = b.lastTrainedAt ? new Date(b.lastTrainedAt).getTime() : 0;
            return bTime - aTime;
        })
        .slice(0, limit);
}

export async function getExerciseHistory(globalExerciseId: string) {
    const { id: userId } = await requireAuth();
    const safeId = globalExerciseId.trim();
    if (!safeId) throw new Error("Ejercicio no valido");

    const exercise = await prisma.globalExercise.findUnique({
        where: { id: safeId },
        select: { id: true, name: true, category: true, muscleGroup: true },
    });

    if (!exercise) {
        throw new Error("Ejercicio no encontrado");
    }

    const sets = await prisma.exerciseSet.findMany({
        where: {
            workoutLog: { userId },
            exercise: { globalExerciseId: safeId },
        },
        select: {
            id: true,
            setNumber: true,
            reps: true,
            weight: true,
            durationSec: true,
            workoutLog: {
                select: {
                    id: true,
                    date: true,
                    routine: { select: { id: true, name: true, color: true } },
                },
            },
        },
        orderBy: [{ workoutLog: { date: "asc" } }, { setNumber: "asc" }],
    });

    const timelineMap = new Map<
        string,
        { date: Date; effectiveWeight: number; weight: number; reps: number | null }
    >();

    for (const set of sets) {
        if (typeof set.weight !== "number") continue;

        const key = toDateKey(set.workoutLog.date);
        const effectiveWeight = calcEffectiveWeight(set.weight, set.reps);
        const current = timelineMap.get(key);

        if (!current || effectiveWeight > current.effectiveWeight) {
            timelineMap.set(key, {
                date: set.workoutLog.date,
                effectiveWeight,
                weight: set.weight,
                reps: set.reps,
            });
        }
    }

    const timeline = Array.from(timelineMap.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((point) => ({
            dateISO: toDateKey(point.date),
            effectiveWeight: Number(point.effectiveWeight.toFixed(2)),
            weight: Number(point.weight.toFixed(2)),
            reps: point.reps,
        }));

    const history = [...sets]
        .sort((a, b) => {
            const byDate = b.workoutLog.date.getTime() - a.workoutLog.date.getTime();
            if (byDate !== 0) return byDate;
            return a.setNumber - b.setNumber;
        })
        .map((set) => ({
            id: set.id,
            dateISO: toDateKey(set.workoutLog.date),
            routine: set.workoutLog.routine,
            setNumber: set.setNumber,
            reps: set.reps,
            weight: set.weight,
            durationSec: set.durationSec,
            effectiveWeight:
                typeof set.weight === "number"
                    ? Number(calcEffectiveWeight(set.weight, set.reps).toFixed(2))
                    : null,
        }));

    const bestEffectiveWeight = timeline.reduce(
        (best, point) => Math.max(best, point.effectiveWeight),
        0
    );
    const bestWeight = history.reduce(
        (best, entry) =>
            typeof entry.weight === "number" ? Math.max(best, entry.weight) : best,
        0
    );

    return {
        exercise,
        timeline,
        history,
        stats: {
            totalSets: history.length,
            totalSessions: new Set(history.map((entry) => `${entry.dateISO}-${entry.routine.id}`)).size,
            bestWeight: Number(bestWeight.toFixed(2)),
            bestEffectiveWeight: Number(bestEffectiveWeight.toFixed(2)),
        },
    };
}

// Mutations

export async function createRoutine(
    name: string,
    description: string | null,
    color: string,
    focusType: FocusType = DEFAULT_FOCUS_TYPE,
    exercises: RoutineExerciseInput[]
) {
    const { id: userId } = await requireAuth();
    const normalizedExercises = dedupeExercises(exercises);

    if (!name.trim()) throw new Error("La rutina necesita nombre");
    if (normalizedExercises.length === 0) throw new Error("Agrega al menos un ejercicio");

    return prisma.workoutRoutine.create({
        data: {
            name: normalizeText(name),
            description,
            color,
            focusType,
            userId,
            exercises: {
                create: normalizedExercises.map((exercise, index) => ({
                    name: exercise.name,
                    category: exercise.category,
                    order: index,
                    globalExercise: {
                        connectOrCreate: {
                            where: { name: exercise.name },
                            create: {
                                name: exercise.name,
                                category: exercise.category,
                                muscleGroup: exercise.muscleGroup,
                            },
                        },
                    },
                })),
            },
        },
        include: {
            exercises: {
                include: { globalExercise: true },
                orderBy: { order: "asc" },
            },
        },
    });
}

export async function deleteRoutine(routineId: string) {
    const { id: userId } = await requireAuth();

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

    const routine = await prisma.workoutRoutine.findFirst({
        where: { id: data.routineId, userId },
        select: { id: true },
    });

    if (!routine) throw new Error("Rutina no encontrada");

    const exerciseIds = Array.from(new Set(data.sets.map((set) => set.exerciseId)));
    const validExercises = await prisma.exercise.findMany({
        where: { id: { in: exerciseIds }, routineId: data.routineId },
        select: { id: true },
    });
    const validExerciseIds = new Set(validExercises.map((exercise) => exercise.id));
    const invalidSet = data.sets.find((set) => !validExerciseIds.has(set.exerciseId));

    if (invalidSet) {
        throw new Error("La serie contiene un ejercicio invalido para esta rutina");
    }

    return prisma.workoutLog.create({
        data: {
            date: new Date(data.dateISO),
            rpe: data.rpe,
            notes: data.notes,
            durationMinutes: data.durationMinutes,
            routineId: data.routineId,
            userId,
            sets: {
                create: data.sets.map((set) => ({
                    exerciseId: set.exerciseId,
                    setNumber: set.setNumber,
                    reps: set.reps,
                    weight: set.weight,
                    durationSec: set.durationSec,
                })),
            },
        },
    });
}

