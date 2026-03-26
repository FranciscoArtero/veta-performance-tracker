import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";

export async function GET() {
    try {
        const session = await getServerSession();

        if (!session?.user?.email) {
            return NextResponse.json({ enabled: false }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
            select: {
                isHydrationEnabled: true,
                hydrationGoalMl: true,
                hydrationLogs: {
                    where: {
                        date: (() => {
                            const now = new Date();
                            return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
                        })(),
                    },
                    select: { amountMl: true },
                },
            },
        });

        if (!user || !user.isHydrationEnabled) {
            return NextResponse.json({ enabled: false });
        }

        const totalMl = user.hydrationLogs.reduce((sum, l) => sum + l.amountMl, 0);
        const goalMl = user.hydrationGoalMl;

        // Calculate expected ml for current hour
        // Assumes 16 waking hours (8am to midnight)
        const now = new Date();
        const currentHour = now.getHours();
        const wakingHoursElapsed = Math.max(0, Math.min(currentHour - 8, 16));
        const expectedMlForHour = Math.round((goalMl / 16) * wakingHoursElapsed);
        const progressPercent = goalMl > 0 ? Math.round((totalMl / goalMl) * 100) : 0;

        // "Behind" = progress is below 80% of what's expected at this hour
        const isBehind = totalMl < expectedMlForHour * 0.8;

        return NextResponse.json({
            enabled: true,
            totalMl,
            goalMl,
            expectedMlForHour,
            progressPercent,
            isBehind,
        });
    } catch {
        return NextResponse.json({ enabled: false, error: "Internal error" }, { status: 500 });
    }
}
