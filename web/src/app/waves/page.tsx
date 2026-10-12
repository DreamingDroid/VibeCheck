"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { WavesFeedResponse, LiveWaveDrop, ScheduledWave, WaveStall, VIZAG_LOCALITIES } from "@/types/waves";
import { getMockWavesFeed } from "./data/mockWaves";
import { WavesLiveStrip } from "./components/WavesLiveStrip";
import { ScheduledWaveCard } from "./components/ScheduledWaveCard";
import { OfflineStallCard } from "./components/OfflineStallCard";
import { WavesCategoryFilter } from "./components/WavesCategoryFilter";
import { WavesLocalityFilter } from "./components/WavesLocalityFilter";
import { StallRegisterModal } from "./components/StallRegisterModal";
import { WavesExplainerModal } from "./components/WavesExplainerModal";
import { requestUserCoordinates, getNearestVizagLocality } from "./utils/geoLocality";
import { 
  Waves, Search, RotateCcw, Plus, Info, Sparkles, 
  MapPin, Clock, Calendar, CheckCircle, ShieldAlert,
  SlidersHorizontal, Send, ChevronRight, ChevronDown, ChevronUp, Layers, Flame,
  Crosshair, Loader2
} from "lucide-react";
import { isToday, isTomorrow } from "date-fns";
import { toast } from "sonner";

type ZoneTab = "all" | "live" | "scheduled" | "directory";
type DayFilter = "all" | "today" | "tomorrow" | "weekend";

