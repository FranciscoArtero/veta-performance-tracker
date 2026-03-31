"use server";

import type { FocusType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

type ExerciseProgressFilters = {
    exerciseId?: string | null;
    muscleGroup?: string | null;
};

type ExerciseSummaryAccumulator = {
    id: string;
    name: string;
    muscleGroup: string;
    currentWeightGoal: number | null;
    goalDate: Date | null;
    lastTrainedAt: Date | null;
    bestWeight: number;
    bestEffectiveWeight: number;
    lastWeight: number | null;
    sessionIds: Set<string>;
};

const DEFAULT_FOCUS_TYPE: FocusType = "HYPERTROPHY";
const DEFAULT_MUSCLE_GROUP = "general";
let integrityRepairPromise: Promise<void> | null = null;

function isMissingColumnError(error: unknown) {
    return (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: string }).code === "P2022"
    );
}

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
    return titleCase(normalizeText(value));
}

function normalizeMuscleGroup(value: string | undefined) {
    const cleaned = normalizeText(value || DEFAULT_MUSCLE_GROUP);
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

function parseGoalDate(goalDateISO?: string | null) {
    if (!goalDateISO) return null;
    const cleanDate = goalDateISO.trim();
    if (!cleanDate) return null;
    const parsed = new Date(`${cleanDate}T00:00:00.000Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function parseGoalWeight(goal: number | null | undefined) {
    if (typeof goal !== "number" || Number.isNaN(goal) || goal <= 0) return null;
    return Number(goal.toFixed(2));
}

async function upsertLegacyGlobalExercise(params: {
    name: string;
    muscleGroup: string;
    userId?: string | null;
}) {
    const fallbackId = `legacy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (params.userId) {
        try {
            await prisma.$executeRaw`
                INSERT INTO "global_exercises"
                    ("id", "userId", "name", "muscleGroup", "createdAt", "updatedAt")
                VALUES
                    (${fallbackId}, ${params.userId}, ${params.name}, ${params.muscleGroup}, NOW(), NOW())
                ON CONFLICT ("userId", "name")
                DO UPDATE SET
                    "muscleGroup" = EXCLUDED."muscleGroup",
                    "updatedAt" = NOW()
            `;

            const [row] = await prisma.$queryRaw<{ id: string }[]>`
                SELECT id
                FROM "global_exercises"
                WHERE "userId" = ${params.userId} AND "name" = ${params.name}
                LIMIT 1
            `;
            if (row?.id) return row.id;
        } catch {
            // fall through to legacy schemas
        }
    }

    try {
        await prisma.$executeRaw`
            INSERT INTO "global_exercises"
                ("id", "name", "muscleGroup", "category", "createdAt", "updatedAt")
            VALUES
                (${fallbackId}, ${params.name}, ${params.muscleGroup}, 'general', NOW(), NOW())
            ON CONFLICT ("name")
            DO UPDATE SET
                "muscleGroup" = EXCLUDED."muscleGroup",
                "updatedAt" = NOW()
        `;
    } catch {
        await prisma.$executeRaw`
            INSERT INTO "global_exercises"
                ("id", "name", "muscleGroup", "createdAt", "updatedAt")
            VALUES
                (${fallbackId}, ${params.name}, ${params.muscleGroup}, NOW(), NOW())
            ON CONFLICT ("name")
            DO NOTHING
        `;
    }

    const [row] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM "global_exercises"
        WHERE "name" = ${params.name}
        LIMIT 1
    `;
    return row?.id ?? fallbackId;
}

async function repairLegacyExerciseReferences() {
    try {
        await prisma.$executeRaw`
            UPDATE "exercises" e
            SET "globalExerciseId" = ge.id
            FROM "global_exercises" ge
            WHERE e."globalExerciseId" IS NULL
              AND LOWER(TRIM(COALESCE(e."name", ''))) = LOWER(TRIM(COALESCE(ge."name", '')))
        `;
    } catch {
        // Ignore if old columns are unavailable; we'll handle the remaining nulls below.
    }

    let missingRows: {
        id: string;
        userId: string | null;
        name: string;
        category: string;
    }[] = [];

    try {
        missingRows = await prisma.$queryRaw<
            {
                id: string;
                userId: string | null;
                name: string;
                category: string;
            }[]
        >`
            SELECT
                e.id,
                wr."userId",
                COALESCE(e."name", CONCAT('Ejercicio ', RIGHT(e.id, 6))) AS "name",
                COALESCE(e."category", ${DEFAULT_MUSCLE_GROUP}) AS "category"
            FROM "exercises" e
            LEFT JOIN "workout_routines" wr ON wr.id = e."routineId"
            WHERE e."globalExerciseId" IS NULL
        `;
    } catch {
        missingRows = await prisma.$queryRaw<
            {
                id: string;
                userId: string | null;
                name: string;
                category: string;
            }[]
        >`
            SELECT
                e.id,
                wr."userId",
                CONCAT('Ejercicio ', RIGHT(e.id, 6)) AS "name",
                ${DEFAULT_MUSCLE_GROUP}::text AS "category"
            FROM "exercises" e
            LEFT JOIN "workout_routines" wr ON wr.id = e."routineId"
            WHERE e."globalExerciseId" IS NULL
        `;
    }

    for (const row of missingRows) {
        const normalizedName = normalizeExerciseName(row.name);
        const normalizedMuscleGroup = normalizeMuscleGroup(row.category);
        const globalExerciseId = await upsertLegacyGlobalExercise({
            name: normalizedName,
            muscleGroup: normalizedMuscleGroup,
            userId: row.userId,
        });

        await prisma.$executeRaw`
            UPDATE "exercises"
            SET "globalExerciseId" = ${globalExerciseId}
            WHERE id = ${row.id}
              AND "globalExerciseId" IS NULL
        `;
    }
}

async function ensureLegacyExerciseIntegrity() {
    if (!integrityRepairPromise) {
        integrityRepairPromise = repairLegacyExerciseReferences().finally(() => {
            integrityRepairPromise = null;
        });
    }
    await integrityRepairPromise;
}

export async function getGlobalExercises() {
    const { id: userId } = await requireAuth();

    try {
        return await prisma.globalExercise.findMany({
            where: { userId },
            include: {
                _count: { select: { exercises: true } },
            },
            orderBy: [{ name: "asc" }],
        });
    } catch (error) {
        if (!isMissingColumnError(error)) throw error;

        const rows = await prisma.$queryRaw<
            {
                id: string;
                name: string;
                muscleGroup: string;
                exerciseCount: number;
            }[]
        >`
            SELECT
                ge.id,
                ge."name",
                ge."muscleGroup",
                COUNT(e.id)::int AS "exerciseCount"
            FROM "global_exercises" ge
            LEFT JOIN "exercises" e ON e."globalExerciseId" = ge.id
            GROUP BY ge.id, ge."name", ge."muscleGroup"
            ORDER BY ge."name" ASC
        `;

        return rows.map((row) => ({
            id: row.id,
            userId,
            name: row.name,
            muscleGroup: row.muscleGroup,
            currentWeightGoal: null,
            goalDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { exercises: Number(row.exerciseCount || 0) },
        }));
    }
}

export async function createGlobalExercise(input: {
    name: string;
    muscleGroup: string;
    currentWeightGoal?: number | null;
    goalDateISO?: string | null;
}) {
    const { id: userId } = await requireAuth();

    const normalizedName = normalizeExerciseName(input.name);
    const normalizedMuscleGroup = normalizeMuscleGroup(input.muscleGroup);
    const currentWeightGoal = parseGoalWeight(input.currentWeightGoal);
    const goalDate = parseGoalDate(input.goalDateISO);
    const hasWeightInput =
        Object.prototype.hasOwnProperty.call(input, "currentWeightGoal");
    const hasGoalDateInput =
        Object.prototype.hasOwnProperty.call(input, "goalDateISO");

    if (!normalizedName) throw new Error("El ejercicio necesita nombre");

    try {
        return await prisma.globalExercise.upsert({
            where: { userId_name: { userId, name: normalizedName } },
            create: {
                userId,
                name: normalizedName,
                muscleGroup: normalizedMuscleGroup,
                currentWeightGoal,
                goalDate,
            },
            update: {
                muscleGroup: normalizedMuscleGroup,
                ...(hasWeightInput ? { currentWeightGoal } : {}),
                ...(hasGoalDateInput ? { goalDate } : {}),
            },
        });
    } catch (error) {
        if (!isMissingColumnError(error)) throw error;

        const fallbackId = `legacy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

        await prisma.$executeRaw`
            INSERT INTO "global_exercises"
                ("id", "name", "muscleGroup", "category", "createdAt", "updatedAt")
            VALUES
                (${fallbackId}, ${normalizedName}, ${normalizedMuscleGroup}, 'general', NOW(), NOW())
            ON CONFLICT ("name")
            DO UPDATE SET
                "muscleGroup" = EXCLUDED."muscleGroup",
                "updatedAt" = NOW()
        `;

        const [row] = await prisma.$queryRaw<
            { id: string; name: string; muscleGroup: string }[]
        >`
            SELECT id, "name", "muscleGroup"
            FROM "global_exercises"
            WHERE "name" = ${normalizedName}
            LIMIT 1
        `;

        return {
            id: row?.id ?? fallbackId,
            userId,
            name: row?.name ?? normalizedName,
            muscleGroup: row?.muscleGroup ?? normalizedMuscleGroup,
            currentWeightGoal: null,
            goalDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }
}

export async function updateGlobalExerciseGoals(input: {
    globalExerciseId: string;
    currentWeightGoal: number | null;
    goalDateISO: string | null;
}) {
    const { id: userId } = await requireAuth();
    const globalExerciseId = input.globalExerciseId.trim();
    if (!globalExerciseId) throw new Error("Ejercicio no valido");

    try {
        const existing = await prisma.globalExercise.findFirst({
            where: { id: globalExerciseId, userId },
            select: { id: true },
        });
        if (!existing) throw new Error("Ejercicio no encontrado");

        return await prisma.globalExercise.update({
            where: { id: globalExerciseId },
            data: {
                currentWeightGoal: parseGoalWeight(input.currentWeightGoal),
                goalDate: parseGoalDate(input.goalDateISO),
            },
        });
    } catch (error) {
        if (!isMissingColumnError(error)) throw error;
        return null;
    }
}

// Queries

export async function getRoutines() {
    const { id: userId } = await requireAuth();
    await ensureLegacyExerciseIntegrity();
    return prisma.workoutRoutine.findMany({
        where: { userId },
        include: {
            exercises: {
                orderBy: { order: "asc" },
                include: {
                    globalExercise: {
                        select: {
                            id: true,
                            name: true,
                            muscleGroup: true,
                        },
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
    await ensureLegacyExerciseIntegrity();
    return prisma.workoutLog.findMany({
        where: { userId },
        include: {
            routine: { select: { name: true, color: true } },
            sets: {
                include: {
                    exercise: {
                        select: {
                            id: true,
                            globalExercise: {
                                select: {
                                    id: true,
                                    name: true,
                                    muscleGroup: true,
                                },
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

export async function getExerciseProgressSummaries(
    limit = 100,
    filters: ExerciseProgressFilters = {}
) {
    const { id: userId } = await requireAuth();
    await ensureLegacyExerciseIntegrity();

    const filterExerciseId = filters.exerciseId?.trim() || null;
    const filterMuscleGroup =
        filters.muscleGroup && filters.muscleGroup !== "all"
            ? normalizeMuscleGroup(filters.muscleGroup)
            : null;

    const exerciseWhere: {
        globalExerciseId?: string;
        globalExercise?: { muscleGroup: string };
    } = {};

    if (filterExerciseId) {
        exerciseWhere.globalExerciseId = filterExerciseId;
    }
    if (filterMuscleGroup) {
        exerciseWhere.globalExercise = { muscleGroup: filterMuscleGroup };
    }

    const setWhere: {
        workoutLog: { userId: string };
        exercise?: {
            globalExerciseId?: string;
            globalExercise?: { muscleGroup: string };
        };
    } = {
        workoutLog: { userId },
    };

    if (Object.keys(exerciseWhere).length > 0) {
        setWhere.exercise = exerciseWhere;
    }

    const sets = await prisma.exerciseSet.findMany({
        where: setWhere,
        select: {
            reps: true,
            weight: true,
            workoutLog: { select: { id: true, date: true } },
            exercise: {
                select: {
                    globalExercise: {
                        select: {
                            id: true,
                            name: true,
                            muscleGroup: true,
                        },
                    },
                },
            },
        },
        orderBy: [{ workoutLog: { date: "desc" } }],
    });

    const byExercise = new Map<string, ExerciseSummaryAccumulator>();

    for (const row of sets) {
        const globalExercise = row.exercise.globalExercise;

        let summary = byExercise.get(globalExercise.id);
        if (!summary) {
            summary = {
                id: globalExercise.id,
                name: globalExercise.name,
                muscleGroup: globalExercise.muscleGroup,
                currentWeightGoal: null,
                goalDate: null,
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
            currentWeightGoal: summary.currentWeightGoal,
            goalDate: summary.goalDate,
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
    await ensureLegacyExerciseIntegrity();
    const safeId = globalExerciseId.trim();
    if (!safeId) throw new Error("Ejercicio no valido");

    const exercise = await prisma.globalExercise.findFirst({
        where: { id: safeId },
        select: {
            id: true,
            name: true,
            muscleGroup: true,
        },
    });

    if (!exercise) throw new Error("Ejercicio no encontrado");

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
            workoutLogId: set.workoutLog.id,
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
        exercise: {
            ...exercise,
            currentWeightGoal: null,
            goalDate: null,
        },
        timeline,
        history,
        stats: {
            totalSets: history.length,
            totalSessions: new Set(history.map((entry) => entry.workoutLogId)).size,
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
    exerciseIds: string[]
) {
    const { id: userId } = await requireAuth();
    const routineName = normalizeText(name);
    const uniqueExerciseIds = Array.from(
        new Set(exerciseIds.map((exerciseId) => exerciseId.trim()).filter(Boolean))
    );

    if (!routineName) throw new Error("La rutina necesita nombre");
    if (uniqueExerciseIds.length === 0) throw new Error("Agrega al menos un ejercicio");

    let validExercises: { id: string }[] = [];

    try {
        validExercises = await prisma.globalExercise.findMany({
            where: {
                userId,
                id: { in: uniqueExerciseIds },
            },
            select: { id: true },
        });
    } catch (error) {
        if (!isMissingColumnError(error)) throw error;
        validExercises = await prisma.globalExercise.findMany({
            where: { id: { in: uniqueExerciseIds } },
            select: { id: true },
        });
    }

    if (validExercises.length !== uniqueExerciseIds.length) {
        throw new Error("Uno o mas ejercicios no pertenecen a tu biblioteca");
    }

    return prisma.workoutRoutine.create({
        data: {
            name: routineName,
            description,
            color,
            focusType,
            userId,
            exercises: {
                create: uniqueExerciseIds.map((globalExerciseId, order) => ({
                    globalExerciseId,
                    order,
                })),
            },
        },
        include: {
            exercises: {
                include: {
                    globalExercise: {
                        select: {
                            id: true,
                            name: true,
                            muscleGroup: true,
                        },
                    },
                },
                orderBy: { order: "asc" },
            },
        },
    });
}

export async function deleteRoutine(routineId: string) {
    const { id: userId } = await requireAuth();
    const routine = await prisma.workoutRoutine.findFirst({
        where: { id: routineId, userId },
        select: { id: true },
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
