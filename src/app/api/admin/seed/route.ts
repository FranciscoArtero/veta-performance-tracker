import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/admin/seed
 * One-time seed: Set admin@mail.com as ADMIN.
 * This endpoint should be removed after use.
 */
export async function GET() {
    try {
        const user = await prisma.user.findUnique({
            where: { email: "admin@mail.com" },
            select: { id: true, role: true },
        });

        if (!user) {
            return NextResponse.json({ error: "Usuario admin@mail.com no encontrado" }, { status: 404 });
        }

        if (user.role === "ADMIN") {
            return NextResponse.json({ message: "admin@mail.com ya es ADMIN" });
        }

        // Also demote any other admins
        await prisma.user.updateMany({
            where: { role: "ADMIN" },
            data: { role: "USER" },
        });

        await prisma.user.update({
            where: { email: "admin@mail.com" },
            data: { role: "ADMIN" },
        });

        return NextResponse.json({
            success: true,
            message: "admin@mail.com ahora es ADMIN. Los demás usuarios fueron bajados a USER. Logueate con admin@mail.com para acceder al panel.",
        });
    } catch (error) {
        console.error("[Seed] Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
