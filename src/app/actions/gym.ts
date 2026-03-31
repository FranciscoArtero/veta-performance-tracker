"use server";

import { type FocusType } from "@prisma/client";
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
let globalExercisesTableExistsPromise: Promise<boolean> | null = null;

function isLegacySchemaError(error: unknown) {
    if (typeof error !== "object" || error === null) return false;
    const prismaError = error as { code?: string; message?: string };
    if (prismaError.code === "P2021" || prismaError.code === "P2022") return true;
    const message = (prismaError.message || "").toLowerCase();
    return (
        message.includes("global_exercises") &&
        (message.includes("does not exist") || message.includes("not available"))
    );
}

async function ensureGlobalExercisesTableExists() {
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "global_exercises" (
                "id" TEXT PRIMARY KEY,
                "userId" TEXT NOT NULL,
                "name" TEXT NOT NULL,
                "muscleGroup" TEXT NOT NULL DEFAULT 'general',
                "currentWeightGoal" DOUBLE PRECISION,
                "goalDate" DATE,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await prisma.$executeRawUnsafe(`
            CREATE INDEX IF NOT EXISTS "global_exercises_userId_idx"
            ON "global_exercises" ("userId")
        `);

        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "global_exercises_userId_name_key"
            ON "global_exercises" ("userId", "name")
        `);

        globalExercisesTableExistsPromise = Promise.resolve(true);
        return true;
    } catch {
        return false;
    }
}

async function hasGlobalExercisesTable(createIfMissing = false) {
    if (!globalExercisesTableExistsPromise) {
        globalExercisesTableExistsPromise = prisma
            .$queryRaw<{ exists: boolean }[]>`
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND table_name = 'global_exercises'
                ) AS "exists"
            `
            .then((rows) => Boolean(rows?.[0]?.exists))
            .catch(() => false);
    }
    const exists = await globalExercisesTableExistsPromise;
    if (exists) return true;
    if (!createIfMissing) return false;
    return ensureGlobalExercisesTableExists();
}

function toLegacyExerciseId(name: string, muscleGroup: string) {
    return `legacy:${encodeURIComponent(name)}:${encodeURIComponent(muscleGroup)}`;
}

function fromLegacyExerciseId(value: string) {
    if (!value.startsWith("legacy:")) return null;
    const parts = value.split(":");
    if (parts.length < 3) return null;
    const encodedName = parts[1] || "";
    const encodedGroup = parts.slice(2).join(":");
    return {
        name: decodeURIComponent(encodedName),
        muscleGroup: decodeURIComponent(encodedGroup),
    };
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
    if (!(await hasGlobalExercisesTable())) return;

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
    if (!(await hasGlobalExercisesTable())) return;

    if (!integrityRepairPromise) {
        integrityRepairPromise = repairLegacyExerciseReferences().finally(() => {
            integrityRepairPromise = null;
        });
    }
    await integrityRepairPromise;
}

async function getLegacyExerciseCatalog(userId: string) {
    let rows: {
        name: string;
        muscleGroup: string;
        exerciseCount: number;
    }[] = [];

    try {
        rows = await prisma.$queryRaw<
            {
                name: string;
                muscleGroup: string;
                exerciseCount: number;
            }[]
        >`
            SELECT
                COALESCE(NULLIF(TRIM(e."name"), ''), CONCAT('Ejercicio ', RIGHT(e.id, 6))) AS "name",
                COALESCE(NULLIF(TRIM(e."category"), ''), ${DEFAULT_MUSCLE_GROUP}) AS "muscleGroup",
                COUNT(e.id)::int AS "exerciseCount"
            FROM "exercises" e
            INNER JOIN "workout_routines" wr ON wr.id = e."routineId"
            WHERE wr."userId" = ${userId}
            GROUP BY 1, 2
            ORDER BY 1 ASC
        `;
    } catch {
        rows = await prisma.$queryRaw<
            {
                name: string;
                muscleGroup: string;
                exerciseCount: number;
            }[]
        >`
            SELECT
                CONCAT('Ejercicio ', RIGHT(e.id, 6)) AS "name",
                ${DEFAULT_MUSCLE_GROUP}::text AS "muscleGroup",
                COUNT(e.id)::int AS "exerciseCount"
            FROM "exercises" e
            INNER JOIN "workout_routines" wr ON wr.id = e."routineId"
            WHERE wr."userId" = ${userId}
            GROUP BY 1, 2
            ORDER BY 1 ASC
        `;
    }

    return rows.map((row) => {
        const name = normalizeExerciseName(row.name);
        const muscleGroup = normalizeMuscleGroup(row.muscleGroup);

        return {
            id: toLegacyExerciseId(name, muscleGroup),
            userId,
            name,
            muscleGroup,
            currentWeightGoal: null,
            goalDate: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            _count: { exercises: Number(row.exerciseCount || 0) },
        };
    });
}

export async function getGlobalExercises() {
    const { id: userId } = await requireAuth();
    if (!(await hasGlobalExercisesTable())) {
        return getLegacyExerciseCatalog(userId);
    }

    try {
        return await prisma.globalExercise.findMany({
            where: { userId },
            include: {
                _count: { select: { exercises: true } },
            },
            orderBy: [{ name: "asc" }],
        });
    } catch (error) {
        if (!isLegacySchemaError(error)) throw error;

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
    if (!(await hasGlobalExercisesTable(true))) {
        return {
            id: toLegacyExerciseId(normalizedName, normalizedMuscleGroup),
            userId,
            name: normalizedName,
            muscleGroup: normalizedMuscleGroup,
            currentWeightGoal,
            goalDate,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
    }

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
        if (!isLegacySchemaError(error)) throw error;

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
        if (!isLegacySchemaError(error)) throw error;
        return null;
    }
}

export async function deleteGlobalExercise(globalExerciseId: string) {
    const { id: userId } = await requireAuth();
    const safeId = globalExerciseId.trim();
    if (!safeId) throw new Error("Ejercicio no valido");

    if (!(await hasGlobalExercisesTable())) {
        const parsed = fromLegacyExerciseId(safeId);
        if (!parsed) {
            throw new Error(
                "No se pudo eliminar en modo legacy. Abre la rutina y quita el ejercicio manualmente."
            );
        }

        try {
            await prisma.$executeRaw`
                DELETE FROM "exercise_sets" es
                USING "exercises" e, "workout_routines" wr
                WHERE es."exerciseId" = e.id
                  AND e."routineId" = wr.id
                  AND wr."userId" = ${userId}
                  AND LOWER(TRIM(COALESCE(e."name", ''))) = LOWER(${parsed.name})
                  AND LOWER(TRIM(COALESCE(e."category", ''))) = LOWER(${parsed.muscleGroup})
            `;

            await prisma.$executeRaw`
                DELETE FROM "exercises" e
                USING "workout_routines" wr
                WHERE e."routineId" = wr.id
                  AND wr."userId" = ${userId}
                  AND LOWER(TRIM(COALESCE(e."name", ''))) = LOWER(${parsed.name})
                  AND LOWER(TRIM(COALESCE(e."category", ''))) = LOWER(${parsed.muscleGroup})
            `;
            return;
        } catch {
            throw new Error(
                "No se pudo eliminar este ejercicio en la estructura actual. Intenta primero quitarlo de tus rutinas."
            );
        }
    }

    try {
        const deleted = await prisma.globalExercise.deleteMany({
            where: {
                id: safeId,
                userId,
            },
        });

        if (deleted.count === 0) {
            throw new Error("Ejercicio no encontrado");
        }
    } catch (error) {
        if (!isLegacySchemaError(error)) throw error;

        // Legacy schema with table but no userId column.
        const deleted = await prisma.globalExercise.deleteMany({
            where: { id: safeId },
        });
        if (deleted.count === 0) throw new Error("Ejercicio no encontrado");
    }
}

async function getLegacyRoutines(userId: string) {
    let rows: {
        routineId: string;
        routineName: string;
        description: string | null;
        color: string;
        focusType: string | null;
        createdAt: Date;
        logsCount: number;
        exerciseId: string | null;
        exerciseOrder: number | null;
        exerciseName: string | null;
        exerciseMuscleGroup: string | null;
    }[] = [];

    try {
        rows = await prisma.$queryRaw<
            {
                routineId: string;
                routineName: string;
                description: string | null;
                color: string;
                focusType: string | null;
                createdAt: Date;
                logsCount: number;
                exerciseId: string | null;
                exerciseOrder: number | null;
                exerciseName: string | null;
                exerciseMuscleGroup: string | null;
            }[]
        >`
            SELECT
                wr.id AS "routineId",
                wr."name" AS "routineName",
                wr."description",
                wr."color",
                wr."focusType"::text AS "focusType",
                wr."createdAt",
                COALESCE(logs."logsCount", 0)::int AS "logsCount",
                e.id AS "exerciseId",
                e."order"::int AS "exerciseOrder",
                COALESCE(NULLIF(TRIM(e."name"), ''), CONCAT('Ejercicio ', RIGHT(e.id, 6))) AS "exerciseName",
                COALESCE(NULLIF(TRIM(e."category"), ''), ${DEFAULT_MUSCLE_GROUP}) AS "exerciseMuscleGroup"
            FROM "workout_routines" wr
            LEFT JOIN (
                SELECT "routineId", COUNT(*)::int AS "logsCount"
                FROM "workout_logs"
                WHERE "userId" = ${userId}
                GROUP BY "routineId"
            ) logs ON logs."routineId" = wr.id
            LEFT JOIN "exercises" e ON e."routineId" = wr.id
            WHERE wr."userId" = ${userId}
            ORDER BY wr."createdAt" DESC, e."order" ASC
        `;
    } catch {
        rows = await prisma.$queryRaw<
            {
                routineId: string;
                routineName: string;
                description: string | null;
                color: string;
                focusType: string | null;
                createdAt: Date;
                logsCount: number;
                exerciseId: string | null;
                exerciseOrder: number | null;
                exerciseName: string | null;
                exerciseMuscleGroup: string | null;
            }[]
        >`
            SELECT
                wr.id AS "routineId",
                wr."name" AS "routineName",
                wr."description",
                wr."color",
                ${DEFAULT_FOCUS_TYPE}::text AS "focusType",
                wr."createdAt",
                COALESCE(logs."logsCount", 0)::int AS "logsCount",
                e.id AS "exerciseId",
                e."order"::int AS "exerciseOrder",
                CONCAT('Ejercicio ', RIGHT(e.id, 6)) AS "exerciseName",
                ${DEFAULT_MUSCLE_GROUP}::text AS "exerciseMuscleGroup"
            FROM "workout_routines" wr
            LEFT JOIN (
                SELECT "routineId", COUNT(*)::int AS "logsCount"
                FROM "workout_logs"
                WHERE "userId" = ${userId}
                GROUP BY "routineId"
            ) logs ON logs."routineId" = wr.id
            LEFT JOIN "exercises" e ON e."routineId" = wr.id
            WHERE wr."userId" = ${userId}
            ORDER BY wr."createdAt" DESC, e."order" ASC
        `;
    }

    const grouped = new Map<
        string,
        {
            id: string;
            name: string;
            description: string | null;
            color: string;
            focusType: FocusType;
            exercises: {
                id: string;
                order: number;
                globalExercise: {
                    id: string;
                    name: string;
                    muscleGroup: string;
                };
            }[];
            _count: { logs: number };
            createdAt: Date;
        }
    >();

    for (const row of rows) {
        if (!grouped.has(row.routineId)) {
            const normalizedFocus = String(row.focusType || DEFAULT_FOCUS_TYPE).toUpperCase();
            const focusType: FocusType =
                normalizedFocus === "STRENGTH" ||
                normalizedFocus === "HYPERTROPHY" ||
                normalizedFocus === "ENDURANCE"
                    ? (normalizedFocus as FocusType)
                    : DEFAULT_FOCUS_TYPE;

            grouped.set(row.routineId, {
                id: row.routineId,
                name: row.routineName,
                description: row.description,
                color: row.color,
                focusType,
                exercises: [],
                _count: { logs: Number(row.logsCount || 0) },
                createdAt: new Date(row.createdAt),
            });
        }

        if (row.exerciseId) {
            const name = normalizeExerciseName(
                row.exerciseName || `Ejercicio ${row.exerciseId.slice(-6)}`
            );
            const muscleGroup = normalizeMuscleGroup(row.exerciseMuscleGroup || DEFAULT_MUSCLE_GROUP);
            grouped.get(row.routineId)!.exercises.push({
                id: row.exerciseId,
                order: Number(row.exerciseOrder || 0),
                globalExercise: {
                    id: toLegacyExerciseId(name, muscleGroup),
                    name,
                    muscleGroup,
                },
            });
        }
    }

    return Array.from(grouped.values()).sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
}

async function getLegacyWorkoutLogs(userId: string, limit: number) {
    let rows: {
        logId: string;
        date: Date;
        rpe: number | null;
        durationMinutes: number | null;
        routineName: string;
        routineColor: string;
        setId: string | null;
        setNumber: number | null;
        reps: number | null;
        weight: number | null;
        exerciseId: string | null;
        exerciseName: string | null;
        exerciseMuscleGroup: string | null;
    }[] = [];

    try {
        rows = await prisma.$queryRaw<
            {
                logId: string;
                date: Date;
                rpe: number | null;
                durationMinutes: number | null;
                routineName: string;
                routineColor: string;
                setId: string | null;
                setNumber: number | null;
                reps: number | null;
                weight: number | null;
                exerciseId: string | null;
                exerciseName: string | null;
                exerciseMuscleGroup: string | null;
            }[]
        >`
            WITH limited_logs AS (
                SELECT
                    wl.id,
                    wl.date,
                    wl.rpe,
                    wl."durationMinutes",
                    wr."name" AS "routineName",
                    wr."color" AS "routineColor"
                FROM "workout_logs" wl
                INNER JOIN "workout_routines" wr ON wr.id = wl."routineId"
                WHERE wl."userId" = ${userId}
                ORDER BY wl.date DESC
                LIMIT ${limit}
            )
            SELECT
                l.id AS "logId",
                l.date,
                l.rpe,
                l."durationMinutes" AS "durationMinutes",
                l."routineName" AS "routineName",
                l."routineColor" AS "routineColor",
                es.id AS "setId",
                es."setNumber"::int AS "setNumber",
                es.reps,
                es.weight,
                e.id AS "exerciseId",
                COALESCE(NULLIF(TRIM(e."name"), ''), CONCAT('Ejercicio ', RIGHT(e.id, 6))) AS "exerciseName",
                COALESCE(NULLIF(TRIM(e."category"), ''), ${DEFAULT_MUSCLE_GROUP}) AS "exerciseMuscleGroup"
            FROM limited_logs l
            LEFT JOIN "exercise_sets" es ON es."workoutLogId" = l.id
            LEFT JOIN "exercises" e ON e.id = es."exerciseId"
            ORDER BY l.date DESC, es."setNumber" ASC
        `;
    } catch {
        rows = await prisma.$queryRaw<
            {
                logId: string;
                date: Date;
                rpe: number | null;
                durationMinutes: number | null;
                routineName: string;
                routineColor: string;
                setId: string | null;
                setNumber: number | null;
                reps: number | null;
                weight: number | null;
                exerciseId: string | null;
                exerciseName: string | null;
                exerciseMuscleGroup: string | null;
            }[]
        >`
            WITH limited_logs AS (
                SELECT
                    wl.id,
                    wl.date,
                    wr."name" AS "routineName",
                    wr."color" AS "routineColor"
                FROM "workout_logs" wl
                INNER JOIN "workout_routines" wr ON wr.id = wl."routineId"
                WHERE wl."userId" = ${userId}
                ORDER BY wl.date DESC
                LIMIT ${limit}
            )
            SELECT
                l.id AS "logId",
                l.date,
                NULL::int AS rpe,
                NULL::int AS "durationMinutes",
                l."routineName" AS "routineName",
                l."routineColor" AS "routineColor",
                es.id AS "setId",
                es."setNumber"::int AS "setNumber",
                es.reps,
                es.weight,
                e.id AS "exerciseId",
                CONCAT('Ejercicio ', RIGHT(e.id, 6)) AS "exerciseName",
                ${DEFAULT_MUSCLE_GROUP}::text AS "exerciseMuscleGroup"
            FROM limited_logs l
            LEFT JOIN "exercise_sets" es ON es."workoutLogId" = l.id
            LEFT JOIN "exercises" e ON e.id = es."exerciseId"
            ORDER BY l.date DESC, es."setNumber" ASC
        `;
    }

    const logs = new Map<
        string,
        {
            id: string;
            date: Date;
            rpe: number | null;
            durationMinutes: number | null;
            routine: { name: string; color: string };
            sets: {
                id: string;
                setNumber: number;
                reps: number | null;
                weight: number | null;
                exercise: {
                    id: string;
                    globalExercise: {
                        id: string;
                        name: string;
                        muscleGroup: string;
                    };
                };
            }[];
        }
    >();

    for (const row of rows) {
        if (!logs.has(row.logId)) {
            logs.set(row.logId, {
                id: row.logId,
                date: new Date(row.date),
                rpe: row.rpe,
                durationMinutes: row.durationMinutes,
                routine: {
                    name: row.routineName,
                    color: row.routineColor,
                },
                sets: [],
            });
        }

        if (row.setId && row.exerciseId) {
            const name = normalizeExerciseName(
                row.exerciseName || `Ejercicio ${row.exerciseId.slice(-6)}`
            );
            const muscleGroup = normalizeMuscleGroup(row.exerciseMuscleGroup || DEFAULT_MUSCLE_GROUP);
            logs.get(row.logId)!.sets.push({
                id: row.setId,
                setNumber: Number(row.setNumber || 0),
                reps: row.reps,
                weight: row.weight,
                exercise: {
                    id: row.exerciseId,
                    globalExercise: {
                        id: toLegacyExerciseId(name, muscleGroup),
                        name,
                        muscleGroup,
                    },
                },
            });
        }
    }

    return Array.from(logs.values());
}

async function getLegacyExerciseProgressSummaries(
    userId: string,
    limit = 100,
    filters: ExerciseProgressFilters = {}
) {
    const filterExerciseId = filters.exerciseId?.trim() || null;
    const filterMuscleGroup =
        filters.muscleGroup && filters.muscleGroup !== "all"
            ? normalizeMuscleGroup(filters.muscleGroup)
            : null;

    let rows: {
        reps: number | null;
        weight: number | null;
        workoutLogId: string;
        workoutDate: Date;
        exerciseId: string;
        exerciseName: string;
        exerciseMuscleGroup: string;
    }[] = [];

    try {
        rows = await prisma.$queryRaw<
            {
                reps: number | null;
                weight: number | null;
                workoutLogId: string;
                workoutDate: Date;
                exerciseId: string;
                exerciseName: string;
                exerciseMuscleGroup: string;
            }[]
        >`
            SELECT
                es.reps,
                es.weight,
                wl.id AS "workoutLogId",
                wl.date AS "workoutDate",
                e.id AS "exerciseId",
                COALESCE(NULLIF(TRIM(e."name"), ''), CONCAT('Ejercicio ', RIGHT(e.id, 6))) AS "exerciseName",
                COALESCE(NULLIF(TRIM(e."category"), ''), ${DEFAULT_MUSCLE_GROUP}) AS "exerciseMuscleGroup"
            FROM "exercise_sets" es
            INNER JOIN "workout_logs" wl ON wl.id = es."workoutLogId"
            INNER JOIN "exercises" e ON e.id = es."exerciseId"
            WHERE wl."userId" = ${userId}
            ORDER BY wl.date DESC
        `;
    } catch {
        rows = await prisma.$queryRaw<
            {
                reps: number | null;
                weight: number | null;
                workoutLogId: string;
                workoutDate: Date;
                exerciseId: string;
                exerciseName: string;
                exerciseMuscleGroup: string;
            }[]
        >`
            SELECT
                es.reps,
                es.weight,
                wl.id AS "workoutLogId",
                wl.date AS "workoutDate",
                e.id AS "exerciseId",
                CONCAT('Ejercicio ', RIGHT(e.id, 6)) AS "exerciseName",
                ${DEFAULT_MUSCLE_GROUP}::text AS "exerciseMuscleGroup"
            FROM "exercise_sets" es
            INNER JOIN "workout_logs" wl ON wl.id = es."workoutLogId"
            INNER JOIN "exercises" e ON e.id = es."exerciseId"
            WHERE wl."userId" = ${userId}
            ORDER BY wl.date DESC
        `;
    }

    const byExercise = new Map<string, ExerciseSummaryAccumulator>();

    for (const row of rows) {
        const name = normalizeExerciseName(row.exerciseName);
        const muscleGroup = normalizeMuscleGroup(row.exerciseMuscleGroup);
        const legacyId = toLegacyExerciseId(name, muscleGroup);

        if (filterExerciseId && filterExerciseId !== legacyId) continue;
        if (filterMuscleGroup && muscleGroup !== filterMuscleGroup) continue;

        let summary = byExercise.get(legacyId);
        if (!summary) {
            summary = {
                id: legacyId,
                name,
                muscleGroup,
                currentWeightGoal: null,
                goalDate: null,
                lastTrainedAt: null,
                bestWeight: 0,
                bestEffectiveWeight: 0,
                lastWeight: null,
                sessionIds: new Set<string>(),
            };
            byExercise.set(legacyId, summary);
        }

        summary.sessionIds.add(row.workoutLogId);

        if (!summary.lastTrainedAt || row.workoutDate > summary.lastTrainedAt) {
            summary.lastTrainedAt = row.workoutDate;
            summary.lastWeight = row.weight ?? null;
        } else if (
            summary.lastWeight === null &&
            summary.lastTrainedAt &&
            row.workoutDate.getTime() === summary.lastTrainedAt.getTime()
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
            currentWeightGoal: null,
            goalDate: null,
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

async function getLegacyExerciseHistory(userId: string, globalExerciseId: string) {
    const requestedLegacy = fromLegacyExerciseId(globalExerciseId);

    let rows: {
        setId: string;
        setNumber: number;
        reps: number | null;
        weight: number | null;
        durationSec: number | null;
        workoutLogId: string;
        workoutDate: Date;
        routineId: string;
        routineName: string;
        routineColor: string;
        exerciseId: string;
        exerciseName: string;
        exerciseMuscleGroup: string;
    }[] = [];

    try {
        rows = await prisma.$queryRaw<
            {
                setId: string;
                setNumber: number;
                reps: number | null;
                weight: number | null;
                durationSec: number | null;
                workoutLogId: string;
                workoutDate: Date;
                routineId: string;
                routineName: string;
                routineColor: string;
                exerciseId: string;
                exerciseName: string;
                exerciseMuscleGroup: string;
            }[]
        >`
            SELECT
                es.id AS "setId",
                es."setNumber"::int AS "setNumber",
                es.reps,
                es.weight,
                es."durationSec",
                wl.id AS "workoutLogId",
                wl.date AS "workoutDate",
                wr.id AS "routineId",
                wr."name" AS "routineName",
                wr."color" AS "routineColor",
                e.id AS "exerciseId",
                COALESCE(NULLIF(TRIM(e."name"), ''), CONCAT('Ejercicio ', RIGHT(e.id, 6))) AS "exerciseName",
                COALESCE(NULLIF(TRIM(e."category"), ''), ${DEFAULT_MUSCLE_GROUP}) AS "exerciseMuscleGroup"
            FROM "exercise_sets" es
            INNER JOIN "workout_logs" wl ON wl.id = es."workoutLogId"
            INNER JOIN "workout_routines" wr ON wr.id = wl."routineId"
            INNER JOIN "exercises" e ON e.id = es."exerciseId"
            WHERE wl."userId" = ${userId}
            ORDER BY wl.date ASC, es."setNumber" ASC
        `;
    } catch {
        rows = await prisma.$queryRaw<
            {
                setId: string;
                setNumber: number;
                reps: number | null;
                weight: number | null;
                durationSec: number | null;
                workoutLogId: string;
                workoutDate: Date;
                routineId: string;
                routineName: string;
                routineColor: string;
                exerciseId: string;
                exerciseName: string;
                exerciseMuscleGroup: string;
            }[]
        >`
            SELECT
                es.id AS "setId",
                es."setNumber"::int AS "setNumber",
                es.reps,
                es.weight,
                es."durationSec",
                wl.id AS "workoutLogId",
                wl.date AS "workoutDate",
                wr.id AS "routineId",
                wr."name" AS "routineName",
                wr."color" AS "routineColor",
                e.id AS "exerciseId",
                CONCAT('Ejercicio ', RIGHT(e.id, 6)) AS "exerciseName",
                ${DEFAULT_MUSCLE_GROUP}::text AS "exerciseMuscleGroup"
            FROM "exercise_sets" es
            INNER JOIN "workout_logs" wl ON wl.id = es."workoutLogId"
            INNER JOIN "workout_routines" wr ON wr.id = wl."routineId"
            INNER JOIN "exercises" e ON e.id = es."exerciseId"
            WHERE wl."userId" = ${userId}
            ORDER BY wl.date ASC, es."setNumber" ASC
        `;
    }

    const matchingSets = rows.filter((row) => {
        const name = normalizeExerciseName(row.exerciseName);
        const muscleGroup = normalizeMuscleGroup(row.exerciseMuscleGroup);
        const legacyId = toLegacyExerciseId(name, muscleGroup);
        if (requestedLegacy) return legacyId === globalExerciseId;
        return row.exerciseId === globalExerciseId || legacyId === globalExerciseId;
    });

    if (matchingSets.length === 0) {
        throw new Error("Ejercicio no encontrado");
    }

    const firstSet = matchingSets[0];
    const exerciseName = normalizeExerciseName(firstSet.exerciseName);
    const exerciseMuscleGroup = normalizeMuscleGroup(firstSet.exerciseMuscleGroup);
    const exerciseId = toLegacyExerciseId(exerciseName, exerciseMuscleGroup);

    const timelineMap = new Map<
        string,
        { date: Date; effectiveWeight: number; weight: number; reps: number | null }
    >();

    for (const set of matchingSets) {
        if (typeof set.weight !== "number") continue;
        const key = toDateKey(set.workoutDate);
        const effectiveWeight = calcEffectiveWeight(set.weight, set.reps);
        const current = timelineMap.get(key);
        if (!current || effectiveWeight > current.effectiveWeight) {
            timelineMap.set(key, {
                date: set.workoutDate,
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

    const history = [...matchingSets]
        .sort((a, b) => {
            const byDate = b.workoutDate.getTime() - a.workoutDate.getTime();
            if (byDate !== 0) return byDate;
            return a.setNumber - b.setNumber;
        })
        .map((set) => ({
            id: set.setId,
            workoutLogId: set.workoutLogId,
            dateISO: toDateKey(set.workoutDate),
            routine: {
                id: set.routineId,
                name: set.routineName,
                color: set.routineColor,
            },
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
            id: exerciseId,
            name: exerciseName,
            muscleGroup: exerciseMuscleGroup,
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

// Queries

export async function getRoutines() {
    const { id: userId } = await requireAuth();
    await ensureLegacyExerciseIntegrity();
    try {
        return await prisma.workoutRoutine.findMany({
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
    } catch (error) {
        if (!isLegacySchemaError(error)) throw error;
        return getLegacyRoutines(userId);
    }
}

export async function getWorkoutLogs(limit = 20) {
    const { id: userId } = await requireAuth();
    await ensureLegacyExerciseIntegrity();
    try {
        return await prisma.workoutLog.findMany({
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
    } catch (error) {
        if (!isLegacySchemaError(error)) throw error;
        return getLegacyWorkoutLogs(userId, limit);
    }
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

    let sets: {
        reps: number | null;
        weight: number | null;
        workoutLog: { id: string; date: Date };
        exercise: {
            globalExercise: { id: string; name: string; muscleGroup: string };
        };
    }[];

    try {
        sets = await prisma.exerciseSet.findMany({
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
    } catch (error) {
        if (!isLegacySchemaError(error)) throw error;
        return getLegacyExerciseProgressSummaries(userId, limit, filters);
    }

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

    let exercise: {
        id: string;
        name: string;
        muscleGroup: string;
    } | null = null;

    try {
        exercise = await prisma.globalExercise.findFirst({
            where: { id: safeId },
            select: {
                id: true,
                name: true,
                muscleGroup: true,
            },
        });
    } catch (error) {
        if (!isLegacySchemaError(error)) throw error;
        return getLegacyExerciseHistory(userId, safeId);
    }

    if (!exercise) throw new Error("Ejercicio no encontrado");

    let sets: {
        id: string;
        setNumber: number;
        reps: number | null;
        weight: number | null;
        durationSec: number | null;
        workoutLog: {
            id: string;
            date: Date;
            routine: { id: string; name: string; color: string };
        };
    }[];

    try {
        sets = await prisma.exerciseSet.findMany({
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
    } catch (error) {
        if (!isLegacySchemaError(error)) throw error;
        return getLegacyExerciseHistory(userId, safeId);
    }

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

    if (!(await hasGlobalExercisesTable())) {
        const routineId = `legacy_routine_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const now = new Date();

        try {
            await prisma.$executeRaw`
                INSERT INTO "workout_routines"
                    ("id", "name", "description", "color", "focusType", "userId", "createdAt", "updatedAt")
                VALUES
                    (${routineId}, ${routineName}, ${description}, ${color}, ${focusType}, ${userId}, ${now}, ${now})
            `;
        } catch (errorWithFocus) {
            if (!isLegacySchemaError(errorWithFocus)) throw errorWithFocus;
            try {
                await prisma.$executeRaw`
                    INSERT INTO "workout_routines"
                        ("id", "name", "description", "color", "userId", "createdAt", "updatedAt")
                    VALUES
                        (${routineId}, ${routineName}, ${description}, ${color}, ${userId}, ${now}, ${now})
                `;
            } catch (errorNoFocus) {
                if (!isLegacySchemaError(errorNoFocus)) throw errorNoFocus;
                await prisma.$executeRaw`
                    INSERT INTO "workout_routines"
                        ("id", "name", "description", "color", "userId", "createdAt")
                    VALUES
                        (${routineId}, ${routineName}, ${description}, ${color}, ${userId}, ${now})
                `;
            }
        }

        const createdExercises: {
            id: string;
            order: number;
            globalExerciseId: string;
        }[] = [];

        for (let order = 0; order < uniqueExerciseIds.length; order += 1) {
            const requestedId = uniqueExerciseIds[order];
            const exerciseId = `legacy_ex_${Date.now()}_${order}_${Math.random().toString(36).slice(2, 7)}`;
            const parsed = fromLegacyExerciseId(requestedId);
            const name = normalizeExerciseName(parsed?.name || `Ejercicio ${order + 1}`);
            const muscleGroup = normalizeMuscleGroup(parsed?.muscleGroup || DEFAULT_MUSCLE_GROUP);
            const globalExerciseId = toLegacyExerciseId(name, muscleGroup);

            try {
                await prisma.$executeRaw`
                    INSERT INTO "exercises"
                        ("id", "order", "routineId", "globalExerciseId", "name", "category", "createdAt")
                    VALUES
                        (${exerciseId}, ${order}, ${routineId}, ${globalExerciseId}, ${name}, ${muscleGroup}, ${now})
                `;
            } catch (errorWithAllColumns) {
                if (!isLegacySchemaError(errorWithAllColumns)) throw errorWithAllColumns;
                try {
                    await prisma.$executeRaw`
                        INSERT INTO "exercises"
                            ("id", "order", "routineId", "globalExerciseId", "createdAt")
                        VALUES
                            (${exerciseId}, ${order}, ${routineId}, ${globalExerciseId}, ${now})
                    `;
                } catch (errorOnlyGlobal) {
                    if (!isLegacySchemaError(errorOnlyGlobal)) throw errorOnlyGlobal;
                    await prisma.$executeRaw`
                        INSERT INTO "exercises"
                            ("id", "order", "routineId", "name", "category", "createdAt")
                        VALUES
                            (${exerciseId}, ${order}, ${routineId}, ${name}, ${muscleGroup}, ${now})
                    `;
                }
            }

            createdExercises.push({
                id: exerciseId,
                order,
                globalExerciseId,
            });
        }

        return {
            id: routineId,
            name: routineName,
            description,
            color,
            focusType,
            userId,
            createdAt: now,
            updatedAt: now,
            exercises: createdExercises.map((exercise) => {
                const fallback = fromLegacyExerciseId(exercise.globalExerciseId);
                const name = normalizeExerciseName(
                    fallback?.name || `Ejercicio ${exercise.id.slice(-6)}`
                );
                const muscleGroup = normalizeMuscleGroup(
                    fallback?.muscleGroup || DEFAULT_MUSCLE_GROUP
                );
                return {
                    id: exercise.id,
                    order: exercise.order,
                    globalExercise: {
                        id: toLegacyExerciseId(name, muscleGroup),
                        name,
                        muscleGroup,
                    },
                };
            }),
            _count: { logs: 0 },
        };
    }

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
        if (!isLegacySchemaError(error)) throw error;
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
    const safeRoutineId = routineId.trim();
    if (!safeRoutineId) throw new Error("Rutina no valida");

    const routineByUser = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id
        FROM "workout_routines"
        WHERE id = ${safeRoutineId}
          AND "userId" = ${userId}
        LIMIT 1
    `.catch(() => []);

    if (routineByUser.length === 0) {
        const fallbackById = await prisma.$queryRaw<{ id: string }[]>`
            SELECT id
            FROM "workout_routines"
            WHERE id = ${safeRoutineId}
            LIMIT 1
        `.catch(() => []);

        if (fallbackById.length === 0) {
            throw new Error("Rutina no encontrada");
        }
    }

    // Defensive cleanup to support legacy schemas where FK cascades are missing.
    await prisma.$executeRaw`
        DELETE FROM "exercise_sets" es
        USING "workout_logs" wl
        WHERE es."workoutLogId" = wl.id
          AND wl."routineId" = ${safeRoutineId}
    `.catch(() => 0);

    await prisma.$executeRaw`
        DELETE FROM "exercise_sets" es
        USING "exercises" e
        WHERE es."exerciseId" = e.id
          AND e."routineId" = ${safeRoutineId}
    `.catch(() => 0);

    await prisma.$executeRaw`
        DELETE FROM "workout_logs"
        WHERE "routineId" = ${safeRoutineId}
          AND "userId" = ${userId}
    `.catch(async () => {
        await prisma.$executeRaw`
            DELETE FROM "workout_logs"
            WHERE "routineId" = ${safeRoutineId}
        `;
    });

    await prisma.$executeRaw`
        DELETE FROM "exercises"
        WHERE "routineId" = ${safeRoutineId}
    `.catch(() => 0);

    const deletedWithUser = await prisma.$executeRaw`
        DELETE FROM "workout_routines"
        WHERE id = ${safeRoutineId}
          AND "userId" = ${userId}
    `.catch(() => 0);

    if (Number(deletedWithUser || 0) > 0) return;

    const deletedById = await prisma.$executeRaw`
        DELETE FROM "workout_routines"
        WHERE id = ${safeRoutineId}
    `.catch(() => 0);

    if (Number(deletedById || 0) === 0) {
        throw new Error("No se pudo eliminar la rutina");
    }
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
