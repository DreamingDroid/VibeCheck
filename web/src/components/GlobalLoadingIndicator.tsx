"use client";

import React, { useEffect, useState } from "react";
import { useLoading } from "@/context/LoadingContext";
import { Loader2, Sparkles, RefreshCw } from "lucide-react";

export function GlobalLoadingIndicator() {
  const { isNavigating, isApiLoading, activeRequestsCount } = useLoading();
  const [progress, setProgress] = useState(0);
  const [showSlowNavIndicator, setShowSlowNavIndicator] = useState(false);

  // Animate progress bar during navigation or active API calls
  const isBusy = isNavigating || isApiLoading;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isBusy) {
      setProgress((prev) => (prev === 0 ? 15 : prev));
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          // Slowly increment towards 90%
          const step = Math.max(1, (90 - prev) * 0.15);
          return Math.min(90, prev + step);
        });
      }, 120);
    } else {
      if (progress > 0) {
        setProgress(100);
        const timer = setTimeout(() => {
          setProgress(0);
        }, 300);
        return () => clearTimeout(timer);
      }
    }

    return () => clearInterval(interval);
  }, [isBusy, progress]);

  // Show a gentle centered spinner if navigation is taking unusually long (>400ms)
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isNavigating) {
      timer = setTimeout(() => {
        setShowSlowNavIndicator(true);
      }, 400);
    } else {
      setShowSlowNavIndicator(false);
    }
    return () => clearTimeout(timer);
  }, [isNavigating]);

  return (
    <>
      {/* Top Animated Progress Bar */}
      <div
        className={`fixed top-0 left-0 right-0 z-[99999] pointer-events-none transition-opacity duration-300 ${
          progress > 0 ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="h-[3.5px] w-full bg-transparent overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-emerald-500 transition-all duration-200 ease-out shadow-[0_0_12px_rgba(236,72,153,0.8)]"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>
      </div>

      {/* Floating Background API Activity Pill */}
      {isApiLoading && !isNavigating && (
        <div className="fixed bottom-5 right-5 z-[9999] pointer-events-none animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-black/10 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-full px-4 py-2 flex items-center gap-2.5 text-xs font-bold text-zinc-700 dark:text-zinc-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-pink-500" />
            </span>
            <span className="tracking-tight flex items-center gap-1.5">
              <span>Fetching data</span>
              {activeRequestsCount > 1 && (
                <span className="bg-pink-100 dark:bg-pink-950/60 text-pink-600 dark:text-pink-400 text-[10px] px-1.5 py-0.2 rounded-full font-mono font-black">
                  {activeRequestsCount}
                </span>
              )}
            </span>
            <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-500" />
          </div>
        </div>
      )}

      {/* Slow Navigation Subtle Overlay Helper */}
      {showSlowNavIndicator && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] pointer-events-none animate-in fade-in duration-200">
          <div className="bg-black/80 backdrop-blur-md text-white border border-white/10 shadow-2xl rounded-full px-4 py-2 flex items-center gap-2.5 text-xs font-black uppercase tracking-wider">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
            <span>Opening Screen...</span>
          </div>
        </div>
      )}
    </>
  );
}
