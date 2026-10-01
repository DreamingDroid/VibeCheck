import { Skeleton } from "@/components/ui/skeleton";

export default function OrganizerApplyLoading() {
  return (
    <div className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 space-y-8 animate-in fade-in duration-300">
      <div className="space-y-2 text-center sm:text-left">
        <Skeleton className="h-9 w-64 rounded-2xl mx-auto sm:mx-0" />
        <Skeleton className="h-4 w-96 max-w-full rounded-md mx-auto sm:mx-0" />
      </div>

      <div className="p-6 md:p-8 rounded-[36px] border border-black/5 bg-white space-y-6 shadow-sm">
        <div className="space-y-4">
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-12 w-full rounded-2xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-full" />
      </div>
    </div>
  );
}
