import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizerDashboardLoading() {
  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8 animate-in fade-in duration-300">
      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 rounded-2xl" />
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-11 w-36 rounded-full" />
          <Skeleton className="h-11 w-44 rounded-full" />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-[28px] border border-black/5 bg-white space-y-3 shadow-sm"
          >
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-3 w-36 rounded-md" />
          </div>
        ))}
      </div>

      {/* Events List / Management Area */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>

        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="p-5 rounded-[32px] border border-black/5 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <Skeleton className="h-20 w-20 rounded-2xl flex-shrink-0" />
                <div className="space-y-2">
                  <Skeleton className="h-6 w-56 rounded-xl" />
                  <Skeleton className="h-4 w-40 rounded-md" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-24 rounded-full" />
                <Skeleton className="h-9 w-24 rounded-full" />
                <Skeleton className="h-9 w-9 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
