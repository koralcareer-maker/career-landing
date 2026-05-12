// Auto-shown by Next.js during /jobs server render. Mirrors the real
// page silhouette: header + filter bar + job-row list.
import { Skeleton, SkeletonRow } from "@/components/ui/skeleton";

export default function JobsLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="טוענת משרות">
      <div className="bg-white/80 rounded-3xl border border-black/5 p-6 animate-pulse">
        <Skeleton className="h-7 w-40 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* filter chips row */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-full shrink-0" />
        ))}
      </div>

      {/* job rows */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
