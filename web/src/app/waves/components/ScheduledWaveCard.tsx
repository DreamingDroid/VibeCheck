"use client";

import React from "react";
import { ScheduledWave } from "@/types/waves";
import { Calendar, Clock, MapPin, Bell, ExternalLink, Sparkles } from "lucide-react";
import { InstagramIcon } from "./InstagramIcon";
import { format, isToday, isTomorrow } from "date-fns";

interface ScheduledWaveCardProps {
  scheduledWave: ScheduledWave;
}

export function ScheduledWaveCard({ scheduledWave }: ScheduledWaveCardProps) {
  const { stall, next_scheduled_at, next_scheduled_note } = scheduledWave;

  const dateObj = new Date(next_scheduled_at);
  const isValidDate = !isNaN(dateObj.getTime());

  let dateLabel = "UPCOMING WAVE";
  let timeLabel = "";

  if (isValidDate) {
    if (isToday(dateObj)) {
      dateLabel = "TODAY";
    } else if (isTomorrow(dateObj)) {
      dateLabel = "TOMORROW";
    } else {
      dateLabel = format(dateObj, "EEE, MMM d").toUpperCase();
    }
    timeLabel = format(dateObj, "h:mm a");
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${stall.typical_location}, Visakhapatnam`
  )}`;

  return (
    <div
      id={`scheduled-wave-${stall.id}`}
      className="group relative bg-white border border-amber-200/90 rounded-[22px] sm:rounded-[26px] p-4 sm:p-5 shadow-[0_6px_25px_rgba(245,158,11,0.06)] hover:shadow-[0_10px_32px_rgba(245,158,11,0.12)] hover:border-amber-300 transition-all duration-300 flex flex-col justify-between"
    >
      <div>
        {/* Top Header with Confirmed Schedule Badge */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] sm:text-xs font-black italic uppercase tracking-wider bg-amber-50 text-amber-900 border border-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500 inline-block animate-pulse" />
            <Calendar className="w-3 h-3 text-amber-600" />
            <span>
              {dateLabel} {timeLabel && `• ${timeLabel}`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] sm:text-[10px] font-black italic uppercase tracking-wider text-zinc-500 bg-zinc-100 px-2.5 py-0.5 rounded-full border border-black/5">
              {stall.category}
            </span>
            {stall.locality && (
              <span className="text-[9px] sm:text-[10px] font-bold text-zinc-700 bg-amber-100/60 px-2 py-0.5 rounded-full border border-amber-200/50">
                📍 {stall.locality}
              </span>
            )}
          </div>
        </div>

        {/* Stall Name & Instagram */}
        <div className="mb-2">
          <h3 className="text-base sm:text-lg font-black italic uppercase tracking-tight text-zinc-950 group-hover:text-amber-700 transition-colors line-clamp-1">
            {stall.name}
          </h3>
          {stall.instagram_handle && (
            <a
              href={`https://instagram.com/${stall.instagram_handle.replace("@", "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-zinc-500 hover:text-black mt-0.5 transition-colors"
            >
              <InstagramIcon className="w-2.5 h-2.5 text-pink-500 shrink-0" />
              <span>{stall.instagram_handle}</span>
            </a>
          )}
        </div>

        {/* Confirmed Batch Note */}
        {next_scheduled_note && (
          <div className="p-3 rounded-[16px] bg-amber-50/70 border border-amber-200/60 mb-2.5 text-xs">
            <div className="flex items-center gap-1 text-[10px] font-black italic uppercase tracking-wider text-amber-800 mb-0.5">
              <Sparkles className="w-3 h-3 text-amber-600" />
              <span>SCHEDULED DROP NOTE</span>
            </div>
            <p className="text-zinc-800 font-bold leading-snug text-xs sm:text-sm">
              {next_scheduled_note}
            </p>
          </div>
        )}

        {/* Description */}
        <p className="text-[11px] sm:text-xs text-zinc-600 leading-relaxed line-clamp-2 mb-3">
          {stall.description}
        </p>
      </div>

      {/* Footer Location & Quick Action */}
      <div className="pt-3 border-t border-zinc-100 flex items-center justify-between gap-2.5 text-xs">
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-zinc-600 hover:text-black font-medium truncate group-hover:underline text-[11px] sm:text-xs"
          title={stall.typical_location}
        >
          <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
          <span className="truncate">{stall.typical_location}</span>
        </a>

        <a
          href="https://t.me/VibeCheckBot?start=reminder"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-black italic uppercase tracking-wider bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300/50 transition-colors shrink-0 active:scale-95"
        >
          <Bell className="w-3 h-3" />
          <span>REMIND ME</span>
        </a>
      </div>
    </div>
  );
}
