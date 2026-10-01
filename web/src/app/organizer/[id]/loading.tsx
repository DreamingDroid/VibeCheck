import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizerProfileLoading() {
  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8 animate-in fade-in duration-300">
      {/* Profile Header Card */}
      <div className="rounded-[40px] border border-black/5 bg-white p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Skeleton className="h-28 w-28 rounded-full flex-shrink-0" />
          <div className="space-y-3 flex-1 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
              <div>
                <Skeleton className="h-8 w-56 rounded-xl mx-auto sm:mx-0" />
                <Skeleton className="h-4 w-32 rounded-md mt-2 mx-auto sm:mx-0" />
              </div>
              <Skeleton className="h-10 w-32 rounded-full mx-auto sm:mx-0" />
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-4 pt-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full sm:w-3/4 rounded-md pt-2" />
          </div>
        </div>
      </div>

      {/* Hosted Events Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-48 rounded-xl" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>

        {/* Hosted Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-[36px] border border-black/5 bg-white p-5 space-y-4 shadow-sm"
            >
              <Skeleton className="h-44 w-full rounded-[24px]" />
              <Skeleton className="h-6 w-3/4 rounded-xl" />
              <Skeleton className="h-4 w-1/2 rounded-md" />
              <div className="pt-3 border-t border-black/5 flex items-center justify-between">
                <Skeleton className="h-5 w-20 rounded-md" />
                <Skeleton className="h-9 w-28 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
