export const dynamic = "force-dynamic";

import { getExerciseHistory } from "@/app/actions/gym";
import { ExerciseHistoryClient } from "@/components/gym/ExerciseHistoryClient";

type Props = {
    params: {
        id: string;
    };
};

export default async function ExerciseHistoryPage({ params }: Props) {
    const data = await getExerciseHistory(params.id);

    return (
        <div className="p-4 md:p-6 lg:p-8">
            <ExerciseHistoryClient
                exercise={data.exercise}
                timeline={data.timeline}
                history={data.history}
                stats={data.stats}
            />
        </div>
    );
}

