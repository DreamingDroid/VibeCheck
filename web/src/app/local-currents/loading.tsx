import { Skeleton } from "@/components/ui/skeleton";

export default function LocalCurrentsLoading() {
  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8 animate-in fade-in duration-300">
      {/* Ticker / Banner Shimmer */}
      <div className="rounded-2xl border border-black/5 bg-white p-3 flex items-center gap-3">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-4 flex-1 rounded-md" />
      </div>

      {/* Header & City / Filter Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 rounded-2xl" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
      </div>

      {/* Category Pills Strip */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[90, 110, 80, 130, 95, 100].map((w, idx) => (
          <Skeleton key={idx} className="h-9 rounded-full flex-shrink-0" style={{ width: `${w}px` }} />
        ))}
      </div>

      {/* Featured News Hero Card Skeleton */}
      <div className="rounded-[36px] border border-black/5 bg-white overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-2">
        <Skeleton className="h-64 lg:h-full w-full min-h-[280px]" />
        <div className="p-6 md:p-8 space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-4 w-28 rounded-md" />
            </div>
            <Skeleton className="h-8 w-full rounded-xl" />
            <Skeleton className="h-8 w-4/5 rounded-xl" />
            <Skeleton className="h-4 w-full rounded-md" />
            <Skeleton className="h-4 w-5/6 rounded-md" />
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-black/5">
            <Skeleton className="h-4 w-32 rounded-md" />
            <Skeleton className="h-9 w-28 rounded-full" />
          </div>
        </div>
      </div>

      {/* Regular Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-[32px] border border-black/5 bg-white p-5 space-y-4 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-4">
              <Skeleton className="h-44 w-full rounded-[22px]" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
              <Skeleton className="h-6 w-5/6 rounded-xl" />
              <Skeleton className="h-4 w-full rounded-md" />
            </div>
            <div className="pt-3 border-t border-black/5 flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
