export const dynamic = 'force-dynamic';

import {
    getExerciseProgressSummaries,
    getGlobalExercises,
    getRoutines,
    getWorkoutLogs,
} from "@/app/actions/gym";
import { GymClient } from "@/components/gym/GymClient";

export default async function GymPage() {
    try {
        const [routines, recentLogs, exerciseProgress, globalExercises] = await Promise.all([
            getRoutines(),
            getWorkoutLogs(20),
            getExerciseProgressSummaries(100),
            getGlobalExercises(),
        ]);

        return (
            <div className="p-4 md:p-6 lg:p-8">
                <GymClient
                    routines={routines}
                    recentLogs={recentLogs}
                    exerciseProgress={exerciseProgress}
                    globalExercises={globalExercises}
                />
            </div>
        );
    } catch (error: unknown) {
        const err = error as Error;
        return (
            <div className="p-8 text-red-500 font-mono">
                <h1 className="text-2xl font-bold mb-4">Server Error</h1>
                <pre className="bg-red-950/20 p-4 rounded-lg whitespace-pre-wrap">
                    {err.message || String(error)}
                    {"\n"}
                    {err.stack}
                </pre>
            </div>
        );
    }
}
