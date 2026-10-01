import { Skeleton } from "@/components/ui/skeleton";

export default function EventDetailsLoading() {
  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 md:py-10 space-y-8 animate-in fade-in duration-300">
      {/* Back Button Placeholder */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-28 rounded-full" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
      </div>

      {/* Main Hero Media Skeleton */}
      <div className="relative w-full h-72 sm:h-96 md:h-[420px] rounded-[36px] overflow-hidden border border-black/5">
        <Skeleton className="w-full h-full" />
        <div className="absolute top-6 left-6 flex gap-2">
          <Skeleton className="h-8 w-28 rounded-full bg-white/80" />
          <Skeleton className="h-8 w-24 rounded-full bg-white/80" />
        </div>
      </div>

      {/* Two-Column Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Info, Description, Organizer, Venue */}
        <div className="lg:col-span-2 space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-10 w-5/6 rounded-2xl" />
            <Skeleton className="h-5 w-1/2 rounded-lg" />
          </div>

          {/* Date / Time / Location Quick Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-3xl border border-black/5 bg-white space-y-2">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-6 w-40 rounded-xl" />
            </div>
            <div className="p-4 rounded-3xl border border-black/5 bg-white space-y-2">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-6 w-48 rounded-xl" />
            </div>
          </div>

          {/* Organizer Card */}
          <div className="p-5 rounded-[32px] border border-black/5 bg-white flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-14 w-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-36 rounded-md" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
            </div>
            <Skeleton className="h-9 w-24 rounded-full" />
          </div>

          {/* Description Block */}
          <div className="p-6 rounded-[32px] border border-black/5 bg-white space-y-4">
            <Skeleton className="h-6 w-32 rounded-lg" />
            <div className="space-y-2.5">
              <Skeleton className="h-4 w-full rounded-md" />
              <Skeleton className="h-4 w-11/12 rounded-md" />
              <Skeleton className="h-4 w-4/5 rounded-md" />
              <Skeleton className="h-4 w-full rounded-md" />
            </div>
          </div>
        </div>

        {/* Right 1 Col: Pass Booking / RSVP Box */}
        <div className="space-y-6">
          <div className="p-6 rounded-[36px] border border-black/10 bg-white space-y-6 shadow-lg shadow-black/5 sticky top-24">
            <div className="space-y-2">
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-8 w-32 rounded-xl" />
            </div>

            <div className="space-y-3 pt-2">
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-full" />
            </div>

            <div className="space-y-2 pt-4 border-t border-black/5">
              <Skeleton className="h-4 w-4/5 rounded-md" />
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-4 w-2/3 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
