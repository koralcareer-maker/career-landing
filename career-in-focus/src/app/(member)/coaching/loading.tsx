import { Skeleton } from "@/components/ui/skeleton";

export default function CoachingLoading() {
  return (
    <div className="max-w-3xl space-y-5" aria-busy="true" aria-label="טוענת מאמן">
      <div className="bg-navy/95 rounded-3xl p-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-white/20 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-white/30 rounded w-44" />
            <div className="h-3 bg-white/20 rounded w-64" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-black/5 shadow-sm p-5" style={{ height: "70vh" }}>
        <div className="space-y-4 animate-pulse">
          <Skeleton className="h-3 w-24 mb-6" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={i % 2 === 0 ? "flex" : "flex justify-end"}>
              <div className={`max-w-[70%] rounded-2xl p-3 ${i % 2 === 0 ? "bg-gray-100" : "bg-teal/20"}`}>
                <div className="h-3 bg-gray-300 rounded w-44 mb-2" />
                <div className="h-3 bg-gray-300 rounded w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
