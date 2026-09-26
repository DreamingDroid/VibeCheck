"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Sparkles, 
  Users, 
  Star, 
  Share2, 
  Check, 
  ExternalLink, 
  Send, 
  ShieldCheck, 
  UserPlus, 
  UserCheck, 
  ChevronDown, 
  ChevronUp, 
  Ticket, 
  ArrowLeft, 
  Globe, 
  Phone, 
  Info, 
  AlertCircle,
  MessageCircle,
  CalendarDays,
  Flame,
  CheckCircle2,
  Lock,
  Compass,
  QrCode,
  Music,
  Palette,
  Trophy,
  UtensilsCrossed,
  Zap,
  Heart,
  BookOpen
} from "lucide-react";
import { toast } from "sonner";
import { formatTelegramLink } from "@/lib/telegramGroup";
import { useTranslation } from "@/context/LanguageContext";
import { useTheme } from "@/context/ThemeContext";
import { getCategoryAccentColor } from "@/components/CategoryDecorations";
import { AttendeeBriefingModal } from "@/components/AttendeeBriefingModal";
import { JoinTelegramPromptModal } from "@/components/JoinTelegramPromptModal";

function getCategoryVibrantStyle(category: string) {
  const norm = (category || "").toLowerCase();
  if (norm.includes("music") || norm.includes("concert") || norm.includes("gig")) {
    return {
      glow: "from-purple-500/25 via-indigo-900/10 to-transparent",
      accent: "text-purple-300",
      badge: "bg-purple-950/80 text-purple-200 border-purple-500/30",
      icon: <Music className="h-7 w-7 text-purple-300" />,
      subtext: "Electric Beats & Live Sound"
    };
  }
  if (norm.includes("art") || norm.includes("creative") || norm.includes("craft") || norm.includes("paint")) {
    return {
      glow: "from-rose-500/25 via-pink-900/10 to-transparent",
      accent: "text-rose-300",
      badge: "bg-rose-950/80 text-rose-200 border-rose-500/30",
      icon: <Palette className="h-7 w-7 text-rose-300" />,
      subtext: "Creative Showcase & Craft"
    };
  }
  if (norm.includes("sport") || norm.includes("fitness") || norm.includes("run") || norm.includes("yoga")) {
    return {
      glow: "from-amber-500/25 via-orange-900/10 to-transparent",
      accent: "text-amber-300",
      badge: "bg-amber-950/80 text-amber-200 border-amber-500/30",
      icon: <Trophy className="h-7 w-7 text-amber-300" />,
      subtext: "High Energy & Active Community"
    };
  }
  if (norm.includes("food") || norm.includes("coffee") || norm.includes("taste") || norm.includes("dining") || norm.includes("brunch")) {
    return {
      glow: "from-emerald-500/25 via-teal-900/10 to-transparent",
      accent: "text-emerald-300",
      badge: "bg-emerald-950/80 text-emerald-200 border-emerald-500/30",
      icon: <UtensilsCrossed className="h-7 w-7 text-emerald-300" />,
      subtext: "Culinary Flavors & Gatherings"
    };
  }
  if (norm.includes("techno") || norm.includes("electronic") || norm.includes("dj") || norm.includes("rave")) {
    return {
      glow: "from-cyan-500/25 via-blue-900/10 to-transparent",
      accent: "text-cyan-300",
      badge: "bg-cyan-950/80 text-cyan-200 border-cyan-500/30",
      icon: <Zap className="h-7 w-7 text-cyan-300" />,
      subtext: "Cyber Waves & Deep Bass"
    };
  }
  if (norm.includes("spiritual") || norm.includes("mindful") || norm.includes("meditat") || norm.includes("peace") || norm.includes("satsang")) {
    return {
      glow: "from-amber-500/25 via-orange-900/10 to-transparent",
      accent: "text-amber-300",
      badge: "bg-amber-950/80 text-amber-200 border-amber-500/30",
      icon: <Compass className="h-7 w-7 text-amber-300" />,
      subtext: "Mindfulness & Sacred Aura"
    };
  }
  if (norm.includes("wellness") || norm.includes("health") || norm.includes("heal")) {
    return {
      glow: "from-teal-500/25 via-emerald-900/10 to-transparent",
      accent: "text-teal-300",
      badge: "bg-teal-950/80 text-teal-200 border-teal-500/30",
      icon: <Heart className="h-7 w-7 text-teal-300" />,
      subtext: "Holistic Health & Vitality"
    };
  }
  if (norm.includes("indie") || norm.includes("acoustic") || norm.includes("underground")) {
    return {
      glow: "from-pink-500/25 via-purple-900/10 to-transparent",
      accent: "text-pink-300",
      badge: "bg-pink-950/80 text-pink-200 border-pink-500/30",
      icon: <Star className="h-7 w-7 text-pink-300" />,
      subtext: "Alternative Vibes & Intimate Sets"
    };
  }
  if (norm.includes("edu") || norm.includes("workshop") || norm.includes("learn") || norm.includes("talk") || norm.includes("meetup")) {
    return {
      glow: "from-blue-500/25 via-indigo-900/10 to-transparent",
      accent: "text-sky-300",
      badge: "bg-blue-950/80 text-sky-200 border-blue-500/30",
      icon: <BookOpen className="h-7 w-7 text-sky-300" />,
      subtext: "Workshops, Knowledge & Ideas"
    };
  }
  return {
    glow: "from-emerald-500/25 via-teal-900/10 to-transparent",
    accent: "text-emerald-300",
    badge: "bg-emerald-950/80 text-emerald-200 border-emerald-500/30",
    icon: <Sparkles className="h-7 w-7 text-emerald-300" />,
    subtext: "Curated Community Experience"
  };
}

function InstagramIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

interface Organizer {
  id: string;
  email: string;
  brand_name: string;
  slug?: string;
  description?: string;
  social_links?: {
    instagram?: string;
    website?: string;
    twitter?: string;
    facebook?: string;
    phone?: string;
  };
  phone_number?: string;
  image_url?: string;
  rating?: number;
  instagram_handle?: string;
  instagram_verified?: boolean;
  followers_count?: number;
  total_events_count?: number;
  upcoming_events_count?: number;
  primary_city?: string;
}

interface VibeEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  city?: string;
  date_time: string;
  end_time?: string;
  timings?: string;
  category: string;
  organizer_email: string;
  google_maps_link?: string;
  whatsapp_group_link?: string;
  status: string;
  participant_limit?: number;
  is_paid?: boolean;
  is_featured?: boolean;
  visibility?: string;
  image_url?: string;
  average_rating?: number;
  ratings_count?: number;
  attendee_guide?: any;
  contact_info?: string;
  rsvp_count?: number;
  is_past?: number;
  user_rsvped?: boolean;
  user_rsvp_status?: string | null;
  user_pass_code?: string | null;
}

interface OrganizerProfileClientProps {
  initialOrganizer: Organizer;
  initialEvents: VibeEvent[];
  initialIsFollowing?: boolean;
  identifier: string;
}

// Countdown hook for real-time live timer display
function useCountdown(targetDateStr: string, endDateStr?: string | null, status?: string) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isPast: boolean;
    isLive: boolean;
  }>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isPast: false,
    isLive: false,
  });

  useEffect(() => {
    const calculate = () => {
      if (status === "ended") {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, isLive: false });
        return;
      }

      const startTime = new Date(targetDateStr).getTime();
      const now = Date.now();

      if (isNaN(startTime)) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false, isLive: false });
        return;
      }

      // Calculate end time: use endDateStr if available, otherwise default to 3 hours after start
      let endTime = endDateStr ? new Date(endDateStr).getTime() : NaN;
      if (isNaN(endTime)) {
        endTime = startTime + (3 * 60 * 60 * 1000);
      }

      // Event has ended
      if (now >= endTime) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, isLive: false });
        return;
      }

      // Event is currently live (now is between start and end time)
      if (now >= startTime && now < endTime) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isPast: false, isLive: true });
        return;
      }

      // Future event - count down to start
      const diff = startTime - now;
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, isPast: false, isLive: false });
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [targetDateStr, endDateStr, status]);

  return timeLeft;
}

