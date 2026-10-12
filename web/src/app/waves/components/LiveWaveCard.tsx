"use client";

import React, { useState } from "react";
import { LiveWaveDrop } from "@/types/waves";
import { useCountdown } from "../hooks/useCountdown";
import { MapPin, Clock, ExternalLink, Share2, Sparkles, Navigation, Check } from "lucide-react";
import { InstagramIcon } from "./InstagramIcon";
import { format } from "date-fns";
import { toast } from "sonner";

interface LiveWaveCardProps {
  drop: LiveWaveDrop;
  onExpire?: (dropId: string) => void;
  featured?: boolean;
}

export function LiveWaveCard({ drop, onExpire, featured = false }: LiveWaveCardProps) {
  const [copied, setCopied] = useState(false);

  const countdown = useCountdown(drop.expires_at, () => {
    toast.info(`Wave for "${drop.stall.name}" just completed its window.`);
    onExpire?.(drop.id);
  });

  const closingTime = (() => {
    try {
      return format(new Date(drop.expires_at), "h:mm a");
    } catch {
      return "";
    }
  })();

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${drop.location_descriptor}, Visakhapatnam`
  )}`;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareData = {
      title: `${drop.stall.name} is LIVE on Beach Road!`,
      text: `Catch ${drop.stall.name} live right now: "${drop.title}". Time remaining: ${countdown.formatted}`,
      url: typeof window !== "undefined" ? window.location.href : "",
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        // Fallback to clipboard
      }
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(shareData.url || window.location.href);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      id={`live-wave-${drop.id}`}
      className={`group relative overflow-hidden rounded-[22px] sm:rounded-[26px] transition-all duration-300 flex flex-col justify-between ${
        featured
          ? "bg-gradient-to-br from-zinc-950 via-zinc-900 to-black text-white border-2 border-emerald-500/40 shadow-[0_12px_36px_rgba(16,185,129,0.18)]"
          : "bg-white text-zinc-900 border border-black/10 shadow-[0_6px_24px_rgba(0,0,0,0.04)] hover:shadow-lg hover:border-emerald-300"
      }`}
    >
      {/* Ambient background glow for featured */}
      {featured && (
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      )}

      {/* Header Strip with Live Status & Monospace Countdown */}
      <div
        className={`px-4 sm:px-5 py-3 flex items-center justify-between border-b ${
          featured
            ? "border-emerald-500/20 bg-emerald-950/30"
            : "border-emerald-100 bg-emerald-50/70"
        }`}
      >
        {/* Pulsing Live Badge */}
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] sm:text-[11px] font-black italic uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            LIVE DROP
          </span>
        </div>

        {/* Real-time Countdown Timer */}
        <div
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full font-mono font-black italic text-[11px] sm:text-xs ${
            featured
              ? "bg-black/80 text-emerald-300 border border-emerald-500/30 shadow-inner"
              : "bg-white text-emerald-800 border border-emerald-200 shadow-sm"
          }`}
          title="Time remaining before wave auto-closes"
        >
          <Clock className="w-3 h-3 text-emerald-500 animate-pulse" />
          <span className="tracking-widest">
            {countdown.isExpired ? "00h : 00m : 00s" : countdown.formatted}
          </span>
        </div>
      </div>

      {/* Main Card Content */}
      <div className="p-4 sm:p-5 space-y-3.5 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Stall Details & Category */}
          <div className="flex items-start justify-between gap-2.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span
                  className={`text-[9px] sm:text-[10px] font-black italic uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    featured
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-emerald-100/80 text-emerald-900 border border-emerald-200/60"
                  }`}
                >
                  {drop.stall.category}
                </span>

                {(drop.locality || drop.stall.locality) && (
                  <span
                    className={`text-[9px] sm:text-[10px] font-bold tracking-wide px-2 py-0.5 rounded-full ${
                      featured
                        ? "bg-white/10 text-zinc-300 border border-white/10"
                        : "bg-zinc-100 text-zinc-700 border border-black/5"
                    }`}
                  >
                    📍 {drop.locality || drop.stall.locality}
                  </span>
                )}

                {drop.stall.instagram_handle && (
                  <a
                    href={`https://instagram.com/${drop.stall.instagram_handle.replace("@", "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-[10px] sm:text-[11px] font-medium flex items-center gap-1 hover:underline truncate ${
                      featured ? "text-zinc-400 hover:text-white" : "text-zinc-500 hover:text-black"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <InstagramIcon className="w-2.5 h-2.5 text-pink-500 shrink-0" />
                    <span className="truncate">{drop.stall.instagram_handle}</span>
                  </a>
                )}
              </div>

              <h3
                className={`text-base sm:text-lg md:text-xl font-black italic uppercase tracking-tight leading-snug line-clamp-2 ${
                  featured ? "text-white" : "text-zinc-950"
                }`}
              >
                {drop.stall.name}
              </h3>
            </div>

            <button
              onClick={handleShare}
              className={`p-2 rounded-full transition-colors shrink-0 active:scale-95 ${
                featured
                  ? "bg-white/10 hover:bg-white/20 text-white"
                  : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700"
              }`}
              title="Share this live wave"
              aria-label="Share wave"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Live Batch Highlight */}
          <div
            className={`p-3 rounded-[16px] border ${
              featured
                ? "bg-white/5 border-white/10"
                : "bg-gradient-to-r from-emerald-50/60 to-teal-50/40 border-emerald-100"
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-black italic uppercase tracking-wider text-emerald-500 mb-1">
              <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>LIVE BATCH OFFERINGS</span>
            </div>
            <p
              className={`text-xs sm:text-sm font-bold leading-tight ${
                featured ? "text-zinc-100" : "text-zinc-900"
              }`}
            >
              {drop.title}
            </p>
            {drop.batch_description && (
              <p
                className={`text-[11px] sm:text-xs mt-1 leading-relaxed line-clamp-2 ${
                  featured ? "text-zinc-300" : "text-zinc-600"
                }`}
              >
                {drop.batch_description}
              </p>
            )}
          </div>
        </div>

        {/* Physical Location Pin & Compact Directions Icon Button */}
        <div className="pt-2.5 border-t border-white/10 sm:border-black/5 flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5 text-[11px] sm:text-xs min-w-0">
            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
            <div className="truncate">
              <span
                className={`font-medium block truncate ${
                  featured ? "text-zinc-200" : "text-zinc-700"
                }`}
                title={drop.location_descriptor}
              >
                {drop.location_descriptor}
              </span>
              {closingTime && (
                <span className={`text-[10px] font-mono font-medium block ${featured ? "text-emerald-400/80" : "text-emerald-700"}`}>
                  Closes ~{closingTime}
                </span>
              )}
            </div>
          </div>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className={`p-2.5 rounded-full transition-all active:scale-90 shrink-0 flex items-center justify-center shadow-md ${
              featured
                ? "bg-emerald-400 hover:bg-emerald-300 text-black shadow-emerald-400/20"
                : "bg-black hover:bg-zinc-800 text-white shadow-black/10"
            }`}
            title="Directions on Google Maps"
            aria-label="Directions on Google Maps"
          >
            <Navigation className="w-3.5 h-3.5 fill-current" />
          </a>
        </div>
      </div>
    </div>
  );
}
