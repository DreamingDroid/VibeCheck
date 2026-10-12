"use client";

import React from "react";
import { WaveStall } from "@/types/waves";
import { MapPin, Clock, ExternalLink, Moon } from "lucide-react";
import { InstagramIcon } from "./InstagramIcon";

interface OfflineStallCardProps {
  stall: WaveStall;
}

export function OfflineStallCard({ stall }: OfflineStallCardProps) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${stall.typical_location}, Visakhapatnam`
  )}`;

  return (
    <div
      id={`offline-stall-${stall.id}`}
      className="group bg-white/95 border border-black/10 rounded-[22px] sm:rounded-[26px] p-4 sm:p-5 shadow-sm hover:shadow-md hover:border-black/20 transition-all duration-300 flex flex-col justify-between"
    >
      <div>
        {/* Status Badge & Category */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black italic uppercase tracking-wider bg-zinc-100 text-zinc-700 border border-zinc-200">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500 inline-block" />
            <Moon className="w-3 h-3 text-zinc-500" />
            <span>WAVE PASSED • OFFLINE</span>
          </span>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] sm:text-[10px] font-black italic uppercase tracking-wider text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded-full border border-black/5">
              {stall.category}
            </span>
            {stall.locality && (
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full border border-black/5">
                📍 {stall.locality}
              </span>
            )}
          </div>
        </div>

        {/* Stall Name & Instagram */}
        <div className="mb-2">
          <h3 className="text-base sm:text-lg font-black italic uppercase tracking-tight text-zinc-900 group-hover:text-black transition-colors line-clamp-1">
            {stall.name}
          </h3>
          {stall.instagram_handle && (
            <a
              href={`https://instagram.com/${stall.instagram_handle.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-zinc-400 hover:text-black mt-0.5 transition-colors"
            >
              <InstagramIcon className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
              <span>{stall.instagram_handle}</span>
            </a>
          )}
        </div>

        {/* Description */}
        <p className="text-[11px] sm:text-xs text-zinc-500 leading-relaxed line-clamp-2 mb-2.5">
          {stall.description}
        </p>

        {/* Typical Schedule */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 bg-zinc-50 rounded-[14px] p-2 sm:p-2.5 border border-zinc-100 mb-3">
          <Clock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="font-semibold text-[10px] sm:text-[11px] text-zinc-700 truncate">
            {stall.typical_schedule}
          </span>
        </div>
      </div>

      {/* Footer Location Pin */}
      <div className="pt-2 border-t border-zinc-100 flex items-center justify-between gap-2 text-xs">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-zinc-500 hover:text-black font-medium truncate group-hover:underline"
          title={stall.typical_location}
        >
          <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
          <span className="truncate text-[10px] sm:text-[11px]">{stall.typical_location}</span>
        </a>
        <ExternalLink className="w-3 h-3 text-zinc-300 group-hover:text-zinc-600 transition-colors shrink-0" />
      </div>
    </div>
  );
}
