import { Skeleton } from "@/components/ui/skeleton";

export default function ToolsLoading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="טוענת כלים">
      <div className="bg-white/80 rounded-3xl border border-black/5 p-6 animate-pulse">
        <Skeleton className="h-7 w-32 mb-2" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="bg-white/80 rounded-2xl border border-black/5 p-5 animate-pulse">
            <div className="w-12 h-12 bg-gray-200 rounded-xl mb-3" />
            <Skeleton className="h-5 w-2/3 mb-2" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-5/6 mt-1" />
          </div>
        ))}
      </div>
    </div>
  );
}
