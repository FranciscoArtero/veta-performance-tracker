"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import bcrypt from "bcryptjs";

/**
 * Get user profile data.
 */
export async function getProfile() {
    const { id } = await requireAuth();
    const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, email: true, timezone: true, createdAt: true },
    });
    if (!user) throw new Error("User not found");
    return user;
}

/**
 * Change the user's password. Validates the current password with bcrypt.
 */
export async function changePassword(currentPassword: string, newPassword: string) {
    const { id } = await requireAuth();

    if (newPassword.length < 6) {
        return { error: "La nueva contraseña debe tener al menos 6 caracteres" };
    }

    const user = await prisma.user.findUnique({
        where: { id },
        select: { password: true },
    });

    if (!user?.password) {
        return { error: "No se puede cambiar la contraseña de esta cuenta" };
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
        return { error: "La contraseña actual es incorrecta" };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
    });

    return { success: true };
}

/**
 * Update user timezone.
 */
export async function updateTimezone(timezone: string) {
    const { id } = await requireAuth();
    await prisma.user.update({
        where: { id },
        data: { timezone },
    });
    return { success: true };
}

/**
 * Update user profile name.
 */
export async function updateName(name: string) {
    const { id } = await requireAuth();
    await prisma.user.update({
        where: { id },
        data: { name },
    });
    return { success: true };
}
