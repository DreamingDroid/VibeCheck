"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { PhoneVerificationModal } from "@/components/PhoneVerificationModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCity } from "@/context/CityContext";
import { useTheme } from "@/context/ThemeContext";
import { CategoryDecorations, getCategoryCardClass, getCategoryAccentColor } from "@/components/CategoryDecorations";
import { Calendar as CalendarIcon, MapPin, Share2, Sparkles, TrendingUp, Zap, Users, ChevronLeft, ChevronRight, ArrowRight, ArrowLeft, Clock } from "lucide-react";
import { toast } from "sonner";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { isSameDay, startOfDay, isBefore, isAfter, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, format, isToday } from "date-fns";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

function buildWhatsAppUrl(title: string, date: string, location: string, cityPrefix: string) {
  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const text = `Hey ${cityPrefix} Vibes! 👋 I saw *${title}* (${formattedDate} @ ${location}) on the website and I'd love to know more. Can you add me to the notification list?`;
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
}

type VibeEvent = {
  id: string;
  category: string;
  title: string;
  description: string;
  date_time: string;
  location: string;
  organizer_email: string;
  rsvp_count?: number;
  google_maps_link?: string;
  city?: string;
  participant_limit?: number;
  is_paid?: boolean;
  status?: string;
};

function DashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { currentCity, events, isLoadingEvents: loading, selectedCategory, refreshEvents } = useCity();
  const { isVibrant } = useTheme();
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [following, setFollowing] = useState<string[]>([]);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [userHasPhone, setUserHasPhone] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [forceCalendarOpen, setForceCalendarOpen] = useState(false);
  const [calendarViewMode, setCalendarViewMode] = useState<'month' | 'week'>('month');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [dashboardNews, setDashboardNews] = useState<any[]>([]);

  const todayDate = new Date();
  const minWeekStart = startOfWeek(todayDate, { weekStartsOn: 1 });
  const maxWeekStart = startOfWeek(new Date(todayDate.getFullYear(), 11, 31), { weekStartsOn: 1 });
  const canGoPrevWeek = isAfter(startOfDay(currentWeekStart), startOfDay(minWeekStart));
  const canGoNextWeek = isBefore(startOfDay(currentWeekStart), startOfDay(maxWeekStart));

  const { isPulling, pullDistance, isRefreshing } = usePullToRefresh(async () => {
    await refreshEvents();
    if (currentCity) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      try {
        const res = await fetch(`${baseUrl}/api/news?city=${encodeURIComponent(currentCity)}`);
        const json = await res.json();
        if (json.success && json.data) setDashboardNews(json.data.slice(0, 4));
      } catch (err) {}
    }
  });

  useEffect(() => {
    if (searchParams?.get('view') === 'calendar') {
      setForceCalendarOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (session?.user?.email) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/user?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data && res.data.phone_number) {
            setUserHasPhone(true);
          }
        })
        .catch(err => console.error("Could not fetch user preferences", err));
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
          }
        })
        .catch(err => console.error("Could not fetch news", err));
    }
  }, [currentCity]);

  const handleJoinWhatsApp = () => {
    if (!session?.user?.email) {
      signIn("google");
      return;
    }
    if (!userHasPhone) {
      setShowPhoneModal(true);
      return;
    }
    const text = `VibeCheck`;
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
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
      
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/user?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data?.phone_number) {
            setUserHasPhone(true);
          } else {
            setUserHasPhone(false);
          }
        })
        .catch(err => console.error("Failed to check user phone verification:", err));
    } else {
      setUserHasPhone(false);
    }
  }, [session]);

  // Color mapping for Joyful vibe
  const getCategoryColor = (cat: string) => {
    const map: Record<string, string> = {
      "Music": "bg-yellow-400",
      "Techno": "bg-primary",
      "Arts": "bg-purple-500",
      "Education": "bg-blue-500",
      "Sports": "bg-orange-500",
      "Food": "bg-emerald-400",
      "Indie": "bg-pink-400",
    };
    return map[cat] || "bg-zinc-200";
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

  const filteredEvents = selectedCategory && selectedCategory !== "The Latest"
    ? events.filter(ev => ev.category.toLowerCase() === selectedCategory.toLowerCase())
    : events;

  let displayEvents = filteredEvents;
  if (selectedDate) {
    displayEvents = events.filter(ev => isSameDay(new Date(ev.date_time), selectedDate));
  }

  const isCategoryEmpty = filteredEvents.length === 0;
  const showCalendarView = (isCategoryEmpty || forceCalendarOpen) && !selectedDate;
  
  const featuredEvent = displayEvents[0];
  const otherEvents = displayEvents.slice(1);

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

      <div className={showCalendarView ? 'space-y-4' : 'space-y-12'}>
      {/* Local Currents RSS Ticker at the top */}
      {dashboardNews.length > 0 && (
        <div className="w-full bg-black text-white py-4 border-b-4 border-primary overflow-hidden relative shadow-lg">
          <div className="absolute left-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-r from-black to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-8 md:w-16 bg-gradient-to-l from-black to-transparent z-10" />
          <div className="flex animate-marquee gap-8 md:gap-16 items-center whitespace-nowrap px-4">
             {[...dashboardNews, ...dashboardNews, ...dashboardNews].map((news, idx) => (
                <Link key={`${news.id}-${idx}`} href={`/local-currents?id=${news.id}`} className="flex items-center gap-2 group hover:text-primary transition-colors">
                  <span className="sticker-badge bg-primary text-black text-[10px] font-black uppercase py-0.5 px-2 border-none">
                    {news.category}
                  </span>
                  <span className="font-black italic tracking-widest uppercase text-xs md:text-sm group-hover:underline">
                    {news.title}
                  </span>
                  <Sparkles className="h-4 w-4 text-primary ml-2 hidden md:block" />
                </Link>
             ))}
          </div>
        </div>
      )}

      <div className={`max-w-7xl mx-auto px-4 sm:px-6 ${showCalendarView ? 'space-y-4' : 'space-y-12'}`}>
      
      {/* Calendar Toggle Button (FAB) when feed is visible */}
      {!showCalendarView && !selectedDate && !isCategoryEmpty && (
        <button
          onClick={() => setForceCalendarOpen(true)}
          className="fixed bottom-6 right-6 md:bottom-8 md:right-8 z-40 bg-black text-white h-14 w-14 hover:w-48 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:bg-primary hover:text-black hover:scale-105 active:scale-95 transition-all duration-300 ease-in-out border border-white/20 group overflow-hidden"
          title="View Calendar"
        >
          <div className="flex items-center justify-center whitespace-nowrap">
            <span className="shrink-0 select-none leading-none flex items-center justify-center">
              <CalendarIcon className="h-6 w-6" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest max-w-0 opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 group-hover:ml-2 transition-all duration-300 ease-in-out select-none overflow-hidden mt-0.5">
              View Calendar
            </span>
          </div>
        </button>
      )}

      {/* Calendar Empty State / Calendar View */}
      {showCalendarView && (
        <section className="flex flex-col items-center justify-center space-y-4 md:space-y-5 animate-in fade-in duration-500 w-full mt-2 md:mt-4 relative max-w-6xl mx-auto">
          {!isCategoryEmpty && (
            <button 
              onClick={() => setForceCalendarOpen(false)}
              className="self-start flex items-center gap-1.5 md:gap-2 text-[10px] md:text-xs font-black uppercase tracking-widest text-zinc-500 hover:text-black transition-colors bg-zinc-100 hover:bg-zinc-200 px-3 py-1.5 md:px-4 md:py-2 rounded-full md:absolute md:top-0 md:left-0 z-10 md:-mt-2"
            >
              <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
              Back to Feed
            </button>
          )}
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
          
          <div className={`w-full p-3 sm:p-5 md:p-6 rounded-[24px] md:rounded-[36px] border-2 md:border-4 border-white shadow-[0_15px_40px_-10px_rgba(0,0,0,0.08)] overflow-hidden relative bg-gradient-to-br from-white via-zinc-50 to-zinc-100/80 ${isVibrant ? 'vibe-hover-lift' : ''}`}>
            {isVibrant && (
              <>
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
              </>
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
                    day: "w-full aspect-square md:aspect-auto md:h-16 lg:h-[70px] rounded-lg md:rounded-2xl flex flex-col items-center md:items-start justify-between p-1 sm:p-1.5 md:p-2.5 font-black text-xs sm:text-sm md:text-xl border-2 border-black/5 hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all bg-white relative group overflow-hidden cursor-pointer",
                    day_selected: "ring-0 bg-primary/20 border-primary shadow-[3px_3px_0px_0px_rgba(var(--primary),1)]",
                    day_today: "bg-zinc-50 border-black/20",
                    day_outside: "text-zinc-300 opacity-50 bg-zinc-50/50 hover:border-black/5 hover:shadow-none hover:translate-y-0",
                    day_disabled: "text-zinc-300 opacity-50",
                    day_hidden: "invisible",
                  }}
                  components={{
                    DayButton: (props) => {
                      const { day, modifiers } = props;
                      const dateEvents = events.filter(e => isSameDay(new Date(e.date_time), day.date));
                      const isPastDate = isBefore(startOfDay(day.date), startOfDay(new Date()));
                      
                      return (
                        <button {...props} className={props.className} disabled={modifiers.outside}>
                          <span className={`block leading-none transition-colors ${isPastDate ? "opacity-40" : "group-hover:text-primary"} ${modifiers.outside ? "text-zinc-300" : ""}`}>
                            {day.date.getDate()}
                          </span>
                          
                          {dateEvents.length > 0 && !modifiers.outside && (
                            <div className="absolute bottom-1 md:bottom-1.5 left-1 right-1 md:left-2 md:right-2 flex flex-col gap-0.5 z-10">
                              <div className="flex gap-0.5 sm:gap-1 md:gap-1.5 flex-wrap w-full justify-center md:justify-start">
                                {dateEvents.slice(0, 3).map((ev, i) => (
                                  <div 
                                    key={i} 
                                    className={`h-1 w-1 sm:h-1.5 sm:w-1.5 md:h-1.5 md:w-auto md:flex-1 rounded-full ${isPastDate ? 'bg-zinc-400' : 'bg-black group-hover:bg-primary'} shadow-sm transition-colors`} 
                                    title={ev.title} 
                                  />
                                ))}
                              </div>
                              {dateEvents.length > 3 && (
                                <span className="text-[8px] md:text-[9px] hidden md:block font-black text-black group-hover:text-primary uppercase tracking-widest text-left leading-none transition-colors">
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
              </div>
            ) : (
              /* Week View */
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
                  {Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i)).map((dayDate, idx) => {
                    const dayEvents = events.filter(e => isSameDay(new Date(e.date_time), dayDate));
                    const isTodayDate = isToday(dayDate);
                    const isDaySelected = selectedDate && isSameDay(selectedDate, dayDate);

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedDate(dayDate)}
                        className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between min-h-[180px] sm:min-h-[220px] ${
                          isDaySelected
                            ? 'bg-primary/10 border-primary shadow-[3px_3px_0px_0px_rgba(var(--primary),1)]'
                            : isTodayDate
                              ? 'bg-zinc-50 border-black/30 hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                              : 'bg-white border-black/5 hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'
                        }`}
                      >
                        {/* Day Column Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-black/5">
                          <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                              {format(dayDate, "EEE")}
                            </span>
                            <span className={`text-xl sm:text-2xl font-black leading-none italic ${isTodayDate ? 'text-primary' : 'text-black'}`}>
                              {format(dayDate, "d")}
                            </span>
                          </div>
                          {isTodayDate && (
                            <span className="sticker-badge bg-black text-white text-[8px] font-black uppercase py-0.5 px-1.5 border-none">
                              TODAY
                            </span>
                          )}
                        </div>

                        {/* Events list for this day */}
                        <div className="space-y-1.5 py-2 flex-1">
                          {dayEvents.length > 0 ? (
                            dayEvents.map((ev, evIdx) => (
                              <div
                                key={evIdx}
                                className="bg-zinc-50 hover:bg-zinc-100 p-2 rounded-xl border border-black/5 space-y-1 transition-colors group"
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span
                                    className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full text-black"
                                    style={{ backgroundColor: getCategoryAccentColor(ev.category) || '#19A74E' }}
                                  >
                                    {ev.category}
                                  </span>
                                  <div className="flex items-center gap-0.5 text-[9px] font-bold text-zinc-400">
                                    <Clock className="h-2.5 w-2.5" />
                                    <span>{new Date(ev.date_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                </div>
                                <p className="text-[11px] font-black text-black group-hover:text-primary transition-colors line-clamp-1 leading-tight">
                                  {ev.title}
                                </p>
                              </div>
                            ))
                          ) : (
                            <div className="h-full flex items-center justify-center py-4 text-center">
                              <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-widest">
                                Quiet Day
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Event count footer */}
                        <div className="pt-2 border-t border-black/5 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-zinc-400">
                          <span>{dayEvents.length} {dayEvents.length === 1 ? 'Vibe' : 'Vibes'}</span>
                          <span className="group-hover:text-black">View →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Back to Calendar Button if date is selected */}
      {selectedDate && (
        <div className="flex justify-start">
          <button 
            onClick={() => {
              setSelectedDate(undefined);
              setForceCalendarOpen(true);
            }}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-zinc-100 hover:bg-zinc-200 active:scale-95 text-black px-4 py-2 rounded-full transition-all"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Calendar
          </button>
        </div>
      )}

      {/* Editorial Hero Section */}
      {!showCalendarView && featuredEvent && (
        <section className="relative group cursor-pointer overflow-hidden ringer-card h-auto flex flex-col md:flex-row shadow-2xl rounded-[24px] md:rounded-[40px]">
           <div className="w-full md:w-1/2 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white p-6 sm:p-10 flex flex-col justify-center gap-6 md:gap-10 relative overflow-hidden">
              {isVibrant && <CategoryDecorations category={featuredEvent.category} showAccent={false} />}
              <div className="sticker-badge bg-black text-white w-fit px-4 border-none flex items-center gap-2 relative z-10 shadow-lg">
                <TrendingUp className="h-3 w-3 text-pink-400" />
                Featured Vibe
              </div>
              <div className="space-y-4 relative z-10">
                <h2 className="text-4xl sm:text-5xl font-black tracking-tighter leading-none uppercase italic break-words hyphens-auto text-white drop-shadow-md">
                  {featuredEvent.title}
                </h2>
                <p className="font-bold text-white/90 line-clamp-2 max-w-md drop-shadow-sm">
                  {featuredEvent.description}
                </p>
                <div className="flex gap-4 pt-4">
                    <Link href={`/event/${featuredEvent.id}`}>
                      <button className="ringer-button bg-white text-black hover:bg-zinc-100 px-8 py-3 text-sm shadow-xl">
                        SECURE YOUR SPOT
                      </button>
                    </Link>
                </div>
              </div>
           </div>
           <div className="w-full md:w-1/2 bg-white p-5 sm:p-8 flex flex-col justify-center gap-6">
              <div className="space-y-2 border-l-4 border-black pl-4 sm:pl-6">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Where & When</div>
                <a
                  href={featuredEvent.google_maps_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${featuredEvent.location}, ${featuredEvent.city || ''}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-2xl font-black tracking-tight hover:text-primary hover:underline cursor-pointer block w-fit"
                >
                  {featuredEvent.location}
                </a>
                <div className="text-xl font-bold text-zinc-600">
                  {new Date(featuredEvent.date_time).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="sticker-badge border-black text-black">{featuredEvent.category}</div>
                <div className="sticker-badge bg-zinc-100 border-none text-zinc-500">
                  {featuredEvent.is_paid ? "Paid Entry" : "Free Entry"}
                </div>
                {featuredEvent.status === 'housefull' && (
                  <div className="sticker-badge bg-red-500 border-none text-white font-black text-[10px] animate-pulse">Sold Out</div>
                )}
                {featuredEvent.status === 'filling_fast' && (
                  <div className="sticker-badge bg-orange-500 border-none text-white font-black text-[10px] animate-pulse flex items-center gap-1"><Sparkles className="h-3 w-3" /> Filling Fast</div>
                )}
                <div className="sticker-badge bg-primary/10 border-none text-primary flex items-center gap-1.5 font-black">
                  <Users className="h-3 w-3" />
                  <span>{featuredEvent.rsvp_count || 0} Interested</span>
                </div>
              </div>
              <div className="pt-6 border-t border-black/5 mt-4">
                <button 
                  onClick={(e) => toggleFollow(e, featuredEvent.organizer_email)}
                  className={`ringer-button text-xs ${following.includes(featuredEvent.organizer_email) ? 'bg-zinc-200 text-black' : 'bg-white text-black border border-black hover:bg-zinc-50'}`}
                >
                  {following.includes(featuredEvent.organizer_email) ? '✓ FOLLOWING ORGANIZER' : '➕ FOLLOW ORGANIZER'}
                </button>
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
                     <div className={`sticker-badge ${getCategoryColor(ev.category)} text-black border-none font-black`}>
                       {ev.category}
                     </div>
                     <div className="sticker-badge bg-zinc-100 border-none text-zinc-500 font-bold text-[10px]">
                       {ev.is_paid ? "Paid" : "Free"}
                     </div>
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
                   <h3 className="text-2xl font-black tracking-tighter leading-tight uppercase group-hover:text-primary transition-colors italic">
                     {ev.title}
                   </h3>
                   <p className="text-xs font-bold text-zinc-500 line-clamp-3 leading-relaxed">
                     {ev.description}
                   </p>
                 </div>

                 <div className="pt-6 border-t border-black/5 flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-xs font-black uppercase text-black">
                        <CalendarIcon className="h-3.5 w-3.5" />
                        {new Date(ev.date_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                      <a
                        href={ev.google_maps_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ev.location}, ${ev.city || ''}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="pointer-events-auto relative z-20 flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide hover:text-black hover:underline cursor-pointer"
                      >
                        <MapPin className="h-2.5 w-2.5" />
                        {ev.location}
                      </a>
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide mt-1" style={{ color: isVibrant ? getCategoryAccentColor(ev.category) : '#19A74E' }}>
                        <Users className="h-2.5 w-2.5" />
                        <span>{ev.rsvp_count || 0} Interested</span>
                      </div>
                    </div>
                    
                    <div 
                      className={`h-10 w-10 flex items-center justify-center rounded-full transition-all group-hover:scale-110 ${
                        isVibrant 
                          ? 'text-white shadow-lg' 
                          : 'bg-black text-white group-hover:bg-primary'
                      }`}
                      style={isVibrant ? { backgroundColor: getCategoryAccentColor(ev.category) } : {}}
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

      {/* Discovery Sidebar Style Section - Hidden if user already verified phone */}
      {!userHasPhone && (
        <section className={`p-6 sm:p-12 rounded-[24px] sm:rounded-[40px] flex flex-col md:flex-row items-center justify-between gap-6 sm:gap-8 relative overflow-hidden ${
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
           <div className="flex gap-4">
              <button onClick={handleJoinWhatsApp} className="ringer-button bg-primary text-black active:scale-95 transition-transform">PING VIBECHECK</button>
              <button onClick={handleSharePlatform} className="ringer-button border border-white/20 hover:bg-white/10 active:scale-95 transition-transform">SHARE PLATFORM</button>
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

      </div>
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
