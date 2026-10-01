import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 rounded-2xl" />
          <Skeleton className="h-4 w-80 rounded-md" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-[28px] border border-black/5 bg-white space-y-3 shadow-sm"
          >
            <Skeleton className="h-4 w-28 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-xl" />
            <Skeleton className="h-3 w-32 rounded-md" />
          </div>
        ))}
      </div>

      {/* Admin Table Placeholder */}
      <div className="p-6 rounded-[36px] border border-black/5 bg-white space-y-4 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-black/5">
          <Skeleton className="h-7 w-48 rounded-xl" />
          <Skeleton className="h-9 w-40 rounded-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50/50">
              <Skeleton className="h-5 w-48 rounded-md" />
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-8 w-24 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
