import { getAllPendingOps, deletePendingOp } from "./offline-db";
import { toggleHabitLog } from "@/app/actions/habits";
import { toggleTask, createTask, deleteTask } from "@/app/actions/tasks";

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
            }
            await deletePendingOp(op.id);
            synced++;
        } catch (err) {
            console.warn("[SyncEngine] Failed to sync op:", op.id, err);
            failed++;
            // Leave the op in the queue for next attempt
        }
    }

    console.log(`[SyncEngine] Flush complete: ${synced} synced, ${failed} failed`);
    return { synced, failed };
}
