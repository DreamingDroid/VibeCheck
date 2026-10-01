import { Skeleton } from "@/components/ui/skeleton";

export default function PreferencesLoading() {
  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-56 rounded-2xl" />
        <Skeleton className="h-4 w-80 max-w-full rounded-md" />
      </div>

      {/* Profile Info Card */}
      <div className="p-6 md:p-8 rounded-[36px] border border-black/5 bg-white space-y-6 shadow-sm">
        <div className="flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48 rounded-md" />
            <Skeleton className="h-4 w-36 rounded-md" />
          </div>
        </div>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-6 md:p-8 rounded-[36px] border border-black/5 bg-white space-y-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="space-y-1.5">
                <Skeleton className="h-6 w-40 rounded-md" />
                <Skeleton className="h-4 w-64 rounded-md" />
              </div>
              <Skeleton className="h-8 w-14 rounded-full" />
            </div>
            <div className="pt-4 border-t border-black/5 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
              <Skeleton className="h-10 rounded-2xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
