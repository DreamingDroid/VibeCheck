import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-8 animate-in fade-in duration-300">
      {/* City & Search / Welcome Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-32 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-9 w-72 rounded-2xl" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-40 rounded-full" />
          <Skeleton className="h-11 w-32 rounded-full" />
        </div>
      </div>

      {/* VIP / News Alert Banner Placeholder */}
      <div className="rounded-[28px] border border-black/5 bg-white/80 p-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-2xl flex-shrink-0" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48 rounded-md" />
            <Skeleton className="h-4 w-72 max-w-full rounded-md" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-full hidden sm:block" />
      </div>

      {/* Category Filter Pills Strip */}
      <div className="flex items-center gap-2.5 overflow-x-auto pb-2 no-scrollbar">
        {[100, 80, 110, 95, 85, 120, 90, 105].map((width, idx) => (
          <Skeleton
            key={idx}
            className="h-10 rounded-full flex-shrink-0"
            style={{ width: `${width}px` }}
          />
        ))}
      </div>

      {/* Date Picker Strip Placeholder */}
      <div className="rounded-[30px] border border-black/5 bg-white/90 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-40 rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      </div>

      {/* Event Cards Grid Skeletons */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48 rounded-xl" />
          <Skeleton className="h-5 w-24 rounded-lg" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="rounded-[36px] border border-black/5 bg-white p-5 space-y-4 shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="relative">
                  <Skeleton className="h-48 w-full rounded-[24px]" />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Skeleton className="h-6 w-20 rounded-full bg-white/70" />
                  </div>
                  <div className="absolute bottom-3 left-3">
                    <Skeleton className="h-7 w-28 rounded-xl bg-white/80" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Skeleton className="h-6 w-4/5 rounded-xl" />
                  <Skeleton className="h-4 w-2/3 rounded-lg" />
                  <Skeleton className="h-4 w-1/2 rounded-lg" />
                </div>
              </div>

              <div className="pt-3 border-t border-black/5 flex items-center justify-between">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-10 w-32 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
