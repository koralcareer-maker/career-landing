import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function ProfileLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="טוענת פרופיל">
      {/* Hero strip */}
      <div className="bg-navy/95 rounded-3xl p-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-white/30 rounded w-44" />
            <div className="h-3 bg-white/20 rounded w-64" />
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white/80 rounded-2xl border border-black/5 p-4 animate-pulse">
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