// Single Event Card Component
function EventCard({
  event,
  userEmail,
  onRsvpSuccess,
  onOpenGuide,
}: {
  event: VibeEvent;
  userEmail?: string | null;
  onRsvpSuccess: (eventId: string, rsvpData: any) => void;
  onOpenGuide: (event: VibeEvent) => void;
}) {
  const [expandedRules, setExpandedRules] = useState(false);
  const [isRsvping, setIsRsvping] = useState(false);
  const [userRsvped, setUserRsvped] = useState(Boolean(event.user_rsvped));
  const [passCode, setPassCode] = useState(event.user_pass_code);
  const [rsvpStatus, setRsvpStatus] = useState(event.user_rsvp_status);

  const countdown = useCountdown(event.date_time, event.end_time, event.status);
  const { isVibrant } = useTheme();

  const formattedDate = useMemo(() => {
    try {
      const d = new Date(event.date_time);
      return d.toLocaleDateString("en-US", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "TBA";
    }
  }, [event.date_time]);

  const formattedTime = useMemo(() => {
    if (event.timings) return event.timings;
    try {
      const d = new Date(event.date_time);
      return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return "Evening";
    }
  }, [event.date_time, event.timings]);

  const handleRsvp = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (countdown.isPast) {
      toast.error("This event has already ended.");
      return;
    }

    if (!userEmail) {
      toast.error("Please sign in to book your spot!");
      return;
    }

    if (userRsvped) {
      onOpenGuide(event);
      return;
    }

    setIsRsvping(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/events/${event.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });
      const data = await res.json();

      if (data.success) {
        setUserRsvped(true);
        setPassCode(data.pass_code || null);
        setRsvpStatus(data.rsvp_status || "confirmed");
        toast.success(
          event.is_paid
            ? "Pass reserved! Complete payment with host."
            : "RSVP confirmed! See you at the vibe 🎉"
        );
        onRsvpSuccess(event.id, data);
      } else {
        toast.error(data.error || "Failed to RSVP");
      }
    } catch (err) {
      toast.error("Network error while booking tickets");
    } finally {
      setIsRsvping(false);
    }
  };

  // Extract house rules / guide items
  const guide = event.attendee_guide || {};
  const catStyle = getCategoryVibrantStyle(event.category);

  return (
    <div className={`ringer-card group overflow-hidden flex flex-col bg-white border transition-all duration-300 rounded-[22px] sm:rounded-[32px] ${
      countdown.isPast
        ? "border-black/5 opacity-80 bg-zinc-50/50 shadow-sm"
        : "border-black/8 hover:border-black/20 hover:shadow-xl"
    }`}>
      {/* Poster Image Area - Mobile Optimized Aspect Ratio */}
      <div className={`relative aspect-[16/8] sm:aspect-[16/11] w-full overflow-hidden bg-zinc-900 ${countdown.isPast ? "grayscale-[25%]" : ""}`}>
        {event.image_url ? (
          <>
            <img
              src={event.image_url}
              alt={event.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10 pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-zinc-900 via-slate-900 to-zinc-950 p-4 sm:p-6 flex flex-col items-center justify-center text-center select-none">
            {/* Subtle ambient category glow */}
            <div className={`absolute inset-0 bg-gradient-to-t ${catStyle.glow} pointer-events-none`} />
            <div className="absolute -top-8 -right-8 w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-white/5 blur-2xl pointer-events-none" />

            {/* Subtle Frosted Icon & Label Centerpiece */}
            <div className="relative z-10 flex flex-col items-center space-y-1 sm:space-y-2">
              <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                {catStyle.icon}
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-zinc-100 block">
                  {event.category} Vibe
                </span>
                <span className="text-[8px] sm:text-[10px] font-medium text-zinc-400 tracking-wide block max-w-[200px] line-clamp-1">
                  {catStyle.subtext}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Floating Top Badges */}
        <div className="absolute top-2 left-2 right-2 sm:top-3 sm:left-3 sm:right-3 flex items-center justify-between gap-1.5 sm:gap-2 z-10 pointer-events-none">
          <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
            <span 
              className={`sticker-badge ${catStyle.badge} backdrop-blur-md border font-black shadow-sm flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px]`}
            >
              {event.category}
            </span>
            {event.is_paid ? (
              <span className="sticker-badge bg-amber-400 text-black border-none font-black shadow-sm px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px]">
                Paid Pass
              </span>
            ) : (
              <span className="sticker-badge bg-emerald-500 text-white border-none font-black shadow-sm px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px]">
                Free Entry
              </span>
            )}
          </div>

          {event.average_rating ? (
            <span className="sticker-badge bg-white/95 text-zinc-900 border border-black/5 font-black shadow-sm flex items-center gap-0.5 sm:gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-[11px]">
              <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
              <span>{Number(event.average_rating).toFixed(1)}</span>
            </span>
          ) : null}
        </div>

        {/* Live / Status Banner */}
        {countdown.isPast ? (
          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-zinc-900/90 text-zinc-300 border border-white/10 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            Event Ended
          </div>
        ) : countdown.isLive ? (
          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-emerald-500 text-white px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md animate-pulse">
            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-white" />
            Live Now
          </div>
        ) : event.status === "housefull" ? (
          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-red-600 text-white px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-md">
            Sold Out
          </div>
        ) : event.status === "filling_fast" ? (
          <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-orange-500 text-white px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-md flex items-center gap-1">
            <Flame className="h-3 w-3" /> Filling Fast
          </div>
        ) : null}
      </div>

      {/* Card Body */}
      <div className="p-3.5 sm:p-6 flex-1 flex flex-col justify-between space-y-2.5 sm:space-y-4">
        <div className="space-y-2 sm:space-y-2.5">
          <Link href={`/event/${event.id}`}>
            <h3 className="text-base sm:text-2xl font-black text-black tracking-tight leading-snug sm:leading-tight uppercase italic hover:text-emerald-700 transition-colors line-clamp-2">
              {event.title}
            </h3>
          </Link>

          {/* Date & Time Info */}
          <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs font-bold text-zinc-600 flex-wrap">
            <span className="flex items-center gap-1 sm:gap-1.5 bg-zinc-100 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full">
              <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600" />
              <span>{formattedDate}</span>
            </span>
            <span className="flex items-center gap-1 sm:gap-1.5 bg-zinc-100 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full">
              <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-emerald-600" />
              <span>{formattedTime}</span>
            </span>
          </div>

          {/* Location Info */}
          <div className="flex items-start gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold text-zinc-600 pt-0.5">
            <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span className="line-clamp-1 sm:line-clamp-2">{event.location || `${event.city || "Venue"} (TBA)`}</span>
          </div>

          {/* Countdown Clock Strip (Clean & Balanced Pod) */}
          {!countdown.isPast && !countdown.isLive && (
            <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-zinc-50 border border-black/5 flex items-center justify-between text-center">
              <div className="flex-1">
                <span className="text-sm sm:text-lg font-black text-zinc-900">
                  {String(countdown.days).padStart(2, "0")}
                </span>
                <span className="block text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-zinc-400">
                  Days
                </span>
              </div>
              <span className="text-zinc-300 font-black text-xs sm:text-sm">:</span>
              <div className="flex-1">
                <span className="text-sm sm:text-lg font-black text-zinc-900">
                  {String(countdown.hours).padStart(2, "0")}
                </span>
                <span className="block text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-zinc-400">
                  Hrs
                </span>
              </div>
              <span className="text-zinc-300 font-black text-xs sm:text-sm">:</span>
              <div className="flex-1">
                <span className="text-sm sm:text-lg font-black text-zinc-900">
                  {String(countdown.minutes).padStart(2, "0")}
                </span>
                <span className="block text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-zinc-400">
                  Min
                </span>
              </div>
              <span className="text-zinc-300 font-black text-xs sm:text-sm">:</span>
              <div className="flex-1">
                <span className="text-sm sm:text-lg font-black text-zinc-900">
                  {String(countdown.seconds).padStart(2, "0")}
                </span>
                <span className="block text-[8px] sm:text-[9px] font-black uppercase tracking-wider text-zinc-400">
                  Sec
                </span>
              </div>
            </div>
          )}

          {/* Collapsible House Rules & T&Cs Accordion */}
          <div className="pt-0.5 sm:pt-1">
            <button
              type="button"
              onClick={() => setExpandedRules(!expandedRules)}
              className="w-full py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-lg sm:rounded-xl bg-zinc-100 hover:bg-zinc-200/70 text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-700 flex items-center justify-between transition-colors cursor-pointer"
            >
              <span>{expandedRules ? "▴ Hide Rules & Guidelines" : "▾ House Rules & Guidelines"}</span>
              <Info className="h-3 w-3 text-zinc-400" />
            </button>

            {expandedRules && (
              <div className="mt-2 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl bg-zinc-50 border border-black/5 text-xs space-y-2 text-zinc-600 animate-in fade-in-50 duration-200">
                <div className="font-bold text-black text-[10px] sm:text-[11px] uppercase tracking-wider">
                  Important Guidelines:
                </div>
                <ul className="list-disc list-inside space-y-1 text-[10px] sm:text-[11px] leading-relaxed">
                  <li>Valid Govt ID / Age proof may be required at the entrance.</li>
                  <li>Rights of admission reserved by the venue & host.</li>
                  <li>Please arrive 15 minutes before the scheduled time.</li>
                  {guide.feeNote && <li>{guide.feeNote}</li>}
                  {guide.whatToCarry && guide.whatToCarry.length > 0 && (
                    <li>What to bring: {guide.whatToCarry.join(", ")}</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-1 sm:pt-2">
          {countdown.isPast ? (
            <button
              type="button"
              disabled
              className="flex-1 ringer-button bg-zinc-100 text-zinc-400 border border-zinc-200 font-black text-[11px] sm:text-xs uppercase py-2.5 sm:py-3.5 shadow-none flex items-center justify-center gap-1.5 cursor-not-allowed select-none"
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Event Concluded</span>
            </button>
          ) : userRsvped ? (
            <button
              type="button"
              onClick={() => onOpenGuide(event)}
              className="flex-1 ringer-button bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[11px] sm:text-xs uppercase py-2.5 sm:py-3.5 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>{passCode ? `Pass: ${passCode}` : "Pass Confirmed"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleRsvp}
              disabled={isRsvping || event.status === "housefull"}
              className={`flex-1 ringer-button font-black text-[11px] sm:text-xs uppercase py-2.5 sm:py-3.5 shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 ${
                event.status === "housefull"
                  ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
              }`}
            >
              {isRsvping ? (
                <span>Booking...</span>
              ) : (
                <>
                  <Ticket className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  <span>{event.is_paid ? "Book Pass" : "RSVP Spot"}</span>
                </>
              )}
            </button>
          )}

          <Link
            href={`/event/${event.id}`}
            className="ringer-button bg-zinc-100 hover:bg-zinc-200 text-black border border-black/10 font-black text-[11px] sm:text-xs uppercase px-3 sm:px-4 py-2.5 sm:py-3.5 flex items-center justify-center gap-1 shrink-0"
            title="View full event briefing"
          >
            <span>Details</span>
            <ExternalLink className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function OrganizerProfileClient({
  initialOrganizer,
  initialEvents,
  initialIsFollowing = false,
  identifier,
}: OrganizerProfileClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { isVibrant } = useTheme();

  const [organizer, setOrganizer] = useState<Organizer>(initialOrganizer);
  const [events, setEvents] = useState<VibeEvent[]>(initialEvents);
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [followersCount, setFollowersCount] = useState<number>(initialOrganizer.followers_count || 0);
  const [activeTab, setActiveTab] = useState<"upcoming" | "about" | "passes">("upcoming");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("ALL");
  const [copied, setCopied] = useState(false);

  // Modals
  const [selectedGuideEvent, setSelectedGuideEvent] = useState<VibeEvent | null>(null);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramEventTarget, setTelegramEventTarget] = useState<VibeEvent | null>(null);

  // Sync state if initial props change
  useEffect(() => {
    setOrganizer(initialOrganizer);
    setEvents(initialEvents);
    setFollowersCount(initialOrganizer.followers_count || 0);
  }, [initialOrganizer, initialEvents]);

  // Helper to check if an event is today or later
  const isTodayOrLater = (ev: VibeEvent) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const evDate = new Date(ev.date_time);
      const evEndDate = ev.end_time ? new Date(ev.end_time) : null;
      return evDate >= today || (evEndDate ? evEndDate >= today : false);
    } catch {
      return true;
    }
  };

  // Only display events occurring today or later (older events are retained in DB but hidden from public profile)
  const activeEvents = useMemo(() => {
    return events.filter(isTodayOrLater);
  }, [events]);

  // Extract unique dates from upcoming/today events for the date filter bar
  const dateOptions = useMemo(() => {
    const datesMap = new Map<string, { label: string; dateStr: string; rawDate: Date }>();
    
    activeEvents.forEach((ev) => {
      try {
        const d = new Date(ev.date_time);
        const dateStr = d.toISOString().split("T")[0];
        if (!datesMap.has(dateStr)) {
          const weekday = d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
          const month = d.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
          const day = d.getDate();
          datesMap.set(dateStr, {
            dateStr,
            rawDate: d,
            label: `${weekday} ${month} ${day}`,
          });
        }
      } catch {}
    });

    const sortedDates = Array.from(datesMap.values()).sort(
      (a, b) => a.rawDate.getTime() - b.rawDate.getTime()
    );

    return [{ dateStr: "ALL", label: "ALL" }, ...sortedDates];
  }, [activeEvents]);

  // Filtered events based on date switcher
  const filteredEvents = useMemo(() => {
    return activeEvents.filter((ev) => {
      // Date filter
      if (selectedDateFilter !== "ALL") {
        try {
          const evDate = new Date(ev.date_time).toISOString().split("T")[0];
          if (evDate !== selectedDateFilter) return false;
        } catch {
          return false;
        }
      }
      return true;
    });
  }, [activeEvents, selectedDateFilter]);

  // User RSVPs for this organizer
  const userBookedEvents = useMemo(() => {
    return events.filter((e) => Boolean(e.user_rsvped));
  }, [events]);

  // Follow Toggle Action
  const handleToggleFollow = async () => {
    if (!session?.user?.email) {
      toast.error("Please sign in to follow this organizer!");
      return;
    }

    setIsFollowLoading(true);
    const nextState = !isFollowing;
    const method = isFollowing ? "DELETE" : "POST";
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    // Optimistic UI update
    setIsFollowing(nextState);
    setFollowersCount((prev) => Math.max(0, prev + (nextState ? 1 : -1)));

    try {
      const res = await fetch(`${baseUrl}/api/followers`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail: session.user.email,
          organizerEmail: organizer.email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(nextState ? `You are now following ${organizer.brand_name}! 🎉` : `Unfollowed ${organizer.brand_name}`);
      } else {
        // Revert on error
        setIsFollowing(!nextState);
        setFollowersCount((prev) => Math.max(0, prev + (!nextState ? 1 : -1)));
        toast.error(data.error || "Failed to update follow status");
      }
    } catch {
      setIsFollowing(!nextState);
      setFollowersCount((prev) => Math.max(0, prev + (!nextState ? 1 : -1)));
      toast.error("Network error while updating follow status");
    } finally {
      setIsFollowLoading(false);
    }
  };

  // Share profile
  const handleShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = `${organizer.brand_name} on VibeCheck`;
    const text = `Check out events and vibes hosted by ${organizer.brand_name}!`;

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {}
    }

    if (navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Organizer page link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRsvpSuccess = (eventId: string, rsvpData: any) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? {
              ...e,
              user_rsvped: true,
              user_rsvp_status: rsvpData.rsvp_status || "confirmed",
              user_pass_code: rsvpData.pass_code,
              rsvp_count: (e.rsvp_count || 0) + 1,
            }
          : e
      )
    );

    const targetEvent = events.find((e) => e.id === eventId);
    if (targetEvent?.whatsapp_group_link) {
      setTelegramEventTarget(targetEvent);
      setShowTelegramModal(true);
    }
  };

  const socialLinks = organizer.social_links || {};
  const instagramHandle = organizer.instagram_handle || socialLinks.instagram;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* ─── 1. Continuous Top Marquee Ticker ─── */}
      <div className="bg-black text-white text-[11px] font-black uppercase tracking-widest py-2 px-4 overflow-hidden border-b border-white/10 select-none">
        <div className="inline-flex gap-8 whitespace-nowrap animate-marquee">
          <span>
            {organizer.phone_number ? `📞 ${organizer.phone_number}` : `✨ OFFICIAL HOST PROFILE`}
          </span>
          <span>•</span>
          <span>{organizer.brand_name}</span>
          <span>•</span>
          <span>{organizer.primary_city ? `${organizer.primary_city.toUpperCase()} SCENE` : "VIBECHECK CURATED"}</span>
          <span>•</span>
          <span>CURATED EVENTS • LIVE EXPERIENCES • EXCLUSIVE PASSES</span>
          <span>•</span>
          <span>
            {organizer.phone_number ? `📞 ${organizer.phone_number}` : `✨ OFFICIAL HOST PROFILE`}
          </span>
          <span>•</span>
          <span>{organizer.brand_name}</span>
        </div>
      </div>

      {/* ─── 2. Top Navigation Bar ─── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4 pb-2 flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-zinc-600 hover:text-black transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>All Events</span>
        </Link>

        <div className="flex items-center gap-2">
          {instagramHandle && (
            <a
              href={
                instagramHandle.startsWith("http")
                  ? instagramHandle
                  : `https://instagram.com/${instagramHandle.replace("@", "")}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-black uppercase tracking-wider transition-all"
            >
              <InstagramIcon className="h-3.5 w-3.5" />
              <span>@{instagramHandle.replace("@", "")}</span>
              {organizer.instagram_verified && (
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 ml-0.5" />
              )}
            </a>
          )}

          <button
            type="button"
            onClick={handleShare}
            className="p-2 rounded-full bg-white hover:bg-zinc-100 text-black border border-black/10 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Share Organizer Page"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Share2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ─── 3. Hero Organizer Brand Showcase (Compact & Horizontal) ─── */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-2 pb-3 sm:pt-4 sm:pb-6">
        <div className="ringer-card bg-white p-3.5 sm:p-6 rounded-[22px] sm:rounded-[36px] border border-black/8 shadow-[0_4px_20px_rgb(0,0,0,0.03)] relative overflow-hidden">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center sm:items-start gap-3 sm:gap-6 relative z-10">
            {/* Organizer Avatar / Logo */}
            <div className="relative shrink-0">
              {organizer.image_url ? (
                <img
                  src={organizer.image_url}
                  alt={organizer.brand_name}
                  className="w-14 h-14 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl object-cover border-2 border-white shadow-md ring-2 ring-black/5 bg-zinc-100"
                />
              ) : (
                <div className="w-14 h-14 sm:w-24 sm:h-24 rounded-2xl sm:rounded-3xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-center font-black text-xl sm:text-3xl uppercase italic border-2 border-white shadow-md ring-2 ring-black/5">
                  {organizer.brand_name.charAt(0)}
                </div>
              )}
              <div
                className="absolute -bottom-1 -right-1 bg-emerald-600 text-white p-0.5 sm:p-1 rounded-full shadow-md ring-1.5 ring-white"
                title="Verified Event Host"
              >
                <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 stroke-[2.5]" />
              </div>
            </div>

            {/* Profile Info & Follow Button */}
            <div className="flex-1 min-w-0 space-y-1 sm:space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="sticker-badge bg-emerald-50 text-emerald-800 border-emerald-200/80 text-[9px] sm:text-xs py-0.5 px-2">
                      Verified Host
                    </span>
                    {organizer.primary_city && (
                      <span className="sticker-badge bg-zinc-100 text-zinc-600 border-none text-[9px] sm:text-xs py-0.5 px-1.5">
                        📍 {organizer.primary_city}
                      </span>
                    )}
                  </div>

                  <h1 className="text-lg sm:text-3xl font-black text-black tracking-tight sm:tracking-tighter uppercase italic leading-tight truncate mt-0.5">
                    {organizer.brand_name}
                  </h1>
                </div>

                {/* Follow Button */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleFollow}
                    disabled={isFollowLoading}
                    className={`ringer-button font-black text-[11px] sm:text-xs uppercase px-3 sm:px-5 py-1.5 sm:py-2.5 flex items-center gap-1.5 cursor-pointer shadow-sm transition-all active:scale-95 ${
                      isFollowing
                        ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                    }`}
                  >
                    {isFollowing ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Following Host</span>
                        <span className="sm:hidden">Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>

                  {organizer.phone_number && (
                    <a
                      href={`tel:${organizer.phone_number}`}
                      className="hidden sm:flex ringer-button bg-zinc-100 hover:bg-zinc-200 text-black border border-black/10 font-black text-xs uppercase px-4 py-2.5 items-center gap-1.5"
                    >
                      <Phone className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Contact</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Bio description - hidden on mobile, shown on tablet/desktop */}
              {organizer.description ? (
                <p className="hidden sm:block text-xs sm:text-sm font-normal text-zinc-600 max-w-2xl leading-relaxed whitespace-pre-line line-clamp-2">
                  {organizer.description}
                </p>
              ) : null}

              {/* Compact Inline Stats */}
              <div className="flex items-center gap-2 sm:gap-4 text-[10px] sm:text-xs font-bold text-zinc-600 pt-0.5 flex-wrap">
                <span className="text-black font-black">
                  {followersCount >= 1000 ? `${(followersCount / 1000).toFixed(1)}K` : followersCount}{" "}
                  <span className="text-zinc-400 font-semibold uppercase text-[9px] sm:text-[10px]">Followers</span>
                </span>
                <span className="text-zinc-300">•</span>
                <span className="text-black font-black">
                  {events.length}{" "}
                  <span className="text-zinc-400 font-semibold uppercase text-[9px] sm:text-[10px]">Hosted</span>
                </span>
                <span className="text-zinc-300">•</span>
                <span className="flex items-center gap-1 text-amber-900 font-black">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                  <span>{Number(organizer.rating || 4.8).toFixed(1)}</span>
                  <span className="text-zinc-400 font-semibold uppercase text-[9px] sm:text-[10px]">Rating</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 4. Segmented Tabs Bar ─── */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6">
        <div className="flex items-center gap-1.5 sm:gap-2 p-1 sm:p-1.5 rounded-full bg-zinc-200/80 border border-black/5 max-w-md mx-auto sm:mx-0">
          <button
            type="button"
            onClick={() => setActiveTab("upcoming")}
            className={`flex-1 py-2 px-3 sm:py-2.5 sm:px-4 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "upcoming"
                ? "bg-black text-white shadow-md"
                : "text-zinc-600 hover:text-black"
            }`}
          >
            <span>Upcoming Events</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/20 text-[9px] sm:text-[10px]">
              {events.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("about")}
            className={`flex-1 py-2 px-3 sm:py-2.5 sm:px-4 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "about"
                ? "bg-black text-white shadow-md"
                : "text-zinc-600 hover:text-black"
            }`}
          >
            About & Venue
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("passes")}
            className={`flex-1 py-2 px-3 sm:py-2.5 sm:px-4 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeTab === "passes"
                ? "bg-black text-white shadow-md"
                : "text-zinc-600 hover:text-black"
            }`}
          >
            <span>My Passes</span>
            {userBookedEvents.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] sm:text-[10px]">
                {userBookedEvents.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ─── 5. Tab Contents ─── */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6">
        {activeTab === "upcoming" && (
          <div className="space-y-4 sm:space-y-6">
            {/* Header & Date Filter Bar (like HOD reference) */}
            <div className="space-y-2.5 sm:space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-2">
                <div>
                  <h2 className="text-xl sm:text-3xl font-black uppercase italic tracking-tight text-black">
                    Upcoming Events
                  </h2>
                  <p className="text-[11px] sm:text-xs font-semibold text-zinc-500">
                    Secure your spot • Limited passes available each night
                  </p>
                </div>
              </div>

              {/* Date Filter Pills Carousel */}
              {dateOptions.length > 1 && (
                <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 sm:py-1">
                  {dateOptions.map((item) => (
                    <button
                      key={item.dateStr}
                      type="button"
                      onClick={() => setSelectedDateFilter(item.dateStr)}
                      className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[11px] sm:text-xs font-black uppercase tracking-wider shrink-0 transition-all cursor-pointer ${
                        selectedDateFilter === item.dateStr
                          ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/25 scale-105"
                          : "bg-white text-zinc-700 border border-black/10 hover:border-black/30"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Events Grid */}
            {filteredEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-6">
                {filteredEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    userEmail={session?.user?.email}
                    onRsvpSuccess={handleRsvpSuccess}
                    onOpenGuide={(ev) => setSelectedGuideEvent(ev)}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-[32px] border border-black/5 space-y-3">
                <Sparkles className="h-10 w-10 text-emerald-500 mx-auto opacity-60" />
                <h3 className="text-xl font-black uppercase italic text-black">
                  No Events For Selected Date
                </h3>
                <p className="text-xs font-semibold text-zinc-500">
                  Try switching back to "ALL" to browse the full event calendar.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDateFilter("ALL");
                  }}
                  className="ringer-button bg-black text-white text-xs font-black uppercase px-6 py-2.5"
                >
                  View All Events
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB: About & Venue Details ─── */}
        {activeTab === "about" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 ringer-card bg-white p-6 sm:p-8 rounded-[32px] border border-black/8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-2xl font-black uppercase italic text-black">
                  About {organizer.brand_name}
                </h3>
                <p className="text-sm font-normal text-zinc-600 leading-relaxed whitespace-pre-line">
                  {organizer.description || "The organizer has not provided a detailed bio yet."}
                </p>
              </div>

              {/* Social Links & Web */}
              <div className="space-y-3 pt-4 border-t border-black/5">
                <h4 className="text-xs font-black uppercase tracking-wider text-black">
                  Connect &amp; Social Links
                </h4>
                <div className="flex flex-wrap gap-2.5">
                  {socialLinks.instagram && (
                    <a
                      href={
                        socialLinks.instagram.startsWith("http")
                          ? socialLinks.instagram
                          : `https://instagram.com/${socialLinks.instagram.replace("@", "")}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-black uppercase tracking-wider"
                    >
                      <InstagramIcon className="h-4 w-4" />
                      <span>Instagram</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  {socialLinks.website && (
                    <a
                      href={socialLinks.website.startsWith("http") ? socialLinks.website : `https://${socialLinks.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-xs font-black uppercase tracking-wider"
                    >
                      <Globe className="h-4 w-4" />
                      <span>Official Website</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}

                  {socialLinks.twitter && (
                    <a
                      href={socialLinks.twitter.startsWith("http") ? socialLinks.twitter : `https://twitter.com/${socialLinks.twitter.replace("@", "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs font-black uppercase tracking-wider"
                    >
                      <span>Twitter / X</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Contact & Verified Host Info */}
            <div className="space-y-6">
              <div className="ringer-card bg-white p-6 rounded-[32px] border border-black/8 space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h4 className="text-sm font-black uppercase tracking-wider text-black">
                    Verified Host
                  </h4>
                </div>
                <p className="text-xs font-semibold text-zinc-500 leading-relaxed">
                  This organizer is an approved event creator on VibeCheck. All RSVPs and attendee passes are digitally verified.
                </p>

                {organizer.phone_number && (
                  <div className="pt-2">
                    <a
                      href={`https://wa.me/${organizer.phone_number.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full ringer-button bg-[#25D366] hover:bg-[#20bd5a] text-white font-black text-xs uppercase py-3 flex items-center justify-center gap-2 shadow-md shadow-[#25D366]/20"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Chat on WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: My Passes / Bookings ─── */}
        {activeTab === "passes" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-2xl font-black uppercase italic text-black">
                Your Passes with {organizer.brand_name}
              </h3>
              <p className="text-xs font-semibold text-zinc-500">
                View your confirmed tickets, digital entry QR codes, and event briefings.
              </p>
            </div>

            {userBookedEvents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userBookedEvents.map((ev) => (
                  <div
                    key={ev.id}
                    className="p-5 rounded-[28px] bg-white border border-emerald-500/30 shadow-md flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1 min-w-0">
                      <span className="sticker-badge bg-emerald-100 text-emerald-800 border-none font-black text-[9px]">
                        Pass Confirmed
                      </span>
                      <h4 className="text-base font-black uppercase italic text-black truncate">
                        {ev.title}
                      </h4>
                      <p className="text-xs font-semibold text-zinc-500">
                        {new Date(ev.date_time).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                      {ev.user_pass_code && (
                        <div className="inline-block px-2.5 py-0.5 rounded-md bg-zinc-100 font-mono text-xs font-black text-black">
                          Code: {ev.user_pass_code}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedGuideEvent(ev)}
                      className="ringer-button bg-black hover:bg-zinc-800 text-white font-black text-xs uppercase px-4 py-2.5 shrink-0 cursor-pointer"
                    >
                      View Ticket
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center bg-white rounded-[32px] border border-black/5 space-y-3">
                <Ticket className="h-10 w-10 text-zinc-400 mx-auto" />
                <h4 className="text-lg font-black uppercase italic text-black">
                  No Active Passes Found
                </h4>
                <p className="text-xs font-semibold text-zinc-500 max-w-sm mx-auto">
                  You haven't RSVP'd to any events with this organizer yet. Check out the upcoming events to reserve your spot!
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab("upcoming")}
                  className="ringer-button bg-emerald-600 text-white font-black text-xs uppercase px-6 py-2.5 cursor-pointer"
                >
                  Browse Events
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── 6. Modals ─── */}
      {selectedGuideEvent && (
        <AttendeeBriefingModal
          isOpen={Boolean(selectedGuideEvent)}
          onClose={() => setSelectedGuideEvent(null)}
          event={selectedGuideEvent}
          passCode={selectedGuideEvent.user_pass_code || undefined}
        />
      )}

      {showTelegramModal && telegramEventTarget && (
        <JoinTelegramPromptModal
          isOpen={showTelegramModal}
          onClose={() => {
            setShowTelegramModal(false);
            setTelegramEventTarget(null);
          }}
          telegramGroupLink={telegramEventTarget.whatsapp_group_link || ""}
          eventTitle={telegramEventTarget.title}
        />
      )}
    </div>
  );
}
