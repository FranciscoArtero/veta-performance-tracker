import { Skeleton } from "@/components/ui/skeleton";

export default function LoadingSkeleton() {
    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-8 animate-pulse">
            {/* Header / Ring Area Skeleton */}
            <div className="flex flex-col items-center justify-center space-y-4 pt-4 pb-8 border-b border-black/5 dark:border-white/5">
                <div className="space-y-2 text-center">
                    <Skeleton className="h-6 w-32 mx-auto rounded-md" />
                    <Skeleton className="h-10 w-48 mx-auto rounded-md" />
                </div>
                {/* Huge ring skeleton */}
                <Skeleton className="w-[280px] h-[280px] rounded-full" />
            </div>

            {/* Category Cards Skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-6 w-40 rounded-md mb-2" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="p-4 rounded-xl bg-black/[0.02] dark:bg-zinc-900/40 border border-black/5 dark:border-white/5 space-y-3">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-8 w-8 rounded-md" />
                                <div className="space-y-1.5 flex-1">
                                    <Skeleton className="h-4 w-24 rounded-sm" />
                                    <Skeleton className="h-3 w-16 rounded-sm" />
                                </div>
                                <Skeleton className="h-5 w-12 rounded-sm" />
                            </div>
                            <Skeleton className="h-2 w-full rounded-full" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
