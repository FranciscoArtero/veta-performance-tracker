import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
    process.env.DIRECT_DATABASE_URL ||
    process.env.DATABASE_URL ||
    "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable";

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TEMP_USER_ID = "default-user-core";

const defaultHabits = [
    { name: "Despertar a las 6:00", icon: "⏰", color: "#8b5cf6", frequency: "daily", order: 0 },
    { name: "Gym", icon: "🏋️", color: "#06b6d4", frequency: "daily", order: 1 },
    { name: "Lectura / Learning", icon: "📚", color: "#f59e0b", frequency: "daily", order: 2 },
    { name: "Day Trading", icon: "📈", color: "#10b981", frequency: "weekly", order: 3 },
    { name: "Budget Tracking", icon: "💰", color: "#ec4899", frequency: "daily", order: 4 },
    { name: "Prayer / Holy", icon: "🙏", color: "#a855f7", frequency: "daily", order: 5 },
    { name: "No Alcohol", icon: "🚫", color: "#ef4444", frequency: "daily", order: 6 },
    { name: "Read/Music/Sleep", icon: "🎵", color: "#3b82f6", frequency: "daily", order: 7 },
    { name: "Goal Journaling", icon: "📝", color: "#6366f1", frequency: "daily", order: 8 },
    { name: "Cold Shower", icon: "🧊", color: "#0ea5e9", frequency: "daily", order: 9 },
];

async function main() {
    console.log("🌱 Seeding database...\n");

    // Create default user
    const user = await prisma.user.upsert({
        where: { id: TEMP_USER_ID },
        update: {},
        create: {
            id: TEMP_USER_ID,
            email: "core@demo.com",
            name: "CORE OS User",
        },
    });
    console.log(`✅ User: ${user.name} (${user.id})`);

    // Create habits
    for (const habit of defaultHabits) {
        await prisma.habit.upsert({
            where: {
                id: `${TEMP_USER_ID}-habit-${habit.order}`,
            },
            update: { ...habit, userId: user.id },
            create: {
                id: `${TEMP_USER_ID}-habit-${habit.order}`,
                ...habit,
                userId: user.id,
            },
        });
        console.log(`  ✅ Habit: ${habit.icon} ${habit.name}`);
    }

    // Seed some habit logs for the last 14 days (random completions)
    const now = new Date();
    for (let dayOffset = 13; dayOffset >= 0; dayOffset--) {
        const d = new Date(now);
        d.setDate(d.getDate() - dayOffset);
        const dateOnly = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

        for (const habit of defaultHabits) {
            // ~65% chance of completion
            if (Math.random() > 0.35) {
                const habitId = `${TEMP_USER_ID}-habit-${habit.order}`;
                await prisma.habitLog.upsert({
                    where: { habitId_date: { habitId, date: dateOnly } },
                    update: { completed: true },
                    create: { habitId, date: dateOnly, completed: true },
                });
            }
        }
    }
    console.log(`  ✅ Seeded habit logs for the last 14 days`);

    // Seed mental states for the last 7 days
    for (let dayOffset = 6; dayOffset >= 0; dayOffset--) {
        const d = new Date(now);
        d.setDate(d.getDate() - dayOffset);
        const dateOnly = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));

        const mood = Math.floor(Math.random() * 4) + 6; // 6-9
        const motivation = Math.floor(Math.random() * 4) + 5; // 5-8

        await prisma.mentalState.upsert({
            where: { userId_date: { userId: user.id, date: dateOnly } },
            update: { mood, motivation },
            create: { userId: user.id, date: dateOnly, mood, motivation },
        });
    }
    console.log(`  ✅ Seeded mental states for the last 7 days`);

    console.log("\n🎉 Seed completed!\n");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
