"use client";

import React, { useRef, useState, useMemo } from "react";
import { LiveWaveDrop } from "@/types/waves";
import { LiveWaveCard } from "./LiveWaveCard";
import { ChevronLeft, ChevronRight, Waves, Radio, LayoutGrid, Rows, ArrowUpDown } from "lucide-react";

interface WavesLiveStripProps {
  liveWaves: LiveWaveDrop[];
  onExpireDrop?: (dropId: string) => void;
  onOpenRegisterModal?: () => void;
  onShowAllWaves?: () => void;
  defaultViewMode?: "carousel" | "grid";
}

export function WavesLiveStrip({
  liveWaves,
  onExpireDrop,
  onOpenRegisterModal,
  onShowAllWaves,
  defaultViewMode = "carousel",
}: WavesLiveStripProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"carousel" | "grid">(defaultViewMode);
  const [sortBy, setSortBy] = useState<"ending-soon" | "recent">("ending-soon");

  // Sort live drops
  const sortedLiveWaves = useMemo(() => {
    return [...liveWaves].sort((a, b) => {
      if (sortBy === "ending-soon") {
        return new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime();
      }
      return new Date(b.started_at).getTime() - new Date(a.started_at).getTime();
    });
  }, [liveWaves, sortBy]);

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const cardWidth = scrollContainerRef.current.querySelector("div")?.clientWidth || 320;
      const offset = direction === "left" ? -cardWidth - 16 : cardWidth + 16;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const index = Math.round(scrollLeft / (clientWidth * 0.85));
      setActiveIndex(Math.min(index, sortedLiveWaves.length - 1));
    }
  };

  const hasLive = sortedLiveWaves.length > 0;

  return (
    <section className="relative w-full rounded-[22px] sm:rounded-[28px] p-4 sm:p-6 md:p-7 bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white shadow-2xl overflow-hidden border border-emerald-500/20">
      {/* Dynamic ambient background glow */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-10 left-10 w-72 h-72 bg-teal-500/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] sm:text-[10px] font-black italic uppercase tracking-[0.2em] mb-1.5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>VIZAG REAL-TIME RADAR</span>
            <span className="text-white/20">•</span>
            <span className="text-emerald-300">LIVE POP-UPS</span>
          </div>

          <div className="flex items-baseline gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-white flex items-center gap-2 leading-none">
              <Waves className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 shrink-0" />
              <span>LIVE WAVES RADAR</span>
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-mono font-black italic bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {sortedLiveWaves.length} ACTIVE NOW
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-zinc-400 mt-1 max-w-xl leading-relaxed">
            Active pop-ups serving right now across Visakhapatnam with real-time stock countdowns.
          </p>
        </div>

        {/* View mode toggle & sort controls */}
        {hasLive && (
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            {/* Urgency Sort Pill */}
            <button
              onClick={() => setSortBy(sortBy === "ending-soon" ? "recent" : "ending-soon")}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-black italic uppercase tracking-wider bg-white/10 hover:bg-white/15 text-emerald-300 border border-emerald-500/30 transition-all active:scale-95"
              title="Toggle sorting order"
            >
              <ArrowUpDown className="w-3 h-3 text-emerald-400" />
              <span>{sortBy === "ending-soon" ? "ENDING SOONEST" : "RECENTLY STARTED"}</span>
            </button>

            {/* Layout Toggle (Grid vs Carousel) */}
            <div className="inline-flex items-center rounded-full bg-white/10 p-0.5 border border-white/10">
              <button
                onClick={() => setViewMode("carousel")}
                className={`p-1.5 rounded-full transition-colors ${
                  viewMode === "carousel" ? "bg-emerald-500 text-black shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
                title="Spotlight Carousel View"
                aria-label="Carousel View"
              >
                <Rows className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 rounded-full transition-colors ${
                  viewMode === "grid" ? "bg-emerald-500 text-black shadow-sm" : "text-zinc-400 hover:text-white"
                }`}
                title="Multi-column Grid View"
                aria-label="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Carousel navigation buttons (only in carousel mode) */}
            {viewMode === "carousel" && sortedLiveWaves.length > 1 && (
              <div className="hidden sm:flex items-center gap-1.5">
                <button
                  onClick={() => scroll("left")}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 border border-white/10"
                  aria-label="Previous live wave"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => scroll("right")}
                  className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95 border border-white/10"
                  aria-label="Next live wave"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Body: Live Waves (Carousel OR Multi-column Grid) */}
      {hasLive ? (
        <div className="relative z-10">
          {viewMode === "carousel" ? (
            /* Carousel Spotlight View */
            <>
              <div
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="flex gap-3 sm:gap-5 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory -mx-4 px-4 sm:mx-0 sm:px-0"
              >
                {sortedLiveWaves.map((drop) => (
                  <div
                    key={drop.id}
                    className="w-[84vw] max-w-[340px] sm:w-[360px] md:w-[390px] flex-shrink-0 snap-center"
                  >
                    <LiveWaveCard
                      drop={drop}
                      featured={true}
                      onExpire={onExpireDrop}
                    />
                  </div>
                ))}
              </div>

              {/* Mobile pagination dots */}
              {sortedLiveWaves.length > 1 && (
                <div className="flex sm:hidden justify-center items-center gap-1.5 pt-2">
                  {sortedLiveWaves.map((drop, idx) => (
                    <span
                      key={drop.id}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === activeIndex ? "w-5 bg-emerald-400" : "w-1.5 bg-white/20"
                      }`}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            /* Multi-column Grid Feed View (Scales for 19+ waves) */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
              {sortedLiveWaves.map((drop) => (
                <LiveWaveCard
                  key={drop.id}
                  drop={drop}
                  featured={true}
                  onExpire={onExpireDrop}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="relative z-10 py-8 px-4 rounded-[18px] bg-white/5 border border-white/10 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-2.5 text-emerald-400">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <h3 className="text-base sm:text-lg font-black italic uppercase tracking-tight text-white mb-1">
            NO MICRO-DROPS LIVE IN THIS AREA RIGHT NOW
          </h3>
          <p className="text-[11px] sm:text-xs text-zinc-400 max-w-sm mb-4 leading-relaxed">
            Vizag vendors pop up during evening and weekend peaks. Check confirmed scheduled appearances or set reminders.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            {onShowAllWaves && (
              <button
                onClick={onShowAllWaves}
                className="px-5 py-2.5 rounded-full text-xs font-black italic uppercase tracking-wider bg-white/10 hover:bg-white/20 text-emerald-300 border border-emerald-500/30 transition-all active:scale-95"
              >
                SHOW ALL VIZAG WAVES
              </button>
            )}
            {onOpenRegisterModal && (
              <button
                onClick={onOpenRegisterModal}
                className="px-5 py-2.5 rounded-full text-xs font-black italic uppercase tracking-wider bg-emerald-400 hover:bg-emerald-300 text-black transition-all active:scale-95 shadow-lg shadow-emerald-400/20"
              >
                ARE YOU A VENDOR? GO LIVE
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
