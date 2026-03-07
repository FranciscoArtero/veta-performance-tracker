import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Health check endpoint. Logs environment on startup.
 */
export async function GET() {
    const env = process.env.RAILWAY_ENVIRONMENT || process.env.NODE_ENV || "unknown";

    console.log(`🚀 CORE OS - Entorno detectado: ${env}`);

    return NextResponse.json({
        status: "ok",
        environment: env,
        timestamp: new Date().toISOString(),
        version: process.env.RAILWAY_GIT_COMMIT_SHA?.slice(0, 7) || "local",
    });
}
