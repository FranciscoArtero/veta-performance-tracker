export const dynamic = "force-dynamic";

import { getGlobalExercises } from "@/app/actions/gym";
import { GymExercisesCatalogClient } from "@/components/gym/GymExercisesCatalogClient";

export default async function GymExercisesPage() {
    const exercises = await getGlobalExercises();

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <GymExercisesCatalogClient exercises={exercises} />
        </div>
    );
}
