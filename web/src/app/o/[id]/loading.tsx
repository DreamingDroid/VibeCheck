import { Skeleton } from "@/components/ui/skeleton";

export default function ShortLinkLoading() {
  return (
    <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-16 text-center space-y-6 animate-in fade-in duration-300">
      <Skeleton className="h-16 w-16 rounded-full mx-auto" />
      <Skeleton className="h-8 w-64 rounded-xl mx-auto" />
      <Skeleton className="h-4 w-80 max-w-full rounded-md mx-auto" />
      <div className="p-6 rounded-[32px] border border-black/5 bg-white space-y-4 max-w-md mx-auto">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-10 w-full rounded-full" />
      </div>
    </div>
  );
}
