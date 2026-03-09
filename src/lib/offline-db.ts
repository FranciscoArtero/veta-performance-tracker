import { openDB, type DBSchema, type IDBPDatabase } from "idb";

// ─── Schema ───────────────────────────────────────────────────
interface CoreOfflineDB extends DBSchema {
    pendingOps: {
        key: string;
        value: {
            id: string;
            type: "TOGGLE_HABIT" | "TOGGLE_TASK" | "CREATE_TASK" | "DELETE_TASK" | "CREATE_ROUTINE" | "DELETE_ROUTINE" | "LOG_WORKOUT";
            payload: Record<string, string>;
            timestamp: number;
        };
        indexes: { "by-timestamp": number };
    };
}

// ─── Singleton ────────────────────────────────────────────────
let dbPromise: Promise<IDBPDatabase<CoreOfflineDB>> | null = null;

function getDB() {
    if (!dbPromise) {
        dbPromise = openDB<CoreOfflineDB>("core-offline", 1, {
            upgrade(db) {
                const store = db.createObjectStore("pendingOps", { keyPath: "id" });
                store.createIndex("by-timestamp", "timestamp");
            },
        });
    }
    return dbPromise;
}

// ─── Helpers ──────────────────────────────────────────────────
export async function addPendingOp(
    type: CoreOfflineDB["pendingOps"]["value"]["type"],
    payload: Record<string, string>,
) {
    const db = await getDB();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.put("pendingOps", { id, type, payload, timestamp: Date.now() });
    return id;
}

export async function getAllPendingOps() {
    const db = await getDB();
    return db.getAllFromIndex("pendingOps", "by-timestamp");
}

export async function deletePendingOp(id: string) {
    const db = await getDB();
    await db.delete("pendingOps", id);
}

export async function getPendingCount() {
    const db = await getDB();
    return db.count("pendingOps");
}

export async function clearAllPending() {
    const db = await getDB();
    await db.clear("pendingOps");
}
