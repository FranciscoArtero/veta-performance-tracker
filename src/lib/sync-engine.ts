import { getAllPendingOps, deletePendingOp } from "./offline-db";
import { toggleHabitLog } from "@/app/actions/habits";
import { toggleTask, createTask, deleteTask } from "@/app/actions/tasks";
import { createRoutine, deleteRoutine, logWorkout } from "@/app/actions/gym";

/**
 * Replay all queued offline operations against the server.
 * Returns { synced, failed } counts.
 */
export async function flushPendingOps(): Promise<{ synced: number; failed: number }> {
    const ops = await getAllPendingOps();
    let synced = 0;
    let failed = 0;

    for (const op of ops) {
        try {
            switch (op.type) {
                case "TOGGLE_HABIT":
                    await toggleHabitLog(op.payload.habitId, op.payload.dateISO);
                    break;
                case "TOGGLE_TASK":
                    await toggleTask(op.payload.taskId);
                    break;
                case "CREATE_TASK":
                    await createTask(op.payload.title, op.payload.dateISO);
                    break;
                case "DELETE_TASK":
                    await deleteTask(op.payload.taskId);
                    break;
                case "CREATE_ROUTINE":
                    await createRoutine(
                        op.payload.name,
                        op.payload.description || null,
                        op.payload.color,
                        JSON.parse(op.payload.exercises || "[]"),
                    );
                    break;
                case "DELETE_ROUTINE":
                    await deleteRoutine(op.payload.routineId);
                    break;
                case "LOG_WORKOUT":
                    await logWorkout({
                        routineId: op.payload.routineId,
                        dateISO: op.payload.dateISO,
                        rpe: op.payload.rpe ? Number(op.payload.rpe) : undefined,
                        notes: op.payload.notes || undefined,
                        sets: JSON.parse(op.payload.sets || "[]"),
                    });
                    break;
            }
            await deletePendingOp(op.id);
            synced++;
        } catch (err) {
            console.warn("[SyncEngine] Failed to sync op:", op.id, err);
            failed++;
        }
    }

    console.log(`[SyncEngine] Flush complete: ${synced} synced, ${failed} failed`);
    return { synced, failed };
}

