import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function handlePromote() {
    try {
        const session = await getAuthSession();
        if (!session?.user || !(session.user as { id?: string }).id) {
            return NextResponse.json({ error: "No autenticado. Logueate primero." }, { status: 401 });
        }

        const userId = (session.user as { id: string }).id;

        // Check if any admin already exists
        const existingAdmin = await prisma.user.findFirst({
            where: { role: "ADMIN" },
            select: { id: true },
        });

        if (existingAdmin) {
            return NextResponse.json(
                { error: "Ya existe un administrador. Contactá al admin actual." },
                { status: 403 }
            );
        }

        // Promote the current user
        await prisma.user.update({
            where: { id: userId },
            data: { role: "ADMIN" },
        });

        return NextResponse.json({
            success: true,
            message: "¡Ahora sos ADMIN! Cerrá sesión y volvé a loguearte para que el cambio tome efecto.",
        });
    } catch (error) {
        console.error("[Promote] Error:", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

// Support both GET (browser URL bar) and POST
export async function GET() {
    return handlePromote();
}

export async function POST() {
    return handlePromote();
}
