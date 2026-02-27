/**
 * Compute the current streak for a habit (consecutive days with logs ending today or yesterday).
 */
export function computeStreak(
    logs: { date: Date; completed: boolean }[]
): number {
    if (logs.length === 0) return 0;

    const completedDates = logs
        .filter((l) => l.completed)
        .map((l) => {
            const d = new Date(l.date);
            return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
        })
        .sort()
        .reverse(); // most recent first

    if (completedDates.length === 0) return 0;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    // Streak must include today or yesterday
    if (completedDates[0] !== todayStr && completedDates[0] !== yesterdayStr) {
        return 0;
    }

    let streak = 1;
    for (let i = 1; i < completedDates.length; i++) {
        const current = new Date(completedDates[i - 1]);
        const prev = new Date(completedDates[i]);
        const diffMs = current.getTime() - prev.getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }

    return streak;
}
