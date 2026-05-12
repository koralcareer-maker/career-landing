// Reusable skeleton primitives for loading.tsx files. Pure visual,
// no client JS — animate-pulse handles the shimmer.

import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn("animate-pulse rounded bg-gray-200", className)}
    />
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "bg-white/80 rounded-3xl border border-black/5 p-6 space-y-4",
        className,
      )}
    >
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <Skeleton className="h-3 w-4/6" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-gray-50 animate-pulse">
      <div className="w-12 h-12 bg-gray-200 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
    </div>
  );
}

// Reusable page-level loading shell. Header + several skeleton cards.
// Used as the default fallback for most list-style pages.
export function PageSkeleton({
  title,
  rowCount = 4,
}: {
  title?: string;
  rowCount?: number;
}) {
  return (
    <div className="space-y-5" aria-busy="true" aria-label={title ?? "טוענת"}>
      <div className="bg-white/80 rounded-3xl border border-black/5 p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-2" />
        <div className="h-3 bg-gray-100 rounded w-72" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: rowCount }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </div>
    </div>
  );
}
