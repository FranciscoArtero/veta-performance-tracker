"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

/**
 * Get all users (admin only).
 */
export async function getUsers() {
    await requireAdmin();
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            mustChangePassword: true,
            createdAt: true,
        },
        orderBy: { createdAt: "asc" },
    });
    return users;
}

/**
 * Toggle user active/inactive (admin only).
 * Cannot deactivate yourself.
 */
export async function toggleUserActive(userId: string) {
    const admin = await requireAdmin();

    // Prevent self-deactivation
    if (admin.id === userId) {
        return { error: "No podés desactivarte a vos mismo" };
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { isActive: true },
    });

    if (!user) return { error: "Usuario no encontrado" };

    await prisma.user.update({
        where: { id: userId },
        data: { isActive: !user.isActive },
    });

    revalidatePath("/admin");
    return { success: true, isActive: !user.isActive };
}

/**
 * Reset a user's password to "1234" and flag mustChangePassword (admin only).
 * Cannot reset your own password this way.
 */
export async function resetUserPassword(userId: string) {
    const admin = await requireAdmin();

    if (admin.id === userId) {
        return { error: "No podés resetear tu propia contraseña desde acá" };
    }

    const hashedPassword = await bcrypt.hash("1234", 12);

    await prisma.user.update({
        where: { id: userId },
        data: {
            password: hashedPassword,
            mustChangePassword: true,
        },
    });

    revalidatePath("/admin");
    return { success: true };
}
