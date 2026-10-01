import { Skeleton } from "@/components/ui/skeleton";

export default function CalendarLoading() {
  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 rounded-2xl" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </div>

      {/* Calendar Grid Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Calendar View (2 Cols) */}
        <div className="lg:col-span-2 p-6 md:p-8 rounded-[36px] border border-black/5 bg-white space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-44 rounded-xl" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-9 w-9 rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-6 w-full rounded-md" />
            ))}
          </div>

          <div className="grid grid-cols-7 gap-3 pt-2">
            {Array.from({ length: 35 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-2xl" />
            ))}
          </div>
        </div>

        {/* Selected Day Agenda (1 Col) */}
        <div className="p-6 rounded-[36px] border border-black/5 bg-white space-y-4 shadow-sm">
          <Skeleton className="h-7 w-40 rounded-xl" />
          <Skeleton className="h-4 w-32 rounded-md" />

          <div className="space-y-3 pt-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-4 rounded-2xl border border-black/5 space-y-2">
                <Skeleton className="h-5 w-4/5 rounded-md" />
                <Skeleton className="h-4 w-1/2 rounded-md" />
                <Skeleton className="h-4 w-2/3 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
