"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CalendarRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard?view=calendar");
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-xs font-black uppercase tracking-widest text-zinc-500">
          Loading VibeCalendar...
        </p>
      </div>
    </div>
  );
}