export default function WavesPage() {
  // Feed Data State
  const [feed, setFeed] = useState<WavesFeedResponse>(() => getMockWavesFeed());
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [usingMock, setUsingMock] = useState<boolean>(false);

  // Tab & Filters State
  const [activeTab, setActiveTab] = useState<ZoneTab>("all");
  const [selectedLocality, setSelectedLocality] = useState<string>("Beach Road & RK Beach");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [scheduledDayFilter, setScheduledDayFilter] = useState<DayFilter>("all");

  // Geolocation & Area Bucket State
  const [detectedLocality, setDetectedLocality] = useState<string | null>(null);
  const [detectedDistanceKm, setDetectedDistanceKm] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  // Progressive Disclosure (Pagination limits for large scale)
  const [scheduledVisibleLimit, setScheduledVisibleLimit] = useState<number>(6);
  const [directoryVisibleLimit, setDirectoryVisibleLimit] = useState<number>(8);

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState<boolean>(false);
  const [isExplainerModalOpen, setIsExplainerModalOpen] = useState<boolean>(false);

  // Fetch Feed from Backend API
  const fetchFeed = useCallback(async (showToast = false) => {
    try {
      setIsRefreshing(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/waves/feed`, {
        headers: { "Cache-Control": "no-cache" },
      });

      if (res.ok) {
        const data: WavesFeedResponse = await res.json();
        setFeed(data);
        setUsingMock(false);
        if (showToast) toast.success("Live Vizag waves feed updated!");
      } else {
        // Fallback to rich mock data if backend route is not ready
        setFeed((prev) => (prev ? prev : getMockWavesFeed()));
        setUsingMock(true);
        if (showToast) toast.info("Updated with Vizag local radar cache");
      }
    } catch (err) {
      setFeed((prev) => (prev ? prev : getMockWavesFeed()));
      setUsingMock(true);
      if (showToast) toast.info("Updated with local radar cache");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  // Track if user explicitly chose or switched locality during the session
  const userExplicitRef = useRef<boolean>(false);

  // Geolocation Auto-Detection:
  // By default, fetch user's location with browser permission, map to nearest Vizag bucket,
  // and show waves for that bucket, unless the user explicitly asks to show all waves or picked another area.
  const detectUserLocality = useCallback(async (isManualTrigger = false) => {
    setIsLocating(true);
    try {
      const coords = await requestUserCoordinates();
      const nearest = getNearestVizagLocality(coords.latitude, coords.longitude);
      setDetectedLocality(nearest.locality);
      setDetectedDistanceKm(nearest.distanceKm);

      // If user hasn't explicitly chosen something else, localize them
      if (isManualTrigger || !userExplicitRef.current) {
        setSelectedLocality(nearest.locality);
        if (isManualTrigger) {
          try {
            localStorage.removeItem("waves_user_explicit_locality");
          } catch {}
          toast.success(`📍 Localized to your area: ${nearest.locality} (~${nearest.distanceKm}km)`);
        } else {
          toast.success(`📍 Detected nearby area: ${nearest.locality} (~${nearest.distanceKm}km)`);
        }
      }
    } catch (err: any) {
      if (isManualTrigger) {
        if (err?.code === 1) {
          toast.error("Location permission denied. Please allow location in your browser.");
        } else {
          toast.error("Could not determine your GPS location.");
        }
      } else {
        // Fallback default on initial load if permission not granted and not explicitly overridden
        if (!userExplicitRef.current) {
          setSelectedLocality("Beach Road & RK Beach");
        }
      }
    } finally {
      setIsLocating(false);
    }
  }, []);

  // Initial mount: check URL params, then stored preference; otherwise auto-detect with permission
  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const queryLoc = urlParams.get("locality") || urlParams.get("area");
      if (queryLoc) {
        userExplicitRef.current = true;
        if (queryLoc.toLowerCase() === "all" || queryLoc.toLowerCase() === "all vizag") {
          setSelectedLocality("All Vizag");
        } else {
          const match = VIZAG_LOCALITIES.find(
            (l) => l.toLowerCase().includes(queryLoc.toLowerCase()) || queryLoc.toLowerCase().includes(l.toLowerCase())
          );
          if (match) setSelectedLocality(match);
        }
        return;
      }
    }

    let storedChoice: string | null = null;
    try {
      storedChoice = localStorage.getItem("waves_user_explicit_locality");
    } catch {}

    if (storedChoice) {
      userExplicitRef.current = true;
      setSelectedLocality(storedChoice);
    } else {
      detectUserLocality(false);
    }
  }, [detectUserLocality]);

  const handleSelectLocality = useCallback((loc: string) => {
    userExplicitRef.current = true;
    setSelectedLocality(loc);
    try {
      localStorage.setItem("waves_user_explicit_locality", loc);
    } catch {}
  }, []);

  const handleShowAllWaves = useCallback(() => {
    userExplicitRef.current = true;
    setSelectedLocality("All Vizag");
    try {
      localStorage.setItem("waves_user_explicit_locality", "All Vizag");
    } catch {}
    toast.info("Showing all waves across Visakhapatnam");
  }, []);

  const handleRequestGPS = useCallback(() => {
    userExplicitRef.current = false;
    detectUserLocality(true);
  }, [detectUserLocality]);

  // Handle countdown expiration in real-time without full page reload
  const handleDropExpired = useCallback((dropId: string) => {
    setFeed((prevFeed) => {
      const expiredDrop = prevFeed.live_waves.find((d) => d.id === dropId);
      if (!expiredDrop) return prevFeed;

      const updatedLive = prevFeed.live_waves.filter((d) => d.id !== dropId);
      const alreadyInDirectory = prevFeed.offline_directory.some(
        (s) => s.id === expiredDrop.stall.id
      );

      const updatedDirectory = alreadyInDirectory
        ? prevFeed.offline_directory
        : [expiredDrop.stall, ...prevFeed.offline_directory];

      return {
        ...prevFeed,
        live_waves: updatedLive,
        offline_directory: updatedDirectory,
      };
    });
  }, []);

  // Helper matcher for locality
  const matchesLocality = useCallback((stallLocality?: string, locationDesc?: string) => {
    if (selectedLocality === "All Vizag") return true;
    const loc = selectedLocality.toLowerCase();
    const stallLoc = (stallLocality || "").toLowerCase();
    const desc = (locationDesc || "").toLowerCase();
    if (stallLoc.includes(loc) || desc.includes(loc) || loc.includes(stallLoc)) return true;

    // Check individual keywords if composite (e.g. "Beach Road & RK Beach")
    const tokens = loc.split(/&|,/).map((t) => t.trim().toLowerCase()).filter((t) => t.length > 2);
    return tokens.some((token) => stallLoc.includes(token) || desc.includes(token));
  }, [selectedLocality]);

  // Filter calculations
  const filteredLiveWaves = useMemo(() => {
    return feed.live_waves.filter((drop) => {
      const catMatch = selectedCategory === "All" || drop.stall.category === selectedCategory;
      const locMatch = matchesLocality(drop.locality || drop.stall.locality, drop.location_descriptor);
      const q = searchQuery.toLowerCase().trim();
      const qMatch =
        !q ||
        drop.stall.name.toLowerCase().includes(q) ||
        drop.title.toLowerCase().includes(q) ||
        (drop.batch_description && drop.batch_description.toLowerCase().includes(q)) ||
        drop.location_descriptor.toLowerCase().includes(q);
      return catMatch && locMatch && qMatch;
    });
  }, [feed.live_waves, selectedCategory, matchesLocality, searchQuery]);

  const filteredScheduledWaves = useMemo(() => {
    return feed.scheduled_waves.filter((item) => {
      const catMatch = selectedCategory === "All" || item.stall.category === selectedCategory;
      const locMatch = matchesLocality(item.stall.locality, item.stall.typical_location);
      const q = searchQuery.toLowerCase().trim();
      const qMatch =
        !q ||
        item.stall.name.toLowerCase().includes(q) ||
        (item.next_scheduled_note && item.next_scheduled_note.toLowerCase().includes(q)) ||
        item.stall.typical_location.toLowerCase().includes(q);

      // Day filter
      let dayMatch = true;
      if (scheduledDayFilter !== "all") {
        const d = new Date(item.next_scheduled_at);
        if (scheduledDayFilter === "today") dayMatch = isToday(d);
        else if (scheduledDayFilter === "tomorrow") dayMatch = isTomorrow(d);
        else if (scheduledDayFilter === "weekend") {
          const day = d.getDay();
          dayMatch = day === 0 || day === 6; // Sunday or Saturday
        }
      }

      return catMatch && locMatch && qMatch && dayMatch;
    });
  }, [feed.scheduled_waves, selectedCategory, matchesLocality, searchQuery, scheduledDayFilter]);

  const filteredOfflineDirectory = useMemo(() => {
    return feed.offline_directory.filter((stall) => {
      const catMatch = selectedCategory === "All" || stall.category === selectedCategory;
      const locMatch = matchesLocality(stall.locality, stall.typical_location);
      const q = searchQuery.toLowerCase().trim();
      const qMatch =
        !q ||
        stall.name.toLowerCase().includes(q) ||
        stall.description.toLowerCase().includes(q) ||
        stall.typical_location.toLowerCase().includes(q);
      return catMatch && locMatch && qMatch;
    });
  }, [feed.offline_directory, selectedCategory, matchesLocality, searchQuery]);

  // Aggregate category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: 0 };
    const allStalls = [
      ...feed.live_waves.map((d) => d.stall),
      ...feed.scheduled_waves.map((s) => s.stall),
      ...feed.offline_directory,
    ];
    counts.All = allStalls.length;
    allStalls.forEach((s) => {
      counts[s.category] = (counts[s.category] || 0) + 1;
    });
    return counts;
  }, [feed]);

  // Aggregate locality counts
  const localityCounts = useMemo(() => {
    const counts: Record<string, number> = { "All Vizag": 0 };
    const allStalls = [
      ...feed.live_waves.map((d) => ({ loc: d.locality || d.stall.locality })),
      ...feed.scheduled_waves.map((s) => ({ loc: s.stall.locality })),
      ...feed.offline_directory.map((s) => ({ loc: s.locality })),
    ];
    counts["All Vizag"] = allStalls.length;
    allStalls.forEach((item) => {
      if (item.loc) counts[item.loc] = (counts[item.loc] || 0) + 1;
    });
    return counts;
  }, [feed]);

  return (
    <div className="w-full min-h-screen pb-24 sm:pb-20">
      {/* Top Banner / Ticker */}
      <div className="w-full bg-black text-white px-3 sm:px-4 py-2 text-[10px] sm:text-xs">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 truncate">
            <span className="flex h-2 w-2 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="font-mono font-black italic tracking-wide uppercase truncate">
              VISAKHAPATNAM WAVES ENGINE
            </span>
            <span className="hidden md:inline text-white/30">•</span>
            <span className="hidden md:inline text-zinc-300 font-medium">
              Live Pop-Ups &amp; Micro-Drops Across Vizag
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="https://t.me/VibeCheckBot?start=waves"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-black italic uppercase text-[10px] text-[#229ED9] hover:text-white transition-colors"
            >
              <Send className="w-3 h-3" />
              <span>@VibeCheckBot</span>
            </a>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-8 space-y-5 sm:space-y-7">
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 pb-2 border-b border-black/5">
          <div>
            {/* Live Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] italic mb-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
              </span>
              <span>VIZAG DISPATCHES</span>
              <span className="text-black/20">•</span>
              <span className="text-zinc-600 font-bold tracking-wider">CITY-WIDE LIVE ENGINE</span>
            </div>

            {/* Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black italic uppercase tracking-tighter leading-none text-black">
              WAVES <span className="text-primary not-italic -skew-x-[12deg] inline-block">LIVE ENGINE</span>
            </h1>

            <p className="text-xs sm:text-base text-zinc-600 mt-2 max-w-2xl leading-relaxed">
              Find live pop-up cold brews, artisanal bakeries, food trucks, and sunset makers across Visakhapatnam right now before batches sell out.
            </p>

            {/* Subtle auxiliary links */}
            <div className="flex items-center gap-3 mt-3 pt-0.5 text-[11px] font-bold text-zinc-500">
              <button
                id="waves-how-it-works-link"
                onClick={() => setIsExplainerModalOpen(true)}
                className="inline-flex items-center gap-1 hover:text-black transition-colors"
              >
                <Info className="w-3.5 h-3.5 text-zinc-500" />
                <span>How Waves Works</span>
              </button>
              <span className="text-zinc-300">•</span>
              <button
                id="waves-vendor-link"
                onClick={() => setIsRegisterModalOpen(true)}
                className="inline-flex items-center gap-1 hover:text-emerald-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Vendor Sign-Up</span>
              </button>
            </div>
          </div>

          {/* Action CTAs (Desktop) */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap shrink-0">
            <button
              id="waves-refresh-btn"
              onClick={() => fetchFeed(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-black italic uppercase tracking-wider bg-white hover:bg-zinc-50 text-zinc-800 border border-black/10 shadow-sm transition-all active:scale-95"
              title="Refresh live feed"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
              <span>REFRESH</span>
            </button>
          </div>
        </div>

        {/* PILLAR 1: SEGMENTED ZONE SWITCHER TABS (Eliminates Scroll Fatigue at Scale) */}
        <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-zinc-100/90 rounded-full border border-black/5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab("all")}
            className={`flex items-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-full text-[10px] sm:text-xs font-black italic uppercase tracking-wider transition-all duration-200 shrink-0 ${
              activeTab === "all"
                ? "bg-black text-white shadow-md shadow-black/15 ring-2 ring-primary"
                : "text-zinc-600 hover:text-black hover:bg-white/60"
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${activeTab === "all" ? "text-primary" : "text-zinc-400"}`} />
            <span>ALL RADAR</span>
            <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-white/20 text-white">
              {feed.live_waves.length + feed.scheduled_waves.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("live")}
            className={`flex items-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-full text-[10px] sm:text-xs font-black italic uppercase tracking-wider transition-all duration-200 shrink-0 ${
              activeTab === "live"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 ring-2 ring-emerald-400"
                : "text-zinc-600 hover:text-black hover:bg-white/60"
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>LIVE NOW</span>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${activeTab === "live" ? "bg-white/25 text-white" : "bg-black/5 text-zinc-600"}`}>
              {filteredLiveWaves.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("scheduled")}
            className={`flex items-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-full text-[10px] sm:text-xs font-black italic uppercase tracking-wider transition-all duration-200 shrink-0 ${
              activeTab === "scheduled"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/25 ring-2 ring-amber-400"
                : "text-zinc-600 hover:text-black hover:bg-white/60"
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>SCHEDULED</span>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${activeTab === "scheduled" ? "bg-white/25 text-white" : "bg-black/5 text-zinc-600"}`}>
              {filteredScheduledWaves.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("directory")}
            className={`flex items-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-full text-[10px] sm:text-xs font-black italic uppercase tracking-wider transition-all duration-200 shrink-0 ${
              activeTab === "directory"
                ? "bg-zinc-800 text-white shadow-md shadow-zinc-800/25 ring-2 ring-zinc-400"
                : "text-zinc-600 hover:text-black hover:bg-white/60"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>DIRECTORY</span>
            <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${activeTab === "directory" ? "bg-white/25 text-white" : "bg-black/5 text-zinc-600"}`}>
              {filteredOfflineDirectory.length}
            </span>
          </button>
        </div>

        {/* PILLAR 2: NEIGHBORHOOD & SEARCH CONTROLS */}
        <div className="space-y-2.5">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="waves-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stall name, item (cold brew, tacos), or Vizag area..."
              className="w-full pl-10 pr-12 py-2.5 sm:py-3 text-xs sm:text-sm rounded-full bg-white border border-black/10 focus:outline-none focus:ring-2 focus:ring-primary shadow-sm text-zinc-900 placeholder:text-zinc-400 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] sm:text-xs font-black italic uppercase text-zinc-400 hover:text-black"
              >
                CLEAR
              </button>
            )}
          </div>

          {/* Vizag Locality / Area Filter Chips & Geolocation Notification */}
          <div className="space-y-2">
            {/* Locality Status & Show All Banner */}
            {detectedLocality && selectedLocality === detectedLocality ? (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 p-2.5 sm:px-4 sm:py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-950 text-xs animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5 shrink-0">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <span className="font-bold text-emerald-900">
                    Showing waves in your nearest area:{" "}
                    <span className="font-black italic uppercase text-black underline decoration-emerald-500 decoration-2">
                      {selectedLocality}
                    </span>
                    {detectedDistanceKm !== null && (
                      <span className="font-mono text-[11px] text-emerald-700 ml-1">
                        (~{detectedDistanceKm} km away)
                      </span>
                    )}
                  </span>
                </div>
                <button
                  id="waves-show-all-btn"
                  onClick={handleShowAllWaves}
                  className="inline-flex items-center gap-1 font-black italic uppercase text-[10px] sm:text-[11px] text-emerald-800 hover:text-black hover:underline shrink-0"
                >
                  <span>SHOW ALL WAVES ({localityCounts["All Vizag"] || 0})</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            ) : selectedLocality !== "All Vizag" ? (
              <div className="flex items-center justify-between gap-2 p-2.5 sm:px-4 sm:py-2 rounded-2xl bg-zinc-100 border border-black/5 text-zinc-800 text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="font-bold">
                    Filtered to: <span className="font-black italic uppercase text-black">{selectedLocality}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRequestGPS}
                    disabled={isLocating}
                    className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black italic uppercase text-emerald-700 hover:text-emerald-900"
                  >
                    <Crosshair className="w-3 h-3" />
                    <span>DETECT GPS</span>
                  </button>
                  <span className="text-zinc-300">•</span>
                  <button
                    onClick={handleShowAllWaves}
                    className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-black italic uppercase text-primary hover:underline"
                  >
                    <span>SHOW ALL ({localityCounts["All Vizag"] || 0})</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-[10px] font-black italic uppercase tracking-wider text-zinc-500 px-1">
                <span>ALL VISAKHAPATNAM HUBS</span>
                <button
                  onClick={handleRequestGPS}
                  disabled={isLocating}
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 hover:underline"
                >
                  <Crosshair className="w-3 h-3" />
                  <span>FILTER TO MY NEAREST AREA</span>
                </button>
              </div>
            )}

            <WavesLocalityFilter
              selectedLocality={selectedLocality}
              onSelectLocality={handleSelectLocality}
              localityCounts={localityCounts}
              detectedLocality={detectedLocality}
              distanceKm={detectedDistanceKm}
              onRequestLocation={handleRequestGPS}
              isLocating={isLocating}
            />
          </div>

          {/* Category Filter Pills */}
          <WavesCategoryFilter
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
            categoryCounts={categoryCounts}
          />
        </div>

        {/* ══════════════════════════════════════════════════════════
            ZONE DISPLAY: BASED ON SELECTED TAB
            ══════════════════════════════════════════════════════════ */}

        {/* VIEW 1: ALL RADAR (Overview Mode) */}
        {activeTab === "all" && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Live Waves Strip (Spotlight Carousel with quick Grid toggle) */}
            <div>
              <WavesLiveStrip
                liveWaves={filteredLiveWaves}
                onExpireDrop={handleDropExpired}
                onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
                onShowAllWaves={selectedLocality !== "All Vizag" ? handleShowAllWaves : undefined}
              />
            </div>

            {/* Scheduled Waves Spotlight */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                    <h2 className="text-lg sm:text-2xl font-black italic uppercase tracking-tight text-zinc-950">
                      UPCOMING SCHEDULED WAVES
                    </h2>
                    <span className="text-[10px] sm:text-xs font-mono font-black italic bg-amber-100 text-amber-900 px-2 py-0.2 rounded-full">
                      {filteredScheduledWaves.length}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">
                    Confirmed upcoming pop-ups locked in by vendors with explicit times.
                  </p>
                </div>

                {filteredScheduledWaves.length > 3 && (
                  <button
                    onClick={() => setActiveTab("scheduled")}
                    className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black italic uppercase tracking-wider text-amber-700 hover:text-amber-900 transition-colors"
                  >
                    <span>VIEW ALL ({filteredScheduledWaves.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {filteredScheduledWaves.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
                  {filteredScheduledWaves.slice(0, 3).map((item) => (
                    <ScheduledWaveCard key={item.stall.id} scheduledWave={item} />
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-[20px] bg-white border border-zinc-200/80 text-center space-y-2">
                  <p className="text-xs text-zinc-500 font-medium">No scheduled waves in {selectedLocality}.</p>
                  {selectedLocality !== "All Vizag" && (
                    <button
                      onClick={handleShowAllWaves}
                      className="text-xs font-black italic uppercase text-primary hover:underline"
                    >
                      SHOW ALL VIZAG SCHEDULED
                    </button>
                  )}
                </div>
              )}
            </section>

            {/* Offline Directory Preview */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-zinc-400 shrink-0" />
                    <h2 className="text-lg sm:text-2xl font-black italic uppercase tracking-tight text-zinc-950">
                      VIZAG DIRECTORY &amp; PAST WAVES
                    </h2>
                    <span className="text-[10px] sm:text-xs font-mono font-black italic bg-zinc-100 text-zinc-700 px-2 py-0.2 rounded-full">
                      {filteredOfflineDirectory.length}
                    </span>
                  </div>
                  <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">
                    Stalls packed up for today. Marked offline to eliminate empty trips.
                  </p>
                </div>

                {filteredOfflineDirectory.length > 4 && (
                  <button
                    onClick={() => setActiveTab("directory")}
                    className="inline-flex items-center gap-1 text-[11px] sm:text-xs font-black italic uppercase tracking-wider text-zinc-600 hover:text-black transition-colors"
                  >
                    <span>EXPLORE ALL ({filteredOfflineDirectory.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {filteredOfflineDirectory.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {filteredOfflineDirectory.slice(0, 4).map((stall) => (
                    <OfflineStallCard key={stall.id} stall={stall} />
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-[20px] bg-white border border-zinc-200 text-center space-y-2">
                  <p className="text-xs text-zinc-500">No stalls found in {selectedLocality}.</p>
                  {selectedLocality !== "All Vizag" && (
                    <button
                      onClick={handleShowAllWaves}
                      className="text-xs font-black italic uppercase text-primary hover:underline"
                    >
                      SHOW ALL VIZAG STALLS
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>
        )}

        {/* VIEW 2: LIVE NOW (Dedicated 19+ Drops Feed with Grid/Carousel Toggle) */}
        {activeTab === "live" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <WavesLiveStrip
              liveWaves={filteredLiveWaves}
              onExpireDrop={handleDropExpired}
              onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
              onShowAllWaves={selectedLocality !== "All Vizag" ? handleShowAllWaves : undefined}
              defaultViewMode="grid"
            />
          </div>
        )}

        {/* VIEW 3: SCHEDULED WAVES (Dedicated 32+ Board with Day Filters) */}
        {activeTab === "scheduled" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Header + Day Sub-filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-black/5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                  <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-zinc-950">
                    ALL CONFIRMED SCHEDULED WAVES
                  </h2>
                  <span className="text-xs font-mono font-black italic bg-amber-100 text-amber-900 px-2 py-0.2 rounded-full">
                    {filteredScheduledWaves.length}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">
                  Filter by day or locality to plan your visits across Visakhapatnam.
                </p>
              </div>

              {/* Day filter pills */}
              <div className="flex items-center gap-1.5 self-start sm:self-auto overflow-x-auto no-scrollbar">
                {(["all", "today", "tomorrow", "weekend"] as DayFilter[]).map((df) => (
                  <button
                    key={df}
                    onClick={() => setScheduledDayFilter(df)}
                    className={`px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-black italic uppercase tracking-wider transition-all active:scale-95 ${
                      scheduledDayFilter === df
                        ? "bg-amber-600 text-white shadow-sm"
                        : "bg-zinc-100 text-zinc-600 hover:text-black"
                    }`}
                  >
                    {df === "all" ? "ALL DATES" : df}
                  </button>
                ))}
              </div>
            </div>

            {filteredScheduledWaves.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
                  {filteredScheduledWaves.slice(0, scheduledVisibleLimit).map((item) => (
                    <ScheduledWaveCard key={item.stall.id} scheduledWave={item} />
                  ))}
                </div>

                {filteredScheduledWaves.length > scheduledVisibleLimit && (
                  <div className="text-center pt-2">
                    <button
                      onClick={() => setScheduledVisibleLimit((prev) => prev + 6)}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-black italic uppercase tracking-wider bg-white hover:bg-zinc-50 text-zinc-800 border border-black/10 shadow-sm transition-all active:scale-95"
                    >
                      <span>LOAD MORE SCHEDULED WAVES ({filteredScheduledWaves.length - scheduledVisibleLimit} REMAINING)</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 rounded-[20px] bg-white border border-zinc-200 text-center space-y-2">
                <Calendar className="w-8 h-8 text-amber-500/60 mx-auto mb-2" />
                <h3 className="text-xs sm:text-sm font-black italic uppercase tracking-wider text-zinc-800">
                  NO WAVES SCHEDULED FOR THIS DATE &amp; AREA
                </h3>
                <p className="text-[11px] text-zinc-500 mt-1">
                  Try switching the day filter or selecting &quot;All Vizag&quot;.
                </p>
                {selectedLocality !== "All Vizag" && (
                  <button
                    onClick={handleShowAllWaves}
                    className="inline-block mt-2 px-4 py-2 rounded-full text-xs font-black italic uppercase tracking-wider bg-amber-600 text-white shadow-sm hover:bg-amber-700"
                  >
                    SHOW ALL VIZAG SCHEDULED
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 4: DIRECTORY (Dedicated 14+ Stalls Grid) */}
        {activeTab === "directory" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="pb-2 border-b border-black/5">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-zinc-400 shrink-0" />
                <h2 className="text-xl sm:text-2xl font-black italic uppercase tracking-tight text-zinc-950">
                  VISAKHAPATNAM STALL DIRECTORY
                </h2>
                <span className="text-xs font-mono font-black italic bg-zinc-100 text-zinc-700 px-2 py-0.2 rounded-full">
                  {filteredOfflineDirectory.length}
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">
                Directory of permanent Beach Road &amp; Vizag pop-ups. Check their typical schedules below.
              </p>
            </div>

            {filteredOfflineDirectory.length > 0 ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {filteredOfflineDirectory.slice(0, directoryVisibleLimit).map((stall) => (
                    <OfflineStallCard key={stall.id} stall={stall} />
                  ))}
                </div>

                {filteredOfflineDirectory.length > directoryVisibleLimit && (
                  <div className="text-center pt-2">
                    <button
                      onClick={() => setDirectoryVisibleLimit((prev) => prev + 8)}
                      className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full text-xs font-black italic uppercase tracking-wider bg-white hover:bg-zinc-50 text-zinc-800 border border-black/10 shadow-sm transition-all active:scale-95"
                    >
                      <span>LOAD MORE STALLS ({filteredOfflineDirectory.length - directoryVisibleLimit} REMAINING)</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 rounded-[20px] bg-white border border-zinc-200 text-center space-y-2">
                <p className="text-xs text-zinc-500 font-medium">No stalls found matching this filter in {selectedLocality}.</p>
                {selectedLocality !== "All Vizag" && (
                  <button
                    onClick={handleShowAllWaves}
                    className="text-xs font-black italic uppercase text-primary hover:underline"
                  >
                    SHOW ALL VIZAG STALLS
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Resident Telegram Concierge & Vendor Callout Banner */}
        <div className="rounded-[24px] sm:rounded-[28px] p-5 sm:p-8 bg-gradient-to-r from-emerald-950 via-zinc-900 to-black text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-5 sm:gap-6 border border-emerald-500/20">
          <div className="space-y-1.5 max-w-xl text-center md:text-left">
            <span className="text-[9px] sm:text-[10px] font-black italic tracking-widest uppercase text-emerald-400 bg-white/10 px-2.5 py-0.5 rounded-full inline-block">
              FOR VENDORS &amp; CREATORS ACROSS VIZAG
            </span>
            <h3 className="text-lg sm:text-2xl font-black italic uppercase tracking-tight text-white leading-tight">
              POPPING UP IN VISAKHAPATNAM THIS WEEKEND?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
              Beach Road, Siripuram, MVP Colony, or Rushikonda. Pair once on Telegram, then broadcast live countdowns with: <code>/wave 3 Fresh cold brew ready!</code>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0 w-full md:w-auto">
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="w-full sm:w-auto px-6 py-3 rounded-full text-xs font-black italic uppercase tracking-wider bg-white hover:bg-zinc-100 text-black shadow-lg transition-all active:scale-95"
            >
              REGISTER VIZAG STALL
            </button>
            <a
              href="https://t.me/VibeCheckBot?start=waves"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-xs font-black italic uppercase tracking-wider bg-[#229ED9] hover:bg-[#1e8ec3] text-white shadow-lg transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>ASK BOT CONCIERGE</span>
            </a>
          </div>
        </div>
      </div>

      {/* MOBILE RESIDENT FLOATING CONTROLS (Discreet bottom-right corner controls) */}
      <div className="sm:hidden fixed bottom-4 right-3.5 z-40 flex items-center gap-2">
        <button
          onClick={() => fetchFeed(true)}
          disabled={isRefreshing}
          className="p-3 rounded-full bg-white/95 backdrop-blur-md text-zinc-700 shadow-lg border border-black/10 active:scale-95 transition-all"
          title="Refresh live radar"
          aria-label="Refresh live radar"
        >
          <RotateCcw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
        </button>

        <a
          href="https://t.me/VibeCheckBot?start=waves"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 py-2.5 px-4 rounded-full bg-[#229ED9] hover:bg-[#1e8ec3] text-white font-black italic uppercase text-[11px] shadow-lg shadow-[#229ED9]/30 active:scale-95 transition-all"
          title="Telegram AI Concierge"
          aria-label="Telegram AI Concierge"
        >
          <Send className="w-3.5 h-3.5" />
          <span>ASK BOT</span>
        </a>
      </div>

      {/* Modals */}
      <StallRegisterModal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        onSuccess={() => fetchFeed(true)}
      />

      <WavesExplainerModal
        isOpen={isExplainerModalOpen}
        onClose={() => setIsExplainerModalOpen(false)}
        onOpenRegisterModal={() => setIsRegisterModalOpen(true)}
      />
    </div>
  );
}
