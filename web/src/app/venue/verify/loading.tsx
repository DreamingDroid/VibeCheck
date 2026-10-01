import { Skeleton } from "@/components/ui/skeleton";

export default function VenueVerifyLoading() {
  return (
    <div className="flex-1 max-w-xl w-full mx-auto px-4 py-10 space-y-6 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-56 rounded-xl mx-auto" />
        <Skeleton className="h-4 w-72 rounded-md mx-auto" />
      </div>

      <div className="p-6 md:p-8 rounded-[36px] border border-black/5 bg-white space-y-6 shadow-sm">
        <Skeleton className="h-12 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}
