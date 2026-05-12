import { Skeleton } from "@/components/ui/skeleton";

export default function EventsLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="טוענת אירועים">
      <div className="bg-white/80 rounded-3xl border border-black/5 p-6 animate-pulse">
        <Skeleton className="h-7 w-36 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white/80 rounded-2xl border border-black/5 overflow-hidden animate-pulse">
            <div className="h-40 bg-gray-200" />
            <div className="p-5 space-y-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-9 w-32 rounded-xl mt-3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
