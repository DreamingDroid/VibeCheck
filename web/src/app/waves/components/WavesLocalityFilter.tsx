"use client";

import React from "react";
import { VIZAG_LOCALITIES } from "@/types/waves";
import { MapPin, Navigation, Crosshair, Loader2 } from "lucide-react";

interface WavesLocalityFilterProps {
  selectedLocality: string;
  onSelectLocality: (locality: string) => void;
  localityCounts?: Record<string, number>;
  detectedLocality?: string | null;
  distanceKm?: number | null;
  onRequestLocation?: () => void;
  isLocating?: boolean;
}

export function WavesLocalityFilter({
  selectedLocality,
  onSelectLocality,
  localityCounts,
  detectedLocality,
  distanceKm,
  onRequestLocation,
  isLocating = false,
}: WavesLocalityFilterProps) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-1 -mx-3 px-3 sm:mx-0 sm:px-0">
      <div className="flex items-center gap-1.5 min-w-max">
        {/* GPS Quick Detect Button */}
        {onRequestLocation && (
          <button
            onClick={onRequestLocation}
            disabled={isLocating}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-black italic uppercase tracking-wider transition-all duration-200 active:scale-95 shrink-0 border ${
              detectedLocality
                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                : "bg-white hover:bg-zinc-50 text-zinc-700 border-black/10 shadow-sm"
            }`}
            title="Auto-detect nearest Vizag area from GPS"
          >
            {isLocating ? (
              <Loader2 className="w-3 h-3 text-emerald-600 animate-spin" />
            ) : (
              <Crosshair className={`w-3 h-3 ${detectedLocality ? "text-emerald-600" : "text-zinc-500"}`} />
            )}
            <span>
              {isLocating
                ? "DETECTING..."
                : detectedLocality
                ? "GPS ACTIVE"
                : "USE MY GPS"}
            </span>
          </button>
        )}

        {VIZAG_LOCALITIES.map((loc) => {
          const isSelected = selectedLocality === loc;
          const isDetected = detectedLocality === loc;
          const count = localityCounts ? localityCounts[loc] : undefined;

          return (
            <button
              key={loc}
              id={`waves-loc-${loc.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
              onClick={() => onSelectLocality(loc)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-black italic uppercase tracking-wider transition-all duration-200 active:scale-95 shrink-0 ${
                isSelected
                  ? "bg-zinc-950 text-white shadow-sm ring-2 ring-primary ring-offset-1"
                  : "bg-zinc-100/90 hover:bg-zinc-200/90 text-zinc-600 hover:text-black border border-black/5"
              }`}
            >
              {isDetected ? (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              ) : (
                <MapPin className={`w-3 h-3 shrink-0 ${isSelected ? "text-rose-400" : "text-zinc-400"}`} />
              )}
              <span>{loc}</span>

              {isDetected && distanceKm !== null && distanceKm !== undefined && (
                <span className="text-[9px] font-mono font-bold text-emerald-400">
                  {distanceKm}km
                </span>
              )}

              {typeof count === "number" && count > 0 && (
                <span
                  className={`text-[9px] font-mono font-black italic px-1.5 py-0.2 rounded-full ${
                    isSelected ? "bg-white/20 text-white" : "bg-black/5 text-zinc-500"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
