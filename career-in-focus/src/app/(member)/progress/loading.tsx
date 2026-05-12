import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function ProgressLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="טוענת התקדמות">
      <div className="bg-white/80 rounded-3xl border border-black/5 p-6 animate-pulse">
        <Skeleton className="h-7 w-40 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white/80 rounded-2xl border border-black/5 p-5 animate-pulse">
            <Skeleton className="h-7 w-16 mb-1" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>

      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}
