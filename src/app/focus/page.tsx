import FocusClient from "@/components/focus/FocusClient";
import type { Metadata } from "next";
import { getTodayTasks } from "@/app/actions/tasks";

export const metadata: Metadata = {
    title: "Focus | CORE OS",
    description: "Deep work sanctuary",
};

export default async function FocusPage() {
    const tasks = await getTodayTasks();

    return (
        <FocusClient
            initialTasks={tasks.map((t) => ({
                id: t.id,
                title: t.title,
                completed: t.completed,
            }))}
        />
    );
}
