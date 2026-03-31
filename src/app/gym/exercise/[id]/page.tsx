export const dynamic = "force-dynamic";

import { getExerciseHistory } from "@/app/actions/gym";
import { ExerciseHistoryClient } from "@/components/gym/ExerciseHistoryClient";

type Props = {
    params: {
        id: string;
    };
};

export default async function ExerciseHistoryPage({ params }: Props) {
    try {
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

