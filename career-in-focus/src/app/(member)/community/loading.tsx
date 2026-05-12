import { Skeleton } from "@/components/ui/skeleton";

export default function CommunityLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="טוענת קהילה">
      <div className="bg-white/80 rounded-3xl border border-black/5 p-6 animate-pulse">
        <Skeleton className="h-7 w-32 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Composer */}
      <div className="bg-white/80 rounded-2xl border border-black/5 p-4 animate-pulse">
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/80 rounded-2xl border border-black/5 p-5 animate-pulse">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gray-200 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
