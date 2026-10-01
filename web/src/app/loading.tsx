import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Loader2 } from "lucide-react";

export default function RootLoading() {
  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8 animate-in fade-in duration-300">
      {/* Top Section Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-black/5">
        <div className="space-y-3">
          <Skeleton className="h-9 w-64 rounded-2xl" />
          <Skeleton className="h-4 w-96 max-w-full rounded-xl" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-28 rounded-full" />
          <Skeleton className="h-10 w-36 rounded-full" />
        </div>
      </div>

      {/* Hero / Banner Skeleton */}
      <div className="relative rounded-[32px] overflow-hidden border border-black/5 bg-white/60 p-6 md:p-8 space-y-4">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-32 rounded-full" />
        </div>
        <Skeleton className="h-8 w-3/4 md:w-1/2 rounded-2xl" />
        <Skeleton className="h-4 w-full md:w-2/3 rounded-xl" />
      </div>

      {/* Grid Content Skeletons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="rounded-[32px] border border-black/5 bg-white p-5 space-y-4 shadow-sm"
          >
            <Skeleton className="h-48 w-full rounded-2xl" />
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-lg" />
            </div>
            <Skeleton className="h-6 w-5/6 rounded-xl" />
            <Skeleton className="h-4 w-2/3 rounded-lg" />
            <div className="pt-2 flex items-center justify-between border-t border-black/5">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
