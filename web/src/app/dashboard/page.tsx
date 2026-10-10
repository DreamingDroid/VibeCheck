"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession, signIn } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { PhoneVerificationModal } from "@/components/PhoneVerificationModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCity, isEventEnded, VibeEvent } from "@/context/CityContext";
import { useTheme } from "@/context/ThemeContext";
import { useTranslation } from "@/context/LanguageContext";
import { CategoryDecorations, getCategoryCardClass, getCategoryAccentColor, getCategoryBadgeClass, getCategoryDarkTitleColor } from "@/components/CategoryDecorations";
import { TicketPerforationDivider } from "@/components/TicketPerforationDivider";
import { Calendar as CalendarIcon, MapPin, Share2, Sparkles, TrendingUp, Zap, Users, ChevronLeft, ChevronRight, ArrowRight, ArrowLeft, Clock, Send, LayoutGrid, Globe, Search, X } from "lucide-react";
import { toast } from "sonner";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { isSameDay, startOfDay, isBefore, isAfter, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, format, isToday } from "date-fns";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { siteConfig } from "@/config/site";

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

function buildWhatsAppUrl(title: string, date: string, location: string, cityPrefix: string) {
  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const text = `Hey ${cityPrefix} Vibes! 👋 I saw *${title}* (${formattedDate} @ ${location}) on the website and I'd love to know more. Can you add me to the notification list?`;
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
}

function DashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentCity, events, isLoadingEvents: loading, selectedCategory, refreshEvents } = useCity();
  const { isVibrant } = useTheme();
  const { t, getCategoryLabel } = useTranslation();
  const [vipInvites, setVipInvites] = useState<any[]>([]);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [following, setFollowing] = useState<string[]>([]);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [userHasPhone, setUserHasPhone] = useState(false);
  const [userHasTelegram, setUserHasTelegram] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [forceCalendarOpen, setForceCalendarOpen] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week'>('month');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dashboardNews, setDashboardNews] = useState<any[]>([]);
  const [currentNewsIndex, setCurrentNewsIndex] = useState(0);
  const activeNews = dashboardNews[currentNewsIndex];
  const [fadeState, setFadeState] = useState<"visible" | "fading-out">("visible");
  const [isTickerHovered, setIsTickerHovered] = useState(false);

  const todayDate = new Date();
  const minWeekStart = startOfWeek(todayDate, { weekStartsOn: 1 });
  const maxWeekStart = startOfWeek(new Date(todayDate.getFullYear(), 11, 31), { weekStartsOn: 1 });
  const canGoPrevWeek = isAfter(startOfDay(currentWeekStart), startOfDay(minWeekStart));
  const canGoNextWeek = isBefore(startOfDay(currentWeekStart), startOfDay(maxWeekStart));

  const fetchVipInvites = async (userEmail: string) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/user/vip-invites?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setVipInvites(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch VIP invites:", err);
    }
  };

  const { isPulling, pullDistance, isRefreshing } = usePullToRefresh(async () => {
    await refreshEvents();
    if (session?.user?.email) {
      fetchVipInvites(session.user.email);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/user?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data) {
            setUserHasPhone(Boolean(res.data.phone_number));
            setUserHasTelegram(Boolean(res.data.telegram_chat_id));
          }
        })
        .catch(() => {});
    }
    if (currentCity) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      try {
        const res = await fetch(`${baseUrl}/api/news?city=${encodeURIComponent(currentCity)}`);
        const json = await res.json();
        if (json.success && json.data) {
          setDashboardNews(json.data.slice(0, 4));
          setCurrentNewsIndex(0);
          setFadeState("visible");
        }
      } catch (err) {}
    }
  });

  useEffect(() => {
    if (searchParams?.get('view') === 'calendar') {
      setForceCalendarOpen(true);
    } else {
      setForceCalendarOpen(false);
    }
  }, [searchParams]);

  useEffect(() => {
    if (session?.user?.email) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/user?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data) {
            setUserHasPhone(Boolean(res.data.phone_number));
            setUserHasTelegram(Boolean(res.data.telegram_chat_id));
          } else {
            setUserHasPhone(false);
            setUserHasTelegram(false);
          }
        })
        .catch(err => console.error("Could not fetch user preferences", err));

      fetchVipInvites(session.user.email);
    } else {
      setUserHasPhone(false);
      setUserHasTelegram(false);
    }
  }, [session]);

  useEffect(() => {
    if (currentCity) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/news?city=${encodeURIComponent(currentCity)}`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data) {
            setDashboardNews(res.data.slice(0, 4));
            setCurrentNewsIndex(0);
            setFadeState("visible");
          }
        })
        .catch(err => console.error("Could not fetch news", err));
    }
  }, [currentCity]);

  useEffect(() => {
    if (dashboardNews.length <= 1) return;
    if (isTickerHovered && siteConfig.pauseTickerOnHover) return;

    const durationSeconds = siteConfig.rssItemDurationSeconds ?? siteConfig.rssTickerSpeedSeconds ?? 3;
    const totalMs = Math.max(1, durationSeconds) * 1000;
    const fadeOutMs = 400;
    const visibleMs = Math.max(400, totalMs - fadeOutMs);

    let switchTimeout: NodeJS.Timeout;
    const fadeTimeout = setTimeout(() => {
      setFadeState("fading-out");

      switchTimeout = setTimeout(() => {
        setCurrentNewsIndex((prev) => (prev + 1) % dashboardNews.length);
        setFadeState("visible");
      }, fadeOutMs);
    }, visibleMs);

    return () => {
      clearTimeout(fadeTimeout);
      if (switchTimeout) clearTimeout(switchTimeout);
    };
  }, [dashboardNews.length, currentNewsIndex, isTickerHovered]);

  const handleJoinTelegram = () => {
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'VibeCheckSpaceBot';
    const payload = session?.user?.email
      ? `user_${encodeURIComponent(session.user.email)}`
      : 'ping_vibecheck';
    window.open(`https://t.me/${botUsername}?start=${payload}`, '_blank');
  };

  const handleJoinWhatsApp = () => {
    handleJoinTelegram();
  };

  const handleSharePlatform = async () => {
    const shareData = {
      title: "VibeCheck",
      text: "Join VibeCheck - the ultimate insider's guide to networking, discovery and culture in Visakhapatnam!",
      url: window.location.origin,
    };
    
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success("Platform shared successfully!");
      } catch (err) {
        // user cancelled or error
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.origin);
        toast.success("VibeCheck link copied to clipboard!");
      } catch (err) {
        toast.error("Failed to copy link.");
      }
    }
  };

  const handleShareEvent = async (e: React.MouseEvent, event: VibeEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const shareUrl = `${origin}/event/${event.id}`;
    const shareData = {
      title: `${event.title} | VibeCheck`,
      text: `Check out ${event.title} happening on VibeCheck!`,
      url: shareUrl,
    };
    
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success("Event shared!");
      } catch (err) {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Event link copied to clipboard!");
      } catch (err) {
        toast.error("Failed to copy link.");
      }
    }
  };

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/admin/settings`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          const val = res.data.whatsapp_enabled;
          setWhatsappEnabled(val === undefined || val === "true" || val === true);
        }
      })
      .catch(err => console.error("Could not fetch settings", err));
  }, []);


  const fetchFollowing = async () => {
    if (!session?.user?.email) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/followers/user/${session.user.email}`);
      const data = await res.json();
      if (data.success) setFollowing(data.data);
    } catch (err) {
      console.error("Failed to fetch following:", err);
    }
  };

  const toggleFollow = async (e: React.MouseEvent, organizerEmail: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session?.user?.email) {
      // toast.error("Please login to follow organizers");
      return;
    }
    const isFollowing = following.includes(organizerEmail);
    const method = isFollowing ? "DELETE" : "POST";
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/followers`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: session.user.email, organizerEmail })
      });
      const data = await res.json();
      if (data.success) {
        if (isFollowing) {
          setFollowing(following.filter(email => email !== organizerEmail));
        } else {
          setFollowing([...following, organizerEmail]);
        }
      }
    } catch (err) {
      console.error("Failed to toggle follow:", err);
    }
  };


  useEffect(() => {
    if (session?.user?.email) {
      fetchFollowing();
    }
  }, [session]);

  // Color mapping for Joyful vibe
  const getCategoryColor = (cat: string) => {
    return getCategoryBadgeClass(cat);
  };

  if (loading) return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
       <div className="h-[400px] w-full bg-zinc-100 animate-pulse rounded-[40px] mb-8" />
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <div className="h-64 bg-zinc-100 animate-pulse rounded-[40px]" />
         <div className="h-64 bg-zinc-100 animate-pulse rounded-[40px]" />
         <div className="h-64 bg-zinc-100 animate-pulse rounded-[40px]" />
       </div>
    </div>
  );

  const searchParamQuery = searchParams.get("q") || searchParams.get("search");
  const timeframeParam = searchParams.get("timeframe");

  const activeEvents = events.filter(ev => !isEventEnded(ev));

  let filteredEvents = activeEvents;

  // 1. Search query filter
  if (searchParamQuery && searchParamQuery.trim()) {
    const clean = searchParamQuery.trim().toLowerCase();
    const queryTerms = new Set<string>([clean]);

    if (clean.endsWith('ing') && clean.length > 4) {
      const base = clean.slice(0, -3);
      queryTerms.add(base);
      if (base.length >= 3 && base[base.length - 1] === base[base.length - 2]) {
        queryTerms.add(base.slice(0, -1));
      }
      queryTerms.add(base + 'e');
    }

    if (clean.endsWith('ies') && clean.length > 4) {
      queryTerms.add(clean.slice(0, -3) + 'y');
    } else if (clean.endsWith('es') && clean.length > 4) {
      queryTerms.add(clean.slice(0, -2));
      queryTerms.add(clean.slice(0, -1));
    } else if (clean.endsWith('s') && clean.length > 3) {
      queryTerms.add(clean.slice(0, -1));
    }

    if ((clean.endsWith('er') || clean.endsWith('ers')) && clean.length > 4) {
      const base = clean.replace(/ers?$/, '');
      queryTerms.add(base);
      if (base.length >= 3 && base[base.length - 1] === base[base.length - 2]) {
        queryTerms.add(base.slice(0, -1));
      }
    }

    const words = clean.split(/\s+/).filter(w => w.length >= 3);
    if (words.length > 1) {
      words.forEach(w => queryTerms.add(w));
    }

    const termsArray = Array.from(queryTerms).filter(t => t.length >= 2);

    filteredEvents = filteredEvents.filter(ev => {
      const targetText = `${ev.title || ''} ${ev.description || ''} ${ev.category || ''} ${ev.location || ''} ${ev.city || ''} ${ev.organizer_email || ''}`.toLowerCase();
      return termsArray.some(term => targetText.includes(term));
    });
  }

  // 2. Timeframe filter
  if (timeframeParam) {
    const now = new Date();
    if (timeframeParam === 'today') {
      filteredEvents = filteredEvents.filter(ev => isToday(new Date(ev.date_time)));
    } else if (timeframeParam === 'tomorrow') {
      const tomorrow = addDays(now, 1);
      filteredEvents = filteredEvents.filter(ev => isSameDay(new Date(ev.date_time), tomorrow));
    } else if (timeframeParam === 'this_weekend') {
      filteredEvents = filteredEvents.filter(ev => {
        const d = new Date(ev.date_time);
        const day = d.getDay(); // 0 is Sun, 5 is Fri, 6 is Sat
        const diffDays = (d.getTime() - now.getTime()) / (1000 * 3600 * 24);
        return (day === 0 || day === 6 || (day === 5 && d.getHours() >= 16)) && diffDays >= -1 && diffDays <= 7;
      });
    } else if (timeframeParam === 'next_weekend') {
      filteredEvents = filteredEvents.filter(ev => {
        const d = new Date(ev.date_time);
        const day = d.getDay(); // 0 is Sun, 5 is Fri, 6 is Sat
        const diffDays = (d.getTime() - now.getTime()) / (1000 * 3600 * 24);
        return (day === 0 || day === 6 || (day === 5 && d.getHours() >= 16)) && diffDays > 5 && diffDays <= 14;
      });
    } else if (timeframeParam === 'this_week') {
      filteredEvents = filteredEvents.filter(ev => {
        const diffDays = (new Date(ev.date_time).getTime() - now.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 7;
      });
    } else if (timeframeParam === 'this_month') {
      filteredEvents = filteredEvents.filter(ev => {
        const diffDays = (new Date(ev.date_time).getTime() - now.getTime()) / (1000 * 3600 * 24);
        return diffDays >= 0 && diffDays <= 30;
      });
    }
  }

  // 3. Category filter
  if (selectedCategory && selectedCategory !== "The Latest") {
    filteredEvents = filteredEvents.filter(ev => ev.category.toLowerCase() === selectedCategory.toLowerCase());
  }

  let displayEvents = filteredEvents;
  if (selectedDate) {
    displayEvents = activeEvents.filter(ev => isSameDay(new Date(ev.date_time), selectedDate));
  }

  const isCategoryEmpty = filteredEvents.length === 0;
  const showCalendarView = (isCategoryEmpty || forceCalendarOpen) && !selectedDate;
  
  const featuredEvent = !selectedDate ? displayEvents.find(ev => Boolean(ev.is_featured)) : undefined;
  const isFeaturedRsvped = Boolean(
    featuredEvent?.user_rsvped ||
    (session?.user?.email && vipInvites.some(v => v.id === featuredEvent?.id && (v.rsvp_status === 'going' || v.rsvp_status === 'confirmed' || v.rsvp_status === 'pending')))
  );
  const otherEvents = featuredEvent ? displayEvents.filter(ev => ev.id !== featuredEvent.id) : displayEvents;
  const getCalendarDensityStyle = (count: number, isPastDate: boolean, isTodayDate: boolean) => {
    if (count === 0) {
      if (isPastDate) {
        return {
          bg: "bg-white/60 md:bg-zinc-50/40",
          border: "border border-black/5 md:border-2 md:border-black/5",
          text: "text-zinc-300 md:text-zinc-300",
          hover: "hover:bg-zinc-50 md:hover:border-black/20",
          desktopDateNum: "text-zinc-300",
          barColor: "bg-zinc-300",
          badgeBg: "bg-black/5 text-zinc-400",
          isDark: false,
        };
      }
      if (isTodayDate) {
        return {
          bg: "bg-violet-50/70 md:bg-violet-50/50",
          border: "border-2 border-violet-500 md:border-2 border-violet-500",
          text: "text-violet-600 font-black",
          hover: "hover:bg-violet-100/70 md:hover:border-violet-600 md:hover:shadow-[3px_3px_0px_0px_rgba(139,92,246,1)]",
          desktopDateNum: "text-violet-600",
          barColor: "bg-violet-500",
          badgeBg: "bg-violet-100/80 text-violet-700",
          isDark: false,
        };
      }
      return {
        bg: "bg-white md:bg-white",
        border: "border border-black/10 md:border-2 md:border-black/5",
        text: "text-black font-bold md:text-black",
        hover: "hover:border-black hover:bg-zinc-50 md:hover:border-black md:hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] md:hover:-translate-y-0.5",
        desktopDateNum: "text-black group-hover:text-primary",
        barColor: "bg-black",
        badgeBg: "bg-black/5 text-zinc-400",
        isDark: false,
      };
    }

    if (isPastDate) {
      if (count <= 2) {
        return {
          bg: "bg-violet-100/70 md:bg-violet-100/60",
          border: "border border-violet-300/60 md:border-2 md:border-violet-300/60",
          text: "text-violet-900/80 font-black",
          hover: "hover:bg-violet-200/80 md:hover:border-violet-500 md:hover:shadow-[3px_3px_0px_0px_rgba(139,92,246,0.4)] md:hover:-translate-y-0.5",
          desktopDateNum: "text-violet-900/80",
          barColor: "bg-violet-800/60",
          badgeBg: "bg-violet-950/10 text-violet-950",
          isDark: false,
        };
      }
      return {
        bg: "bg-violet-200/80 md:bg-violet-200/70",
        border: "border border-violet-400/70 md:border-2 md:border-violet-400/70",
        text: "text-violet-950 font-black",
        hover: "hover:bg-violet-300/80 md:hover:border-violet-600 md:hover:shadow-[3px_3px_0px_0px_rgba(139,92,246,0.5)] md:hover:-translate-y-0.5",
        desktopDateNum: "text-violet-950",
        barColor: "bg-violet-900/70",
        badgeBg: "bg-violet-950/10 text-violet-950",
        isDark: false,
      };
    }

    // Active / upcoming dates with events (Electric Violet / Cyber Iris Progression)
    if (count === 1) {
      return {
        bg: "bg-violet-100 md:bg-violet-100",
        border: "border border-violet-300 md:border-2 md:border-violet-300",
        text: "text-violet-950 font-black",
        hover: "hover:bg-violet-200 hover:border-violet-400 md:hover:border-violet-500 md:hover:shadow-[3px_3px_0px_0px_rgba(139,92,246,0.5)] md:hover:-translate-y-0.5",
        desktopDateNum: "text-violet-950",
        barColor: "bg-violet-900/80",
        badgeBg: "bg-violet-950/10 text-violet-950",
        isDark: false,
      };
    }
    if (count === 2) {
      return {
        bg: "bg-violet-200 md:bg-violet-200",
        border: "border border-violet-400 md:border-2 md:border-violet-400",
        text: "text-violet-950 font-black",
        hover: "hover:bg-violet-300 hover:border-violet-500 md:hover:border-violet-600 md:hover:shadow-[3px_3px_0px_0px_rgba(139,92,246,0.7)] md:hover:-translate-y-0.5",
        desktopDateNum: "text-violet-950",
        barColor: "bg-violet-950",
        badgeBg: "bg-violet-950/10 text-violet-950",
        isDark: false,
      };
    }
    if (count === 3) {
      return {
        bg: "bg-violet-400 md:bg-violet-400",
        border: "border border-violet-500 md:border-2 md:border-violet-500",
        text: "text-violet-950 font-black",
        hover: "hover:bg-violet-500 hover:border-violet-600 md:hover:border-violet-700 md:hover:shadow-[3px_3px_0px_0px_rgba(124,58,237,0.8)] md:hover:-translate-y-0.5",
        desktopDateNum: "text-violet-950",
        barColor: "bg-violet-950",
        badgeBg: "bg-violet-950/15 text-violet-950",
        isDark: false,
      };
    }
    if (count <= 5) {
      return {
        bg: "bg-violet-600 md:bg-violet-600",
        border: "border border-violet-700 md:border-2 md:border-violet-700",
        text: "text-white font-black drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]",
        hover: "hover:bg-violet-700 hover:border-violet-800 md:hover:border-violet-800 md:hover:shadow-[3px_3px_0px_0px_rgba(109,40,217,0.9)] md:hover:-translate-y-0.5",
        desktopDateNum: "text-white",
        barColor: "bg-white/90",
        badgeBg: "bg-white/20 text-white",
        isDark: true,
      };
    }
    return {
      bg: "bg-violet-900 md:bg-violet-900",
      border: "border border-violet-950 md:border-2 md:border-violet-950",
      text: "text-white font-black drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]",
      hover: "hover:bg-black hover:border-black md:hover:border-black md:hover:shadow-[3px_3px_0px_0px_rgba(76,29,149,1)] md:hover:-translate-y-0.5",
      desktopDateNum: "text-white",
      barColor: "bg-white",
      badgeBg: "bg-white/20 text-white",
      isDark: true,
    };
  };

  return (
    <main className={`w-full ${showCalendarView ? 'pb-6' : 'pb-12'}`}>
      {/* Pull to refresh indicator */}
      <div 
        className="w-full flex items-center justify-center overflow-hidden transition-all duration-200 bg-zinc-50"
        style={{ height: isRefreshing || isPulling ? `${pullDistance}px` : '0px' }}
      >
        <div className={`flex flex-col items-center justify-center transition-opacity duration-200 ${isPulling || isRefreshing ? 'opacity-100' : 'opacity-0'}`}>
          <div className={`w-6 h-6 border-2 border-primary border-t-transparent rounded-full ${isRefreshing ? 'animate-spin' : ''}`} style={{ transform: isRefreshing ? 'none' : `rotate(${pullDistance * 3}deg)` }} />
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mt-2">
            {isRefreshing ? 'Refreshing Vibes...' : 'Pull to refresh'}
          </span>
        </div>
      </div>

      {/* Local Currents RSS Feed Banner at the top */}
      {dashboardNews.length > 0 && activeNews && (
        <div 
          className="w-full bg-white/70 backdrop-blur-md border-b border-primary/20 bg-gradient-to-r from-emerald-500/5 via-primary/10 to-teal-500/5 text-zinc-900 py-3 md:py-3.5 overflow-hidden relative shadow-[0_4px_20px_rgba(0,0,0,0.03)] select-none transition-colors"
          onMouseEnter={() => setIsTickerHovered(true)}
          onMouseLeave={() => setIsTickerHovered(false)}
        >
          <div className="absolute left-0 top-0 bottom-0 w-3 md:w-8 bg-gradient-to-r from-background/90 via-background/40 to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-3 md:w-8 bg-gradient-to-l from-background/90 via-background/40 to-transparent z-10 pointer-events-none" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-center min-h-[28px] min-w-0 w-full overflow-hidden">
            <div
              className={`w-full max-w-full min-w-0 flex items-center justify-center transition-all duration-400 ease-in-out transform ${
                fadeState === "fading-out"
                  ? "opacity-0 -translate-y-2.5 scale-[0.98] blur-[0.5px]"
                  : "opacity-100 translate-y-0 scale-100 blur-0"
              }`}
            >
              <Link 
                key={`${activeNews.id}-${currentNewsIndex}`} 
                href={`/local-currents?id=${activeNews.id}`} 
                className="flex items-center justify-center gap-2 md:gap-3 group hover:text-primary transition-colors text-center animate-in fade-in slide-in-from-bottom-2.5 duration-500 ease-out max-w-full min-w-0"
              >
                <span className="sticker-badge bg-primary text-black text-[10px] font-black uppercase py-0.5 px-2.5 shrink-0 border-none shadow-sm">
                  {activeNews.category}
                </span>
                <span className="font-black italic tracking-widest uppercase text-xs md:text-sm text-zinc-800 group-hover:text-primary group-hover:underline transition-colors truncate min-w-0 text-left sm:text-center">
                  {activeNews.title}
                </span>
                <Sparkles className="h-4 w-4 text-primary ml-1 shrink-0 hidden sm:block transition-transform group-hover:scale-125" />
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 pt-4 sm:pt-6 flex flex-col ${showCalendarView ? 'gap-4' : 'gap-8 md:gap-12'}`}>



      {/* Calendar Empty State / Calendar View */}
      {showCalendarView && (
        <section className="flex flex-col items-center justify-center space-y-4 md:space-y-5 animate-in fade-in duration-500 w-full mt-2 md:mt-4 relative max-w-6xl mx-auto">
          <div className="text-center space-y-2 relative w-full flex flex-col items-center">
            <p className="text-[10px] md:text-xs font-bold tracking-[0.25em] uppercase text-primary">COMMUNITY CALENDAR</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black italic tracking-tighter uppercase leading-none">
              {isCategoryEmpty ? "No Upcoming Vibes" : "Plan Your Vibes"}
            </h2>
            {!isCategoryEmpty && (
              <p className="text-zinc-500 font-medium text-xs sm:text-sm max-w-lg mx-auto">
                Select a date or browse the weekly schedule to see what's happening.
              </p>
            )}

            {/* View Mode Toggle: Month vs Week */}
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-full border border-black/5 shadow-inner mt-2">
              <button
                onClick={() => setCalendarViewMode('month')}
                className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider transition-all ${
                  calendarViewMode === 'month' 
                    ? 'bg-black text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-black'
                }`}
              >
                Month View
              </button>
              <button
                onClick={() => setCalendarViewMode('week')}
                className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-wider transition-all ${
                  calendarViewMode === 'week' 
                    ? 'bg-black text-white shadow-sm' 
                    : 'text-zinc-500 hover:text-black'
                }`}
              >
                Week View
              </button>
            </div>
          </div>
          
          <div className={`w-full p-3 sm:p-5 md:p-6 rounded-2xl md:rounded-[24px] border-2 md:border-4 border-white shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] overflow-hidden relative bg-gradient-to-br from-white via-zinc-50 to-zinc-100/80 ${isVibrant ? 'vibe-hover-lift' : ''}`}>
            {isVibrant && (
              <div 
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `
                    radial-gradient(circle at 100% 0%, rgba(25, 167, 78, 0.15) 0%, rgba(25, 167, 78, 0.06) 35%, rgba(25, 167, 78, 0.01) 60%, transparent 75%),
                    radial-gradient(circle at 0% 100%, rgba(168, 85, 247, 0.14) 0%, rgba(168, 85, 247, 0.05) 35%, rgba(168, 85, 247, 0.01) 60%, transparent 75%)
                  `
                }}
              />
            )}
            
            {calendarViewMode === 'month' ? (
              <div className="relative z-10 w-full [&_table]:block [&_table]:mt-2 md:[&_table]:mt-4 [&_table]:w-full [&_thead]:block [&_tbody]:block [&_tr]:grid [&_tr]:grid-cols-7 [&_tr]:gap-1 sm:[&_tr]:gap-1.5 md:[&_tr]:gap-2.5 [&_tr]:mb-1 sm:[&_tr]:mb-1.5 md:[&_tr]:mb-2 [&_th]:block [&_td]:block [&_th]:text-center [&_th]:text-zinc-400 [&_th]:font-black [&_th]:uppercase [&_th]:tracking-[0.15em] [&_th]:text-[9px] md:[&_th]:text-[11px] [&_th]:pb-1 sm:[&_th]:pb-2">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  showOutsideDays
                  fromMonth={new Date()}
                  toMonth={new Date(new Date().getFullYear(), 11)}
                  className="w-full bg-transparent p-0 m-0 font-helvetica"
                  classNames={{
                    months: "w-full flex flex-col",
                    month: "w-full",
                    caption: "relative flex justify-center items-center h-9 sm:h-10 mb-2 sm:mb-3 md:mb-4 w-full",
                    caption_label: "text-lg sm:text-2xl md:text-3xl font-black italic uppercase tracking-tighter text-center w-full flex justify-center items-center",
                    nav: "absolute top-0 left-0 right-0 h-9 sm:h-10 grid grid-cols-2 items-center pointer-events-none z-20",
                    button_previous: "col-start-1 justify-self-start h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] pointer-events-auto aria-disabled:hidden",
                    button_next: "col-start-2 justify-self-end h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-colors bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-y-[2px] hover:translate-x-[2px] pointer-events-auto aria-disabled:hidden",
                    day: "w-full aspect-square md:aspect-auto flex items-center justify-center p-0.5 sm:p-1 md:p-0",
                    day_selected: "",
                    day_today: "",
                    day_outside: "",
                    day_disabled: "",
                    day_hidden: "invisible",
                  }}
                  components={{
                    DayButton: (props) => {
                      const { day, modifiers } = props;
                      const dateEvents = activeEvents.filter(e => isSameDay(new Date(e.date_time), day.date));
                      const isPastDate = isBefore(startOfDay(day.date), startOfDay(new Date()));
                      const isTodayDate = isToday(day.date);
                      const isSelected = !!modifiers.selected || (!!selectedDate && isSameDay(selectedDate, day.date));
                      const count = modifiers.outside ? 0 : dateEvents.length;

                      if (modifiers.outside) {
                        return (
                          <button
                            {...props}
                            className="w-full aspect-square max-w-[50px] mx-auto rounded-full flex items-center justify-center text-zinc-300 font-black italic text-base opacity-30 cursor-default md:aspect-auto md:max-w-none md:h-16 lg:h-[72px] md:rounded-2xl md:p-2.5 md:flex md:flex-col md:items-start md:justify-start md:bg-zinc-50/50 md:border-2 md:border-black/5 md:hover:border-black/5 md:hover:shadow-none md:hover:translate-y-0 md:font-normal md:not-italic"
                            disabled
                          >
                            <span className="md:hidden leading-none select-none tracking-tighter tabular-nums italic font-black">
                              {day.date.getDate()}
                            </span>
                            <span className="hidden md:block text-zinc-300 font-black text-lg lg:text-xl leading-none select-none">
                              {day.date.getDate()}
                            </span>
                          </button>
                        );
                      }

                      const style = getCalendarDensityStyle(count, isPastDate, isTodayDate);
                      const tooltip = count > 0 
                        ? `${format(day.date, 'MMM d, yyyy')}: ${count} ${count === 1 ? 'event' : 'events'}\n${dateEvents.map(e => `• ${e.title}`).join('\n')}`
                        : format(day.date, 'MMM d, yyyy');

                      // Desktop selection classes
                      const desktopClasses = isSelected
                        ? "md:ring-4 md:ring-black md:ring-offset-2 md:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] md:scale-100 md:z-20"
                        : "";

                      return (
                        <button
                          {...props}
                          title={tooltip}
                          className={`w-full aspect-square max-w-[50px] mx-auto rounded-full flex items-center justify-center font-black italic text-base sm:text-lg transition-all cursor-pointer relative shadow-xs ${style.bg} ${style.border} ${style.text} ${style.hover} ${
                            isSelected
                              ? "ring-4 ring-black ring-offset-2 scale-105 shadow-md z-20"
                              : "hover:scale-105 active:scale-95"
                          } md:aspect-auto md:max-w-none md:h-16 lg:h-[72px] md:rounded-2xl md:p-2.5 md:flex md:flex-col md:items-start md:justify-between md:not-italic md:group md:overflow-hidden md:transition-all ${desktopClasses}`}
                        >
                          {/* Mobile view (<md): Centered number with density style */}
                          <div className="md:hidden flex flex-col items-center justify-center leading-none">
                            <span className="select-none tracking-tighter font-black italic tabular-nums">
                              {day.date.getDate()}
                            </span>
                            {isTodayDate && (
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-600 mt-0.5" />
                            )}
                          </div>

                          {/* Desktop view (>=md): Header with Date number, Today tag, and event badge */}
                          <div className="hidden md:flex w-full items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className={`leading-none transition-colors select-none font-black text-lg lg:text-xl ${
                                isTodayDate && count === 0
                                  ? "text-violet-600" 
                                  : isPastDate && count === 0
                                  ? "text-zinc-300" 
                                  : style.desktopDateNum
                              }`}>
                                {day.date.getDate()}
                              </span>
                              {isTodayDate && (
                                <span className={`text-[7px] font-black uppercase tracking-wider px-1 py-0.5 rounded leading-none ${
                                  style.isDark ? "bg-white/30 text-white" : "bg-violet-600 text-white"
                                }`}>
                                  TODAY
                                </span>
                              )}
                            </div>

                            {count > 0 && (
                              <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md leading-none ${
                                style.isDark 
                                  ? "bg-white/20 text-white" 
                                  : "bg-violet-950/10 text-violet-950"
                              }`}>
                                {count} {count === 1 ? "vibe" : "vibes"}
                              </span>
                            )}
                          </div>

                          {/* Desktop event indicator bars at the bottom */}
                          {dateEvents.length > 0 && !modifiers.outside && (
                            <div className="hidden md:flex w-full flex-col gap-0.5 z-10 mt-auto">
                              <div className="flex gap-1 flex-wrap w-full">
                                {dateEvents.slice(0, 3).map((ev, i) => (
                                  <div 
                                    key={i} 
                                    className={`h-1.5 flex-1 rounded-full ${style.barColor} shadow-xs transition-colors`} 
                                    title={ev.title} 
                                  />
                                ))}
                              </div>
                              {dateEvents.length > 3 && (
                                <span className={`text-[8px] font-black uppercase tracking-widest text-left leading-none transition-colors ${
                                  style.isDark ? 'text-white/90' : 'text-violet-950'
                                }`}>
                                  +{dateEvents.length - 3} MORE
                                </span>
                              )}
                            </div>
                          )}
                        </button>
                      );
                    },
                    Chevron: (props) => {
                      if (props.orientation === 'left') return <ArrowLeft className="h-4 w-4 md:h-5 md:w-5" />;
                      if (props.orientation === 'right') return <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />;
                      return <></>;
                    }
                  }}
                />

                {/* Heatmap Legend & Selection Controls */}
                <div className="mt-4 pt-3 border-t border-black/5 flex flex-wrap items-center justify-between gap-3 px-2 text-[10px] md:text-xs font-bold text-zinc-500">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-zinc-400">Events:</span>
                    <span className="text-[9px] md:text-[10px] uppercase font-bold text-zinc-400">Fewer</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3.5 h-3.5 rounded-md bg-violet-100 border border-violet-300" title="1 event" />
                      <div className="w-3.5 h-3.5 rounded-md bg-violet-200 border border-violet-400" title="2 events" />
                      <div className="w-3.5 h-3.5 rounded-md bg-violet-400 border border-violet-500" title="3 events" />
                      <div className="w-3.5 h-3.5 rounded-md bg-violet-600 border border-violet-700" title="4-5 events" />
                      <div className="w-3.5 h-3.5 rounded-md bg-violet-900 border border-violet-950" title="6+ events" />
                    </div>
                    <span className="text-[9px] md:text-[10px] uppercase font-bold text-zinc-400">More</span>
                  </div>
                  {selectedDate && (
                    <button
                      onClick={() => setSelectedDate(undefined)}
                      className="text-primary hover:underline font-black text-[10px] md:text-xs uppercase tracking-wider ml-auto"
                    >
                      Clear Selection ({format(selectedDate, 'MMM d')})
                    </button>
                  )}
                </div>
              </div>
            ) : (
              /* Week View - Heatmap & Vibe Count Cards */
              <div className="relative z-10 w-full space-y-4">
                {/* Week View Header / Navigation */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b border-black/5">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (canGoPrevWeek) {
                          setCurrentWeekStart(prev => subWeeks(prev, 1));
                        }
                      }}
                      disabled={!canGoPrevWeek}
                      className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full border-2 border-black flex items-center justify-center transition-colors bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                        !canGoPrevWeek
                          ? "opacity-30 cursor-not-allowed pointer-events-none shadow-none"
                          : "hover:bg-black hover:text-white hover:shadow-none hover:translate-y-[1px] hover:translate-x-[1px]"
                      }`}
                      title="Previous Week"
                      aria-disabled={!canGoPrevWeek}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="text-sm sm:text-base md:text-lg font-black uppercase tracking-tight italic">
                      {format(currentWeekStart, "MMM d")} – {format(endOfWeek(currentWeekStart, { weekStartsOn: 1 }), "MMM d, yyyy")}
                    </span>
                    <button
                      onClick={() => {
                        if (canGoNextWeek) {
                          setCurrentWeekStart(prev => addWeeks(prev, 1));
                        }
                      }}
                      disabled={!canGoNextWeek}
                      className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full border-2 border-black flex items-center justify-center transition-colors bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                        !canGoNextWeek
                          ? "opacity-30 cursor-not-allowed pointer-events-none shadow-none"
                          : "hover:bg-black hover:text-white hover:shadow-none hover:translate-y-[1px] hover:translate-x-[1px]"
                      }`}
                      title="Next Week"
                      aria-disabled={!canGoNextWeek}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      const today = new Date();
                      setCurrentWeekStart(startOfWeek(today, { weekStartsOn: 1 }));
                      setSelectedDate(today);
                    }}
                    className="ringer-button bg-zinc-100 hover:bg-zinc-200 text-black text-[10px] py-1 px-3 border border-black/10"
                  >
                    TODAY
                  </button>
                </div>

                {/* 7 Day Columns Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3">
                  {Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)).map((dayDate, idx) => {
                    const dayEvents = activeEvents.filter(e => isSameDay(new Date(e.date_time), dayDate));
                    const isTodayDate = isToday(dayDate);
                    const isPastDate = isBefore(startOfDay(dayDate), startOfDay(new Date()));
                    const isDaySelected = selectedDate && isSameDay(selectedDate, dayDate);
                    const count = dayEvents.length;
                    const style = getCalendarDensityStyle(count, isPastDate, isTodayDate);
                    const tooltip = count > 0 
                      ? `${format(dayDate, 'MMM d, yyyy')}: ${count} ${count === 1 ? 'event' : 'events'}\n${dayEvents.map(e => `• ${e.title}`).join('\n')}`
                      : format(dayDate, 'MMM d, yyyy');

                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedDate(dayDate)}
                        title={tooltip}
                        className={`p-3 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between h-36 sm:h-44 text-left group ${style.bg} ${style.border} ${style.text} ${style.hover} ${
                          isDaySelected
                            ? 'ring-4 ring-black ring-offset-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] scale-[1.02] z-20'
                            : 'hover:scale-105 active:scale-95'
                        }`}
                      >
                        {/* Day Column Header */}
                        <div className="w-full flex items-center justify-between">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${
                            style.isDark ? 'text-white/80' : 'text-zinc-500'
                          }`}>
                            {format(dayDate, "EEE")}
                          </span>
                          {isTodayDate && (
                            <span className={`text-[7px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded leading-none ${
                              style.isDark ? 'bg-white/30 text-white' : 'bg-violet-600 text-white'
                            }`}>
                              TODAY
                            </span>
                          )}
                        </div>

                        {/* Date Number & Vibe Count */}
                        <div className="my-auto flex flex-col items-start gap-1 w-full">
                          <span className={`text-2xl sm:text-3xl lg:text-4xl font-black leading-none italic ${
                            style.isDark 
                              ? 'text-white' 
                              : isTodayDate && count === 0 
                              ? 'text-violet-600' 
                              : isPastDate && count === 0 
                              ? 'text-zinc-300' 
                              : 'text-black'
                          }`}>
                            {format(dayDate, "d")}
                          </span>
                          
                          <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md leading-none ${
                            style.badgeBg
                          }`}>
                            {count > 0 ? `${count} ${count === 1 ? 'Vibe' : 'Vibes'}` : 'No Vibes'}
                          </span>
                        </div>

                        {/* Event indicator bars at the bottom */}
                        <div className="w-full mt-auto pt-1">
                          {count > 0 ? (
                            <div className="flex gap-1 w-full">
                              {dayEvents.slice(0, 3).map((ev, i) => (
                                <div 
                                  key={i} 
                                  className={`h-1.5 flex-1 rounded-full ${style.barColor} shadow-xs transition-colors`} 
                                  title={ev.title} 
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="h-1.5 w-full rounded-full bg-black/5" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Heatmap Legend in Week View */}
                <div className="mt-4 pt-3 border-t border-black/5 flex flex-wrap items-center justify-between gap-3 px-2 text-[10px] md:text-xs font-bold text-zinc-500">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] md:text-[10px] font-black uppercase tracking-wider text-zinc-400">Events:</span>
                    <span className="text-[9px] md:text-[10px] uppercase font-bold text-zinc-400">Fewer</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3.5 h-3.5 rounded-md bg-violet-100 border border-violet-300" title="1 event" />
                      <div className="w-3.5 h-3.5 rounded-md bg-violet-200 border border-violet-400" title="2 events" />
                      <div className="w-3.5 h-3.5 rounded-md bg-violet-400 border border-violet-500" title="3 events" />
                      <div className="w-3.5 h-3.5 rounded-md bg-violet-600 border border-violet-700" title="4-5 events" />
                      <div className="w-3.5 h-3.5 rounded-md bg-violet-900 border border-violet-950" title="6+ events" />
                    </div>
                    <span className="text-[9px] md:text-[10px] uppercase font-bold text-zinc-400">More</span>
                  </div>
                  {selectedDate && (
                    <button
                      onClick={() => setSelectedDate(undefined)}
                      className="text-primary hover:underline font-black text-[10px] md:text-xs uppercase tracking-wider ml-auto"
                    >
                      Clear Selection ({format(selectedDate, 'MMM d')})
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Selected Date Header & Back to Calendar Button */}
      {selectedDate && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 pb-2">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-zinc-900 text-white flex items-center justify-center font-black shadow-md">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight italic text-black">
                Events on {format(selectedDate, 'EEEE, MMMM d')}
              </h2>
              <p className="text-xs font-bold text-zinc-500">
                {displayEvents.length} {displayEvents.length === 1 ? 'event' : 'events'} scheduled
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setSelectedDate(undefined);
              setForceCalendarOpen(true);
              router.push('/dashboard?view=calendar');
            }}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-black px-4 py-2.5 rounded-full transition-all self-start sm:self-auto shadow-xs"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Calendar
          </button>
        </div>
      )}

      {/* Exclusive VIP Invitations Section */}
      {vipInvites.length > 0 && !showCalendarView && (
        vipInvites.length === 1 ? (
          (() => {
            const vip = vipInvites[0];
            const formattedDate = new Date(vip.date_time).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
            const timeStr = new Date(vip.date_time).toLocaleTimeString(undefined, {
              hour: "2-digit",
              minute: "2-digit",
            });

            return (
              <section className="relative overflow-hidden rounded-2xl md:rounded-[24px] bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/70 border-2 border-amber-400/40 shadow-[0_12px_40px_-5px_rgba(245,158,11,0.25)] animate-in fade-in duration-500 group">
                {/* Ambient glow & VIP watermark */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl pointer-events-none translate-y-1/2 -translate-x-1/2" />
                <div className="absolute right-6 bottom-2 text-white/[0.03] font-black text-8xl md:text-9xl uppercase italic tracking-tighter select-none pointer-events-none">
                  VIP
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row items-stretch">
                  {/* Left Column: VIP Announcement & Invitation Info */}
                  <div className="flex-1 p-6 md:p-8 flex flex-col justify-between gap-6 border-b lg:border-b-0 lg:border-r border-amber-400/20">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="sticker-badge bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-300 text-black border-none font-black text-[10px] uppercase py-0.5 px-3 shadow-md flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-black" />
                          Exclusive Access
                        </span>
                        <span className="text-amber-400 text-xs font-black uppercase tracking-widest flex items-center gap-1">
                          VIP Guest List
                        </span>
                      </div>

                      <h3 className="text-2xl sm:text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-white leading-tight">
                        You're On The VIP List
                      </h3>

                      <p className="text-zinc-300 text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
                        {vip.organizer_name
                          ? `${vip.organizer_name} has personally reserved an exclusive invitation for you.`
                          : "The host has personally invited you to this exclusive, private event."}{" "}
                        Click to view details and secure your access pass.
                      </p>
                    </div>

                    {/* Quick Meta Badges */}
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap pt-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-xl">
                        <span>📅</span>
                        <span>{formattedDate}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300 bg-amber-400/10 border border-amber-400/20 px-3 py-1.5 rounded-xl">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>{timeStr}</span>
                      </div>
                      {vip.location && (
                        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-300 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl max-w-full truncate">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="truncate">{vip.location}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Ticket Card Stub with Direct Action */}
                  <div className="w-full lg:w-[400px] xl:w-[440px] bg-zinc-950/70 p-6 md:p-8 flex flex-col justify-between gap-5 relative">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                          {vip.category || 'VIP Experience'}
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/80">
                          {vip.is_paid ? 'Paid Entry' : 'Complimentary'}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-xl sm:text-2xl font-black text-white group-hover:text-amber-300 transition-colors uppercase italic tracking-tight line-clamp-2">
                          {vip.title}
                        </h4>
                        {vip.description && (
                          <p className="text-xs text-zinc-400 line-clamp-2 mt-1.5 leading-relaxed">
                            {vip.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="pt-2">
                      <Link
                        href={`/event/${vip.id}`}
                        className="w-full inline-flex items-center justify-center gap-2 text-sm font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black py-3.5 px-6 rounded-2xl transition-all shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_6px_25px_rgba(245,158,11,0.45)] hover:scale-[1.02] active:scale-95"
                      >
                        <span>{vip.rsvp_status === 'going' ? 'View Your VIP Pass' : 'Claim VIP Pass'}</span>
                        <ArrowRight className="w-4 h-4 text-black" />
                      </Link>
                    </div>
                  </div>
                </div>
              </section>
            );
          })()
        ) : (
          /* Multiple VIP Invites (2+) */
          <section className="relative overflow-hidden rounded-2xl md:rounded-[24px] bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/60 p-6 md:p-8 border-2 border-amber-400/30 shadow-[0_10px_35px_-5px_rgba(245,158,11,0.2)] animate-in fade-in duration-500">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="sticker-badge bg-gradient-to-r from-amber-400 to-yellow-300 text-black border-none font-black text-[10px] uppercase py-0.5 px-2.5 shadow-sm">
                    ✨ Exclusive Access
                  </span>
                  <span className="text-amber-400/80 text-xs font-bold uppercase tracking-widest">
                    VIP Guest List
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase text-white">
                  You're On The VIP List ({vipInvites.length})
                </h3>
                <p className="text-zinc-400 text-xs md:text-sm max-w-xl">
                  The host has personally invited you to these exclusive, private events. Click to view details and secure your access pass.
                </p>
              </div>
            </div>

            <div className={`grid grid-cols-1 ${vipInvites.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4 pt-6 relative z-10`}>
              {vipInvites.map((vip) => {
                const formattedDate = new Date(vip.date_time).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                });
                const timeStr = new Date(vip.date_time).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={vip.id}
                    className="group relative bg-zinc-900/90 hover:bg-zinc-800/90 border border-amber-400/20 hover:border-amber-400/50 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 hover:shadow-[0_8px_25px_-5px_rgba(245,158,11,0.25)] hover:-translate-y-0.5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          {vip.category || 'VIP Experience'}
                        </span>
                        <span className="text-[10px] font-bold text-zinc-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {timeStr}
                        </span>
                      </div>

                      <h4 className="text-base font-black text-white group-hover:text-amber-300 transition-colors line-clamp-1 uppercase italic tracking-tight">
                        {vip.title}
                      </h4>

                      <p className="text-xs text-zinc-400 line-clamp-2">
                        {vip.description}
                      </p>

                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 pt-1">
                        <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="truncate">{vip.location}</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-amber-300/80">
                        📅 {formattedDate}
                      </span>
                      <Link
                        href={`/event/${vip.id}`}
                        className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black px-3.5 py-1.5 rounded-xl transition-all shadow-sm active:scale-95"
                      >
                        <span>{vip.rsvp_status === 'going' ? 'View Pass' : 'Claim Pass'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )
      )}

      {/* Editorial Hero Section */}
      {!showCalendarView && featuredEvent && (
        <section className={`relative group overflow-hidden ringer-card h-auto flex flex-col md:flex-row shadow-xl sm:shadow-2xl rounded-2xl md:rounded-[24px] transition-all ${
          isVibrant ? `${getCategoryCardClass(featuredEvent.category)} border-none text-zinc-950` : 'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 border border-black/10 text-white'
        }`}>
           {isVibrant && <CategoryDecorations category={featuredEvent.category} showAccent={false} />}
           {/* Left Editorial Gradient Card */}
           <div className="w-full md:w-[52%] lg:w-[54%] p-6 sm:p-7 md:p-8 lg:p-9 flex flex-col justify-between gap-5 sm:gap-6 relative overflow-hidden z-10">
              <div className="space-y-3 sm:space-y-4 relative z-10">
                <div className="flex items-center justify-between gap-2">
                  <div className="featured-vibe-stream-badge text-white w-fit px-3.5 py-1 rounded-full text-xs flex items-center gap-1.5 font-black uppercase tracking-wider drop-shadow-sm select-none">
                    <Sparkles className="h-3.5 w-3.5 text-white animate-pulse" />
                    <span>Featured Vibe</span>
                  </div>
                  {featuredEvent.participant_limit && (
                    <div className={`sticker-badge border text-[10px] sm:text-xs font-bold px-3 py-1 ${
                      isVibrant ? 'bg-black/5 text-zinc-800 border-black/10' : 'bg-white/20 backdrop-blur-md text-white border-white/30'
                    }`}>
                      {Math.max(0, featuredEvent.participant_limit - (featuredEvent.rsvp_count || 0))} spots left
                    </div>
                  )}
                </div>
                <div className="space-y-2 sm:space-y-2.5">
                  <h2 
                    className={`text-2xl sm:text-3xl md:text-3xl lg:text-4xl font-black tracking-tighter leading-tight sm:leading-[1.1] uppercase italic break-words hyphens-auto ${
                      isVibrant ? '' : 'text-white drop-shadow-md'
                    }`}
                    style={isVibrant ? { color: getCategoryDarkTitleColor(featuredEvent.category) } : undefined}
                  >
                    {featuredEvent.title}
                  </h2>
                  <p className={`italic font-normal line-clamp-3 text-xs sm:text-sm md:text-[14px] leading-relaxed max-w-xl tracking-[-0.01em] ${
                    isVibrant ? 'text-zinc-600' : 'text-white/90 drop-shadow-sm'
                  }`}>
                    {featuredEvent.description}
                  </p>
                </div>
              </div>
              <div className="pt-2 sm:pt-4 relative z-10 mt-auto">
                {isFeaturedRsvped ? (
                  <Link href={`/event/${featuredEvent.id}`} className="inline-block">
                    <button 
                      className={`ringer-button px-6 py-3 sm:px-7 sm:py-3.5 text-xs sm:text-sm shadow-md hover:shadow-xl flex items-center gap-2 font-black tracking-wider transition-all group-hover:scale-105 active:scale-95 text-white ${
                        isVibrant ? '' : 'bg-white text-black hover:bg-zinc-100'
                      }`}
                      style={isVibrant ? {
                        backgroundColor: getCategoryDarkTitleColor(featuredEvent.category),
                        boxShadow: `0 8px 24px -4px ${getCategoryDarkTitleColor(featuredEvent.category)}55`,
                      } : undefined}
                    >
                      <span>VIEW YOUR PASS</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                ) : (
                  <Link href={`/event/${featuredEvent.id}`} className="inline-block">
                    <button 
                      className={`ringer-button px-6 py-3 sm:px-7 sm:py-3.5 text-xs sm:text-sm shadow-md hover:shadow-xl flex items-center gap-2 font-black tracking-wider transition-all group-hover:scale-105 active:scale-95 text-white ${
                        isVibrant ? '' : 'bg-white text-black hover:bg-zinc-100'
                      }`}
                      style={isVibrant ? {
                        backgroundColor: getCategoryDarkTitleColor(featuredEvent.category),
                        boxShadow: `0 8px 24px -4px ${getCategoryDarkTitleColor(featuredEvent.category)}55`,
                      } : undefined}
                    >
                      <span>SECURE YOUR SPOT</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </Link>
                )}
              </div>
           </div>

           {/* Torn Ticket Zig-Zag Perforation Divider */}
           <TicketPerforationDivider />

           {/* Right Logistics & Experience Hub — Unified Frosted Ticket Stub */}
           <div className={`w-full md:w-[48%] lg:w-[46%] p-6 sm:p-7 md:p-8 lg:p-9 flex flex-col justify-between gap-5 sm:gap-6 relative z-10 ${
             isVibrant ? 'bg-white/40 backdrop-blur-md' : 'bg-white'
           }`}>
              {/* Top Tags & Quick Action Bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                  <div className={`sticker-badge ${getCategoryBadgeClass(featuredEvent.category)} border-none shadow-xs text-[10px] sm:text-xs font-black`}>
                    {featuredEvent.category}
                  </div>
                  {featuredEvent.event_type === 'online' ? (
                    <div className="sticker-badge bg-sky-100 text-sky-900 border-none font-black text-[10px] sm:text-xs flex items-center gap-1">
                      <Globe className="h-3 w-3 text-sky-600" /> Online
                    </div>
                  ) : (
                    <div className="sticker-badge bg-zinc-100 border-none text-zinc-700 font-bold text-[10px] sm:text-xs">
                      {featuredEvent.city || 'In-Person'}
                    </div>
                  )}
                  <div className="sticker-badge bg-zinc-100 border-none text-zinc-600 font-bold text-[10px] sm:text-xs">
                    {featuredEvent.is_paid ? "Paid Entry" : "Free Entry"}
                  </div>
                  {featuredEvent.min_age !== null && featuredEvent.min_age !== undefined && Number(featuredEvent.min_age) > 0 && (
                    <div className="sticker-badge bg-red-100 text-red-700 border-none font-black text-[10px] sm:text-xs flex items-center gap-0.5">
                      🔞 {featuredEvent.min_age}+
                    </div>
                  )}
                  {featuredEvent.suitable_age && (
                    <div className="sticker-badge bg-purple-50 text-purple-700 border-none font-bold text-[10px] sm:text-xs flex items-center gap-0.5">
                      👥 {featuredEvent.suitable_age}
                    </div>
                  )}
                  {featuredEvent.status === 'cancelled' && (
                    <div className="sticker-badge bg-rose-600 border-none text-white font-black text-[10px] sm:text-xs uppercase tracking-wider animate-pulse flex items-center gap-1">
                      🚨 Cancelled
                    </div>
                  )}
                  {featuredEvent.status === 'housefull' && (
                    <div className="sticker-badge bg-red-500 border-none text-white font-black text-[10px] sm:text-xs animate-pulse">
                      Sold Out
                    </div>
                  )}
                  {featuredEvent.status === 'filling_fast' && (
                    <div className="sticker-badge bg-orange-500 border-none text-white font-black text-[10px] sm:text-xs animate-pulse flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Filling Fast
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => handleShareEvent(e, featuredEvent)}
                    title="Share this vibe"
                    aria-label="Share this vibe"
                    className="h-9 w-9 rounded-full border border-black/10 flex items-center justify-center text-zinc-600 hover:text-black hover:border-black hover:bg-zinc-50 transition-all active:scale-95 shadow-xs"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Structured Details Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                {/* Location Card */}
                <div className="bg-white/80 backdrop-blur-xs border border-black/5 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 hover:bg-white/95 transition-all shadow-xs group/loc">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400 flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-rose-500" /> Where
                    </span>
                    <a
                      href={featuredEvent.google_maps_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${featuredEvent.location}, ${featuredEvent.city || ''}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-[10px] font-black uppercase tracking-wider text-primary hover:underline flex items-center gap-0.5"
                    >
                      Maps ↗
                    </a>
                  </div>
                  <div>
                    <a
                      href={featuredEvent.google_maps_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${featuredEvent.location}, ${featuredEvent.city || ''}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-sm sm:text-base font-black tracking-tight text-black line-clamp-1 hover:text-primary transition-colors block"
                    >
                      {featuredEvent.location}
                    </a>
                    <div className="text-xs font-semibold text-zinc-500 mt-0.5">
                      {featuredEvent.city || "Visakhapatnam"}
                    </div>
                  </div>
                </div>

                {/* Schedule Card */}
                <div className="bg-white/80 backdrop-blur-xs border border-black/5 rounded-xl p-3.5 sm:p-4 flex flex-col justify-between gap-2.5 hover:bg-white/95 transition-all shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-zinc-400 flex items-center gap-1.5">
                      <CalendarIcon className="h-3.5 w-3.5 text-indigo-500" /> When
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/50">
                      {new Date(featuredEvent.date_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-black tracking-tight text-black line-clamp-1">
                      {new Date(featuredEvent.date_time).toLocaleDateString(undefined, { weekday: 'long' })}
                    </div>
                    <div className="text-xs font-semibold text-zinc-500 flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3 text-zinc-400" />
                      {featuredEvent.timings || new Date(featuredEvent.date_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Host & Community Strip */}
              <div className="pt-4 border-t border-black/5 flex items-center justify-between gap-3 flex-wrap">
                {/* Host Info & Follow */}
                <div className="flex items-center gap-3">
                  <div 
                    className="h-8 w-8 sm:h-9 sm:w-9 rounded-full text-white font-black text-xs flex items-center justify-center uppercase shadow-xs shrink-0"
                    style={isVibrant ? {
                      backgroundColor: getCategoryDarkTitleColor(featuredEvent.category),
                    } : { backgroundColor: '#000000' }}
                  >
                    {featuredEvent.organizer_email ? featuredEvent.organizer_email.charAt(0) : "V"}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-wider text-zinc-400 leading-none mb-0.5">Host</div>
                    <div className="text-xs font-black text-black truncate max-w-[120px] sm:max-w-[160px] leading-tight">
                      {featuredEvent.organizer_email ? featuredEvent.organizer_email.split('@')[0] : 'Vibe Host'}
                    </div>
                  </div>
                  <button 
                    onClick={(e) => toggleFollow(e, featuredEvent.organizer_email)}
                    className={`ringer-button text-[11px] py-1 px-3 ml-1 ${following.includes(featuredEvent.organizer_email) ? 'bg-zinc-200 text-black border border-zinc-300' : 'bg-white text-black border border-black hover:bg-zinc-50 shadow-xs'}`}
                  >
                    {following.includes(featuredEvent.organizer_email) ? '✓ FOLLOWING' : '+ FOLLOW'}
                  </button>
                </div>

                {/* RSVP / Live Vibe Counter */}
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200/60 text-emerald-800 px-3.5 py-1.5 rounded-full font-black text-xs shadow-xs shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                  </span>
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{featuredEvent.rsvp_count || 0} Interested</span>
                </div>
              </div>
           </div>
        </section>
      )}

       {/* Bento Grid */}
       {!showCalendarView && otherEvents.length > 0 && (
         <section className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-8 auto-rows-min">
         {otherEvents.map((ev, i) => {
           const isLarge = i % 5 === 0;
           return (
             <div 
               key={ev.id} 
               className={`
                 ringer-card p-0 group flex flex-col relative overflow-hidden active:scale-[0.98] transition-transform
                 ${isLarge ? 'md:col-span-6 lg:col-span-8' : 'md:col-span-3 lg:col-span-4'}
                 ${isVibrant ? `${getCategoryCardClass(ev.category)} vibe-hover-lift` : ''}
               `}
             >
               {isVibrant && <CategoryDecorations category={ev.category} showAccent={false} />}
               <Link href={`/event/${ev.id}`} className="absolute inset-0 z-10" aria-label={`View details for ${ev.title}`} />
               <div className="p-5 sm:p-8 flex flex-col h-full space-y-6 relative z-10 pointer-events-none">
                  <div className="flex justify-between items-start">
                    <div className="flex flex-wrap gap-2">
                      <div className={`sticker-badge ${getCategoryBadgeClass(ev.category)} border-none`}>
                        {ev.category}
                      </div>
                      {ev.event_type === 'online' && (
                        <div className="sticker-badge bg-sky-100 text-sky-900 border-none font-black text-[10px] flex items-center gap-1">
                          <Globe className="h-3 w-3 text-sky-600" /> Online
                        </div>
                      )}
                      <div className="sticker-badge bg-zinc-100 border-none text-zinc-500 font-bold text-[10px]">
                        {ev.is_paid ? "Paid" : "Free"}
                      </div>
                      {ev.min_age !== null && ev.min_age !== undefined && Number(ev.min_age) > 0 && (
                        <div className="sticker-badge bg-red-100 text-red-700 border-none font-black text-[10px] flex items-center gap-0.5">
                          🔞 {ev.min_age}+
                        </div>
                      )}
                      {ev.suitable_age && (
                        <div className="sticker-badge bg-purple-50 text-purple-700 border-none font-bold text-[10px] flex items-center gap-0.5">
                          👥 {ev.suitable_age}
                        </div>
                      )}
                      {ev.status === 'cancelled' && (
                        <div className="sticker-badge bg-rose-600 border-none text-white font-black text-[10px] uppercase tracking-wider animate-pulse flex items-center gap-1">
                          🚨 Cancelled
                        </div>
                      )}
                      {ev.status === 'housefull' && (
                        <div className="sticker-badge bg-red-500 border-none text-white font-black text-[10px] animate-pulse">
                          Sold Out
                        </div>
                      )}
                      {ev.status === 'filling_fast' && (
                        <div className="sticker-badge bg-orange-500 border-none text-white font-black text-[10px] animate-pulse flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Filling Fast
                        </div>
                      )}
                    </div>
                   <div className="flex items-center gap-2">
                     <button 
                       onClick={(e) => toggleFollow(e, ev.organizer_email)}
                       className={`pointer-events-auto relative z-20 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${following.includes(ev.organizer_email) ? 'bg-zinc-200 border-transparent text-black' : 'border-zinc-200 text-zinc-400 hover:text-black hover:border-black'}`}
                     >
                       {following.includes(ev.organizer_email) ? '✓ Following' : 'Follow'}
                     </button>
                     <button className="pointer-events-auto relative z-20 text-zinc-300 hover:text-black transition-colors">
                       <Share2 className="h-4 w-4" />
                     </button>
                   </div>
                 </div>

                 <div className="space-y-3 flex-1">
                   <h3 
                     className="text-2xl font-black tracking-tighter leading-tight uppercase transition-colors italic"
                     style={isVibrant ? { color: getCategoryDarkTitleColor(ev.category) } : undefined}
                   >
                     {ev.title}
                   </h3>
                   <p className="italic text-xs sm:text-[13px] font-normal text-zinc-600 line-clamp-3 leading-relaxed tracking-[-0.01em]">
                     {ev.description}
                   </p>
                 </div>

                 <div className="pt-6 border-t border-black/5 flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase text-black">
                        <CalendarIcon className="h-3.5 w-3.5" style={{ color: isVibrant ? getCategoryAccentColor(ev.category) : undefined }} />
                        {new Date(ev.date_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                      <a
                        href={ev.google_maps_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ev.location}, ${ev.city || ''}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="pointer-events-auto relative z-20 flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-zinc-700 uppercase tracking-wide hover:text-black hover:underline cursor-pointer transition-colors"
                      >
                        <MapPin className="h-3 w-3 text-zinc-500 shrink-0" />
                        <span className="truncate max-w-[200px] sm:max-w-[240px]">{ev.location}</span>
                      </a>
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide mt-1" style={{ color: isVibrant ? getCategoryAccentColor(ev.category) : '#19A74E' }}>
                        <Users className="h-2.5 w-2.5" />
                        <span>{ev.rsvp_count || 0} Interested</span>
                      </div>
                    </div>
                    
                    <div 
                      className={`h-10 w-10 flex items-center justify-center rounded-full transition-all group-hover:scale-110 ${
                        isVibrant 
                          ? 'text-white shadow-md' 
                          : 'bg-black text-white group-hover:bg-primary'
                      }`}
                      style={isVibrant ? { 
                        backgroundColor: getCategoryAccentColor(ev.category),
                        boxShadow: `0 4px 14px ${getCategoryAccentColor(ev.category)}60` 
                      } : {}}
                    >
                      <Sparkles className="h-4 w-4" />
                    </div>
                 </div>
              </div>
            </div>
          );
        })}
      </section>
      )}

      {/* Empty State for selected date with no events */}
      {!showCalendarView && selectedDate && displayEvents.length === 0 && (
        <div className="text-center py-16 px-4 bg-white/70 backdrop-blur-sm rounded-[32px] border border-black/5 space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-zinc-100 rounded-full flex items-center justify-center mx-auto text-zinc-400">
            <CalendarIcon className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-black uppercase tracking-tight text-black">
              No events scheduled for {format(selectedDate, 'MMMM d, yyyy')}
            </h3>
            <p className="text-sm font-semibold text-zinc-500 max-w-md mx-auto">
              Check out other dates in the calendar to discover upcoming vibes.
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedDate(undefined);
              setForceCalendarOpen(true);
              router.push('/dashboard?view=calendar');
            }}
            className="ringer-button text-xs bg-black text-white px-6 py-2.5 hover:bg-zinc-800"
          >
            View Full Calendar
          </button>
        </div>
      )}

      {/* Discovery Banner - Hidden if user already accepted Telegram bot */}
      {!userHasTelegram && (
        <section className={`p-6 sm:p-12 rounded-2xl sm:rounded-[24px] flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 relative overflow-hidden ${
          isVibrant 
            ? 'bg-gradient-to-br from-zinc-900 via-purple-950 to-zinc-900 text-white' 
            : 'bg-black text-white'
        }`}>
           {isVibrant && (
             <>
               <div className="vibe-float-icon animate-float-gentle" style={{ top: '10%', left: '5%', opacity: 0.06, color: '#A855F7' }}><Sparkles className="h-8 w-8" /></div>
               <div className="vibe-float-icon animate-float-slow" style={{ top: '20%', right: '15%', opacity: 0.05, color: '#EC4899' }}><Zap className="h-6 w-6" /></div>
               <div className="vibe-float-icon animate-float-drift" style={{ bottom: '15%', left: '20%', opacity: 0.05, color: '#06B6D4' }}><Sparkles className="h-5 w-5" /></div>
             </>
           )}
           <div className="space-y-4 max-w-xl text-center md:text-left relative z-10">
             <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter uppercase leading-none text-white">
               Don't miss a single beat.
             </h2>
             <p className="font-bold text-zinc-400 text-sm">
               VibeCheck keeps you in the loop with the best curated events in {currentCity}. 
               Join our community over 5,000+ vibe-seekers.
             </p>
           </div>
           <div className="flex flex-wrap gap-4 items-center justify-center md:justify-start">
             <button 
               onClick={handleJoinTelegram} 
               className="flex items-center gap-2 bg-[#229ED9] hover:bg-[#1d8dc3] text-white font-black px-6 py-3.5 rounded-full tracking-wide uppercase text-sm shadow-lg shadow-[#229ED9]/25 hover:shadow-[#229ED9]/40 active:scale-95 transition-all"
             >
               <Send className="h-4 w-4 fill-white -rotate-12" />
               <span>PING VIBECHECK</span>
             </button>
             <button 
               onClick={handleSharePlatform} 
               className="ringer-button flex items-center gap-2 border border-white/20 hover:bg-white/10 active:scale-95 transition-transform"
             >
               <Share2 className="h-4 w-4" />
               <span>SHARE</span>
             </button>
           </div>
        </section>
      )}

      {/* End of space-y wrapper */}
      </div>

      {session?.user?.email && (
        <PhoneVerificationModal
          isOpen={showPhoneModal}
          onClose={() => setShowPhoneModal(false)}
          onVerified={() => {
            setUserHasPhone(true);
            setShowPhoneModal(false);
            const text = `VibeCheck`;
            const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
          }}
          email={session.user.email}
        />
      )}

      {/* Calendar Toggle Button (FAB) when feed is visible */}
      {!showCalendarView && !selectedDate && !isCategoryEmpty && (
        <button
          onClick={() => {
            setForceCalendarOpen(true);
            router.push('/dashboard?view=calendar');
          }}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 bg-gradient-to-br from-emerald-500 to-teal-600 text-white h-14 w-14 hover:w-48 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(16,185,129,0.4)] hover:shadow-[0_14px_35px_rgba(16,185,129,0.55)] hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out border border-white/30 group overflow-hidden"
          title="Calendar View"
        >
          <div className="flex items-center justify-center whitespace-nowrap">
            <span className="shrink-0 select-none leading-none flex items-center justify-center">
              <CalendarIcon className="h-5 w-5 md:h-6 md:w-6" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider max-w-0 opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 group-hover:ml-2 transition-all duration-300 ease-in-out select-none overflow-hidden">
              Calendar View
            </span>
          </div>
        </button>
      )}

      {/* Card View Toggle Button (FAB) when calendar is visible */}
      {showCalendarView && !isCategoryEmpty && (
        <button
          onClick={() => {
            setForceCalendarOpen(false);
            setSelectedDate(undefined);
            router.push('/dashboard');
          }}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 bg-gradient-to-br from-indigo-500 to-violet-600 text-white h-14 w-14 hover:w-44 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(99,102,241,0.4)] hover:shadow-[0_14px_35px_rgba(99,102,241,0.55)] hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out border border-white/30 group overflow-hidden"
          title="Card View"
        >
          <div className="flex items-center justify-center whitespace-nowrap">
            <span className="shrink-0 select-none leading-none flex items-center justify-center">
              <LayoutGrid className="h-5 w-5 md:h-6 md:w-6" />
            </span>
            <span className="text-[11px] font-black uppercase tracking-wider max-w-0 opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 group-hover:ml-2 transition-all duration-300 ease-in-out select-none overflow-hidden">
              Card View
            </span>
          </div>
        </button>
      )}

    </main>
  );
}

export default function Dashboard() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
