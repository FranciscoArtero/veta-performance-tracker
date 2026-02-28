"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

/**
 * Upsert mood and motivation for a given day, with optional notes.
 */
export async function upsertMentalState(
    userId: string,
    dateISO: string,
    mood: number,
    motivation: number,
    notes?: string | null
) {
    console.log("[upsertMentalState] userId:", userId, "date:", dateISO, "mood:", mood, "motivation:", motivation, "notes:", notes);
    const date = new Date(dateISO);
    const dateOnly = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    );

    const updateData: { mood: number; motivation: number; notes?: string | null } = { mood, motivation };
    const createData: { userId: string; date: Date; mood: number; motivation: number; notes?: string | null } = { userId, date: dateOnly, mood, motivation };

    if (notes !== undefined) {
        updateData.notes = notes;
        createData.notes = notes;
    }

    await prisma.mentalState.upsert({
        where: {
            userId_date: {
                userId,
                date: dateOnly,
            },
        },
        update: updateData,
        create: createData,
    });

    console.log("[upsertMentalState] Saved successfully");
    revalidatePath("/");
}

/**
 * Get the last 7 days of mental state data.
 */
export async function getMentalStateWeek(userId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const startDate = new Date(
        Date.UTC(
            sevenDaysAgo.getFullYear(),
            sevenDaysAgo.getMonth(),
            sevenDaysAgo.getDate()
        )
    );

    const states = await prisma.mentalState.findMany({
        where: {
            userId,
            date: { gte: startDate },
        },
        orderBy: { date: "asc" },
    });

    // Build a 7-day array with day labels
    const dayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
    const result = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        const state = states.find((s) => {
            const sd = new Date(s.date);
            return (
                `${sd.getUTCFullYear()}-${String(sd.getUTCMonth() + 1).padStart(2, "0")}-${String(sd.getUTCDate()).padStart(2, "0")}` ===
                dateStr
            );
        });
        result.push({
            day: dayLabels[d.getDay()],
            mood: state?.mood ?? 0,
            motivation: state?.motivation ?? 0,
        });
    }

    return result;
}

/**
 * Get today's mental state for the sliders.
 */
export async function getTodayMentalState(userId: string) {
    const now = new Date();
    const today = new Date(
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
    );

    const state = await prisma.mentalState.findUnique({
        where: {
            userId_date: {
                userId,
                date: today,
            },
        },
    });

    return state ? { mood: state.mood, motivation: state.motivation } : null;
}
