import { Skeleton } from "@/components/ui/skeleton";

export default function ScannerLoading() {
  return (
    <div className="flex-1 max-w-lg w-full mx-auto px-4 py-8 space-y-6 animate-in fade-in duration-300">
      <div className="text-center space-y-2">
        <Skeleton className="h-8 w-48 rounded-xl mx-auto" />
        <Skeleton className="h-4 w-64 rounded-md mx-auto" />
      </div>

      <div className="p-6 rounded-[36px] border border-black/5 bg-white space-y-4 shadow-sm">
        <Skeleton className="h-64 w-full rounded-[28px]" />
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-5 w-28 rounded-md" />
          <Skeleton className="h-5 w-20 rounded-md" />
        </div>
      </div>
    </div>
  );
}
