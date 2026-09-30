"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Globe, Search, Clock, Check, Sparkles, MapPin } from "lucide-react";
import { getAllWorldTimezones, getUserTimezone, getTimezoneAbbr, WorldTimezone } from "@/lib/timezone";

interface WorldTimezoneSelectorProps {
  value: string;
  onChange: (timezone: string) => void;
  label?: string;
  className?: string;
}

const REGIONS = [
  { id: "all", label: "All Regions" },
  { id: "popular", label: "Popular" },
  { id: "Asia", label: "Asia" },
  { id: "Europe", label: "Europe" },
  { id: "America", label: "Americas" },
  { id: "Africa", label: "Africa" },
  { id: "Australia", label: "Australia / Pacific" },
];

const POPULAR_ZONES = new Set([
  "Asia/Kolkata",
  "UTC",
  "Europe/London",
  "Europe/Amsterdam",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Asia/Hong_Kong",
  "Asia/Bangkok",
  "Australia/Sydney",
  "Pacific/Auckland",
]);

export function WorldTimezoneSelector({
  value,
  onChange,
  label = "Select Event Timezone",
  className = "",
}: WorldTimezoneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [userTz, setUserTz] = useState<string>("Asia/Kolkata");

  useEffect(() => {
    setUserTz(getUserTimezone());
  }, []);

  const allTimezones = useMemo(() => {
    return getAllWorldTimezones();
  }, []);

  const selectedTzObj = useMemo(() => {
    return allTimezones.find((t) => t.value === value) || {
      value: value || "Asia/Kolkata",
      label: value || "Asia/Kolkata",
      region: value?.split("/")[0] || "Global",
      city: value?.split("/")[1] || value || "Kolkata",
      offset: "GMT",
      abbr: getTimezoneAbbr(value || "Asia/Kolkata"),
    };
  }, [allTimezones, value]);

  const filteredTimezones = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allTimezones.filter((item) => {
      // Region filter
      if (selectedRegion === "popular") {
        if (!POPULAR_ZONES.has(item.value) && item.value !== userTz) return false;
      } else if (selectedRegion === "Australia") {
        if (!item.value.startsWith("Australia") && !item.value.startsWith("Pacific")) return false;
      } else if (selectedRegion !== "all") {
        if (!item.value.startsWith(selectedRegion)) return false;
      }

      // Query filter
      if (!q) return true;
      return (
        item.value.toLowerCase().includes(q) ||
        item.city.toLowerCase().includes(q) ||
        item.offset.toLowerCase().includes(q) ||
        item.abbr.toLowerCase().includes(q) ||
        item.region.toLowerCase().includes(q)
      );
    });
  }, [allTimezones, search, selectedRegion, userTz]);

  const isUserLocal = selectedTzObj.value === userTz;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="w-full text-left bg-zinc-50 hover:bg-zinc-100/80 border border-black/5 hover:border-black/15 transition-all p-3 rounded-xl flex items-center justify-between group shadow-sm"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
            <Globe className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-black truncate">{selectedTzObj.city}</span>
              <span className="text-[10px] font-bold text-sky-700 bg-sky-100/70 px-1.5 py-0.5 rounded-md">
                {selectedTzObj.abbr}
              </span>
              {isUserLocal && (
                <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                  <MapPin className="h-2.5 w-2.5" /> Your Local Zone
                </span>
              )}
            </div>
            <p className="text-[10px] font-medium text-zinc-500 truncate">
              {selectedTzObj.value} ({selectedTzObj.offset})
            </p>
          </div>
        </div>

        <span className="text-[10px] font-black uppercase tracking-wider text-sky-600 group-hover:text-sky-700 bg-sky-50 px-2.5 py-1.5 rounded-lg shrink-0 ml-2">
          Change
        </span>
      </button>

      {/* Global Timezone Picker Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl bg-white border border-black/10 rounded-3xl shadow-2xl p-0 overflow-hidden">
          {/* Header */}
          <DialogHeader className="p-5 pb-4 border-b border-black/5 bg-zinc-50/50">
            <DialogTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2 text-black">
              <Globe className="h-4 w-4 text-sky-600" />
              <span>Select World Timezone</span>
              <span className="text-[10px] font-bold uppercase text-zinc-400 bg-zinc-200/60 px-2 py-0.5 rounded-full ml-auto">
                {allTimezones.length} Timezones
              </span>
            </DialogTitle>

            {/* Search Input */}
            <div className="relative mt-3">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search city, country, or zone (e.g. Amsterdam, Tokyo, New York, IST, +5:30)..."
                className="pl-10 h-11 bg-white border-black/10 rounded-xl text-xs font-bold focus:ring-sky-500 focus:border-sky-500"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-zinc-400 hover:text-black bg-zinc-100 h-5 w-5 rounded-full flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-1 no-scrollbar">
              {REGIONS.map((reg) => (
                <button
                  key={reg.id}
                  type="button"
                  onClick={() => setSelectedRegion(reg.id)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap transition-all ${
                    selectedRegion === reg.id
                      ? "bg-black text-white shadow-sm"
                      : "bg-white text-zinc-500 hover:text-black border border-black/5"
                  }`}
                >
                  {reg.label}
                </button>
              ))}
            </div>

            {/* Device Local Timezone Shortcut */}
            {userTz && value !== userTz && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange(userTz);
                    setIsOpen(false);
                  }}
                  className="w-full py-1.5 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-[10px] font-black flex items-center justify-between transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-emerald-600" />
                    <span>Quick Select: Set to your device's detected timezone ({userTz})</span>
                  </span>
                  <span className="uppercase tracking-widest text-[9px] bg-emerald-200/60 px-1.5 py-0.5 rounded">
                    Use Local
                  </span>
                </button>
              </div>
            )}
          </DialogHeader>

          {/* Timezone List */}
          <div className="max-h-[360px] overflow-y-auto p-3 divide-y divide-zinc-100">
            {filteredTimezones.length === 0 ? (
              <div className="text-center py-12 text-zinc-400">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs font-bold">No world timezones match "{search}"</p>
                <p className="text-[10px] mt-1">Try searching by major city name or UTC offset.</p>
              </div>
            ) : (
              filteredTimezones.map((tz) => {
                const isSelected = tz.value === value;
                const isDeviceZone = tz.value === userTz;
                return (
                  <button
                    key={tz.value}
                    type="button"
                    onClick={() => {
                      onChange(tz.value);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-center justify-between group ${
                      isSelected
                        ? "bg-sky-500/10 text-sky-950 font-bold"
                        : "hover:bg-zinc-50 text-zinc-800"
                    }`}
                  >
                    <div className="min-w-0 pr-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-black text-black group-hover:text-sky-600 transition-colors">
                          {tz.city}
                        </span>
                        {tz.abbr && (
                          <span className="text-[9px] font-bold text-zinc-500 bg-zinc-100 px-1.5 py-0.5 rounded">
                            {tz.abbr}
                          </span>
                        )}
                        {isDeviceZone && (
                          <span className="text-[8px] font-black uppercase text-emerald-700 bg-emerald-100/70 px-1.5 py-0.5 rounded">
                            Device
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 truncate mt-0.5">{tz.value}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-mono font-bold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md">
                        {tz.offset}
                      </span>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-sky-600 text-white flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
