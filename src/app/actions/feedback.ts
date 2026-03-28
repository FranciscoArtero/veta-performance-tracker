"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function submitFeedback(message: string) {
    try {
        const { id } = await requireAuth();
        if (!id) {
            return { success: false, error: "No autorizado" };
        }

        if (!message || message.trim() === "") {
            return { success: false, error: "El mensaje no puede estar vacío" };
        }

        await prisma.feedback.create({
            data: {
                userId: id,
                message: message.trim(),
            },
        });

        return { success: true };
    } catch (error) {
        console.error("Error al enviar feedback:", error);
        return { success: false, error: "Ocurrió un error al enviar el feedback. Por favor, intentá de nuevo más tarde." };
    }
}

export async function getFeedbacks() {
    const { id } = await requireAuth();
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.role !== "ADMIN") {
        throw new Error("No autorizado");
    }

    const feedbacks = await prisma.feedback.findMany({
        include: {
            user: {
                select: {
                    name: true,
                    email: true,
                    image: true,
                },
            },
        },
        orderBy: {
            createdAt: "desc",
        },
    });

    return feedbacks;
}

export async function markFeedbackAsRead(feedbackId: string) {
    try {
        const { id } = await requireAuth();
        const user = await prisma.user.findUnique({ where: { id } });
        if (!user || user.role !== "ADMIN") {
            return { success: false, error: "No autorizado" };
        }

        await prisma.feedback.update({
            where: { id: feedbackId },
            data: { read: true },
        });

        revalidatePath("/admin/feedback");
        return { success: true };
    } catch (error) {
        console.error("Error al marcar feedback como leído:", error);
        return { success: false, error: "Ocurrió un error." };
    }
}
