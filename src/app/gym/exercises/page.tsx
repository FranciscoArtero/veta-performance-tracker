export const dynamic = "force-dynamic";

import { getGlobalExercises } from "@/app/actions/gym";
import { GymExercisesCatalogClient } from "@/components/gym/GymExercisesCatalogClient";

export default async function GymExercisesPage() {
    try {
        const exercises = await getGlobalExercises();

        return (
            <div className="p-4 md:p-6 lg:p-8">
                <GymExercisesCatalogClient exercises={exercises} />
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
