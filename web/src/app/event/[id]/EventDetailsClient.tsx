"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PhoneVerificationModal } from "@/components/PhoneVerificationModal";
import { AttendeeBriefingModal } from "@/components/AttendeeBriefingModal";
import { OrganizerDetailsModal } from "@/components/OrganizerDetailsModal";
import { EventRatingModal } from "@/components/EventRatingModal";
import { JoinTelegramPromptModal } from "@/components/JoinTelegramPromptModal";
import { formatTelegramLink } from "@/lib/telegramGroup";
import { CategoryDecorations, getCategoryCardClass, getCategoryStubClass, getCategoryAccentColor, getCategoryBadgeClass, getCategoryDarkTitleColor } from "@/components/CategoryDecorations";
import { TicketPerforationDivider } from "@/components/TicketPerforationDivider";
import { useTheme } from "@/context/ThemeContext";
import { ArrowLeft, ArrowRight, ChevronRight, Calendar, MapPin, CheckCircle2, CalendarPlus, Share2, Link2, Users, Star, Sparkles, Ticket, Clock, AlertCircle, ExternalLink, Send, Globe, ShieldCheck } from "lucide-react";
import { formatEventTimeWithTimezone, getTimezoneAbbr } from "@/lib/timezone";
import { toast } from "sonner";

interface EventDetailsClientProps {
  initialEvent?: any;
  eventId: string;
}

export function EventDetailsClient({ initialEvent, eventId }: EventDetailsClientProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [event, setEvent] = useState<any>(initialEvent || null);
  const [loading, setLoading] = useState(!initialEvent);
  const [isPrivateDenied, setIsPrivateDenied] = useState(false);
  const [privateErrorMsg, setPrivateErrorMsg] = useState<string | null>(null);
  const [rsvped, setRsvped] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<'pending' | 'confirmed' | null>(null);
  const [passCode, setPassCode] = useState<string | null>(null);
  const [device, setDevice] = useState<'desktop' | 'ios' | 'android'>('desktop');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const [showBriefingModal, setShowBriefingModal] = useState(false);
  const [showTelegramPromptModal, setShowTelegramPromptModal] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [showAgeModal, setShowAgeModal] = useState(false);
  const [ageDeclared, setAgeDeclared] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [userRating, setUserRating] = useState<any>(null);
  const [userHasPhone, setUserHasPhone] = useState(false);
  const { isVibrant } = useTheme();

  const hasMandatoryAge = (event?.min_age !== null && event?.min_age !== undefined && Number(event?.min_age) > 0) || ['Techno', 'Nightlife', 'Clubbing'].includes(event?.category || '');
  const requiredMinAge = (event?.min_age !== null && event?.min_age !== undefined && Number(event?.min_age) > 0) ? Number(event?.min_age) : (['Techno', 'Nightlife', 'Clubbing'].includes(event?.category || '') ? 21 : 18);

  useEffect(() => {
    if (!eventId) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const userEmailParam = session?.user?.email ? `?email=${encodeURIComponent(session.user.email)}` : '';

    if (session?.user?.email) {
      fetch(`${baseUrl}/api/user?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data?.phone_number) {
            setUserHasPhone(true);
          }
        })
        .catch(console.error);

      fetch(`${baseUrl}/api/events/${eventId}/rsvp/check?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(d => {
          if (d.success && d.rsvped) {
            setRsvped(true);
            setRsvpStatus(d.rsvp_status || 'pending');
            setPassCode(d.pass_code || null);
          }
        })
        .catch(console.error);

      fetch(`${baseUrl}/api/events/${eventId}/ratings?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data?.userRating) {
            setHasRated(true);
            setUserRating(res.data.userRating);
          } else {
            setHasRated(false);
            setUserRating(null);
          }
        })
        .catch(console.error);
    }

    // Always fetch or verify event access (especially for invite-only events)
    fetch(`${baseUrl}/api/events/${eventId}${userEmailParam}`)
      .then(async res => {
        const json = await res.json();
        if (res.status === 403 || json.is_private) {
          setIsPrivateDenied(true);
          setPrivateErrorMsg(json.error || "This is a private, invite-only event.");
          setEvent(null);
        } else if (json.success && json.data) {
          setEvent(json.data);
          setIsPrivateDenied(false);
        } else if (!initialEvent) {
          router.push("/dashboard");
        }
      })
      .catch(err => {
        console.error("Event fetch error:", err);
        if (!initialEvent) router.push("/dashboard");
      })
      .finally(() => setLoading(false));

    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      if (/iPhone|iPad|iPod/i.test(ua)) setDevice('ios');
      else if (/Android/i.test(ua)) setDevice('android');
      else setDevice('desktop');
    }
  }, [eventId, initialEvent, router, session, status]);

  const handleDownloadICS = () => {
    if (!event) return;
    const startDate = new Date(event.date_time);
    const endDate = event.end_time ? new Date(event.end_time) : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

    if (device === 'ios') {
      const formatDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const descriptionWithTimings = event.timings ? `TIMINGS: ${event.timings}\n\n${event.description}` : event.description;
      const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nDTSTART:${formatDate(startDate)}\nDTEND:${formatDate(endDate)}\nSUMMARY:${event.title}\nDESCRIPTION:${descriptionWithTimings}\nLOCATION:${event.location}\nEND:VEVENT\nEND:VCALENDAR`;
      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${event.title.replace(/\s+/g, '_')}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const formatGCalDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const descriptionWithTimings = event.timings ? `TIMINGS: ${event.timings}\n\n${event.description}` : event.description;
    const gcalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${formatGCalDate(startDate)}/${formatGCalDate(endDate)}&details=${encodeURIComponent(descriptionWithTimings)}&location=${encodeURIComponent(event.location)}`;
    window.open(gcalUrl, '_blank');
  };

  const handleRSVP = async (skipPhoneCheck: boolean = false, skipAgeCheck: boolean = false) => {
    if (!session?.user?.email) {
      signIn("google", { callbackUrl: window.location.href });
      return;
    }
    if (!skipPhoneCheck && !userHasPhone) {
      setShowPhoneModal(true);
      return;
    }
    if (!skipAgeCheck && hasMandatoryAge && !ageDeclared) {
      setShowAgeModal(true);
      return;
    }
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          age_confirmed: hasMandatoryAge ? true : undefined
        })
      });
      const data = await res.json();
      if (data.success) {
        setRsvped(true);
        const resolvedStatus = data.rsvp_status || 'pending';
        setRsvpStatus(resolvedStatus);
        setPassCode(data.pass_code || null);
        if (event?.is_paid) {
          toast.success("Registration received! Pass pending payment with organizer.");
        } else {
          toast.success("RSVP received! Pass pending organizer approval.");
        }
        // Refresh event data to update rsvp_count and group link
        const refreshedEventRes = await fetch(`${baseUrl}/api/events/${eventId}`);
        const refreshedEvent = await refreshedEventRes.json();
        const latestEvent = refreshedEvent.success ? refreshedEvent.data : event;
        if (refreshedEvent.success) {
          setEvent(refreshedEvent.data);
        }

        // If Telegram group link exists, prompt attendee to join, otherwise open briefing pass
        if (latestEvent?.whatsapp_group_link) {
          setShowTelegramPromptModal(true);
        } else {
          setShowBriefingModal(true);
        }
      } else {
        toast.error(data.error || "RSVP failed");
      }
    } catch (err) {
      console.error("RSVP failed", err);
      toast.error("An error occurred during RSVP");
    }
  };

  const handleShare = async () => {
    if (!event) return;
    const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
    const shareText = `Check out ${event.title} on VibeCheck!`;
    const shareData = {
      title: `${event.title} | VibeCheck`,
      text: shareText,
      url: shareUrl,
    };
    
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        if (navigator.canShare && !navigator.canShare(shareData)) {
          await navigator.share({ title: `${event.title} | VibeCheck`, url: shareUrl });
        } else {
          await navigator.share(shareData);
        }
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          return;
        }
        console.warn("Native share failed, falling back to clipboard copy", err);
      }
    }
    
    handleCopyLink();
  };

  const handleCopyLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = url;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      toast.success("Vibe link copied to clipboard!");
    } catch {
      toast.success("Vibe link copied!");
    }
  };

  const handleGetTelegramPass = async () => {
    if (!event) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/passes/telegram-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          user_email: session?.user?.email
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.sent_directly) {
          toast.success("Pass image sent directly to your Telegram chat!");
        } else if (data.deep_link) {
          toast.success("Opening Telegram to receive your pass image...");
          window.open(data.deep_link, '_blank');
        }
      } else {
        const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'VibeCheckSpaceBot';
        window.open(`https://t.me/${botUsername}?start=event_${event.id}`, '_blank');
      }
    } catch (e) {
      const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'VibeCheckSpaceBot';
      window.open(`https://t.me/${botUsername}?start=event_${event.id}`, '_blank');
    }
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto p-12 space-y-8">
      <div className="h-8 w-48 bg-zinc-100 animate-pulse rounded-full" />
      <div className="h-96 w-full bg-zinc-100 animate-pulse rounded-[40px]" />
    </div>
  );

  if (isPrivateDenied) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="rounded-[36px] bg-gradient-to-b from-zinc-900 to-zinc-950 border-2 border-amber-400/40 p-8 sm:p-12 shadow-[0_20px_50px_rgba(245,158,11,0.15)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-3xl sm:text-4xl shadow-inner mb-6">
            🔒
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] sm:text-xs font-black uppercase tracking-wider mb-4">
            <Sparkles className="w-3.5 h-3.5 fill-amber-400 text-amber-400" /> Exclusive VIP Guest List Only
          </div>

          <h1 className="text-2xl sm:text-4xl font-black italic uppercase tracking-tight text-white mb-4">
            Private VIP Access Required
          </h1>

          <p className="text-zinc-400 text-sm sm:text-base max-w-md mx-auto mb-8 leading-relaxed">
            {privateErrorMsg || "This experience is strictly invite-only. Only guests on the host's confirmed VIP list can view details and claim passes."}
          </p>

          {!session?.user?.email ? (
            <div className="space-y-4 max-w-xs mx-auto">
              <Button
                onClick={() => signIn("google", { callbackUrl: window.location.href })}
                className="w-full bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-black font-black uppercase text-xs sm:text-sm py-6 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                Sign In to Verify Access
              </Button>
              <p className="text-[11px] text-zinc-500">
                Already invited? Sign in with your registered email address.
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-w-md mx-auto">
              <div className="p-3.5 rounded-2xl bg-zinc-800/80 border border-white/10 text-xs text-zinc-300 text-left sm:text-center">
                Signed in as: <span className="text-amber-300 font-bold">{session.user.email}</span>
                <p className="text-[11px] text-zinc-400 mt-1">
                  This account is not on the VIP guest list. If you received an invitation on another email, please switch accounts or contact the organizer.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  onClick={() => signIn("google", { callbackUrl: window.location.href })}
                  variant="outline"
                  className="w-full sm:w-auto border-white/20 text-white hover:bg-white/10 text-xs font-black uppercase tracking-wider rounded-xl"
                >
                  Switch Account
                </Button>
                <Link href="/dashboard" className="w-full sm:w-auto">
                  <Button
                    className="w-full bg-white text-black hover:bg-zinc-200 text-xs font-black uppercase tracking-wider rounded-xl"
                  >
                    Back to Explore
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!event) return null;

  const isCancelled = event.status === 'cancelled';
  const isHousefull = event.status === 'housefull' || (event.participant_limit && (event.rsvp_count || 0) >= event.participant_limit);
  const isFillingFast = event.status === 'filling_fast';
  const isEventEnded = event.status === 'ended' || (event.end_time ? new Date(event.end_time).getTime() <= Date.now() : event.date_time ? new Date(event.date_time).getTime() <= Date.now() : false);

  return (
    <>
      {session?.user?.email && (
        <PhoneVerificationModal
          isOpen={showPhoneModal}
          onClose={() => setShowPhoneModal(false)}
          onVerified={() => {
            setUserHasPhone(true);
            setShowPhoneModal(false);
            handleRSVP(true);
          }}
          email={session.user.email}
        />
      )}

      <div className="max-w-5xl mx-auto px-3.5 sm:px-6 py-4 sm:py-10 space-y-3.5 sm:space-y-6 animate-in fade-in duration-700">
      <Link href="/dashboard" className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back to Explore
      </Link>
      
      <div className={`relative flex flex-col md:flex-row rounded-2xl md:rounded-[24px] ticket-card-wrapper transition-all ${isVibrant ? 'text-zinc-950' : ''}`}>
        {/* Left Side: Editorial Content Stub */}
        <div className={`flex-1 p-5 sm:p-8 lg:p-10 flex flex-col justify-between relative z-10 rounded-t-2xl md:rounded-t-none md:rounded-l-[24px] ticket-stub-primary ${
          isVibrant ? getCategoryCardClass(event.category) : 'bg-white border border-black/5'
        }`}>
          {isVibrant && <CategoryDecorations category={event.category} />}
          <div className="space-y-3.5 sm:space-y-4 relative z-10">
            <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
              <div 
                className={`sticker-badge ${getCategoryBadgeClass(event.category)} border-none shadow-sm text-[10px] sm:text-xs font-black`}
              >
                {event.category}
              </div>
              {event.event_type === 'online' ? (
                <div className="sticker-badge bg-white/90 backdrop-blur-xs border border-sky-300 text-sky-900 font-bold text-[10px] sm:text-xs flex items-center gap-1.5 shadow-xs">
                  <Globe className="w-3.5 h-3.5 text-sky-600" />
                  <span>Online Event</span>
                </div>
              ) : (
                <div className="sticker-badge bg-white/90 backdrop-blur-xs border border-black/10 text-zinc-800 font-bold text-[10px] sm:text-xs flex items-center gap-1.5 shadow-xs">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>{event.city || "In-Person"}</span>
                </div>
              )}
              {event.visibility === 'invite_only' && (
                <div className="sticker-badge bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-none font-black text-[10px] sm:text-xs shadow-sm flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 fill-black text-black" /> VIP Invite-Only
                </div>
              )}
              {event.min_age !== null && event.min_age !== undefined && Number(event.min_age) > 0 && (
                <div className="sticker-badge bg-white/90 backdrop-blur-xs border border-red-200 text-red-700 font-black text-[10px] sm:text-xs flex items-center gap-1 shadow-xs">
                  <span>🔞 {event.min_age}+ Only</span>
                </div>
              )}
              {event.suitable_age && (
                <div className="sticker-badge bg-white/90 backdrop-blur-xs border border-purple-200 text-purple-800 font-bold text-[10px] sm:text-xs flex items-center gap-1 shadow-xs">
                  <Users className="w-3.5 h-3.5 text-purple-600" />
                  <span>Suitable: {event.suitable_age}</span>
                </div>
              )}
              <div className="sticker-badge bg-white/90 backdrop-blur-xs border border-black/10 text-zinc-800 font-bold text-[10px] sm:text-xs shadow-xs">
                {event.is_paid ? "Paid Event" : "Free Entry"}
              </div>
              {event.venue_verification_status === 'verified' && (
                <div className="sticker-badge bg-white/90 backdrop-blur-xs border border-emerald-300 text-emerald-900 font-black text-[10px] sm:text-xs flex items-center gap-1.5 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>🛡️ Venue Confirmed</span>
                </div>
              )}
              {event.venue_verification_status === 'pending_venue_auth' && (
                <div className="sticker-badge bg-white/90 backdrop-blur-xs border border-amber-300 text-amber-900 font-bold text-[10px] sm:text-xs flex items-center gap-1.5 shadow-xs">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>⏳ Venue Authorization Pending</span>
                </div>
              )}
              {event.average_rating ? (
                <div className="sticker-badge bg-white/90 backdrop-blur-xs border border-amber-300 text-amber-950 font-black text-[10px] sm:text-xs flex items-center gap-1.5 shadow-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <span>{Number(event.average_rating).toFixed(1)}</span>
                  <span className="text-[10px] text-amber-800 font-bold">({event.ratings_count || 0})</span>
                </div>
              ) : null}
              {isCancelled && (
                <div className="sticker-badge bg-rose-600 border-none text-white font-black text-[10px] sm:text-xs animate-pulse flex items-center gap-1">
                  🚨 Event Cancelled
                </div>
              )}
              {event.status === 'housefull' && (
                <div className="sticker-badge bg-red-500 border-none text-white font-black text-[10px] sm:text-xs animate-pulse">Sold Out</div>
              )}
              {event.status === 'filling_fast' && (
                <div className="sticker-badge bg-orange-500 border-none text-white font-black text-[10px] sm:text-xs animate-pulse flex items-center gap-1"><Sparkles className="h-4 w-4" /> Filling Fast</div>
              )}
              {isEventEnded && (
                <div className="sticker-badge bg-zinc-800 border-none text-white font-bold text-[10px] sm:text-xs">Event Ended</div>
              )}
            </div>
            
            <h1 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-[40px] font-black tracking-tighter leading-tight sm:leading-[1.05] uppercase italic break-words"
              style={isVibrant ? { color: getCategoryDarkTitleColor(event.category) } : undefined}
            >
              {event.title}
            </h1>
            {/* Subtle Organizer Trigger with Trailing Chevron Affordance */}
            <button
              type="button"
              onClick={() => setShowOrganizerModal(true)}
              className="group inline-flex items-center gap-2 py-1 px-3 -ml-0.5 rounded-full bg-white/80 hover:bg-white active:bg-zinc-100 border border-black/10 shadow-2xs hover:shadow-xs active:scale-98 transition-all text-xs sm:text-sm text-left cursor-pointer w-fit"
              title="Click to view host profile and bio"
            >
              {/* Mini Avatar */}
              <div className="relative shrink-0">
                {event.organizer_image ? (
                  <img
                    src={event.organizer_image}
                    alt={event.organizer_name || "Organizer"}
                    className="w-5 h-5 rounded-full object-cover border border-black/10"
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-zinc-900 text-white flex items-center justify-center font-black text-[10px]">
                    {((event.organizer_name || "VibeCheck Organizer").charAt(0) || "O").toUpperCase()}
                  </div>
                )}
                {event.organizer_instagram_verified && (
                  <span className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white rounded-full p-0.2" title="Verified Host">
                    <ShieldCheck className="w-2 h-2" />
                  </span>
                )}
              </div>

              <span className="text-zinc-500 font-semibold">Organized by</span>
              <span className="font-black text-zinc-950 group-hover:text-primary transition-colors">
                {event.organizer_name || "VibeCheck Organizer"}
              </span>

              {event.organizer_rating && Number(event.organizer_rating) > 0 && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                  <span>{Number(event.organizer_rating).toFixed(1)}</span>
                </span>
              )}

              {/* Trailing affordance chevron */}
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:text-zinc-900 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </button>

            <div className="italic text-zinc-700 text-xs sm:text-sm md:text-[15px] font-medium leading-relaxed whitespace-pre-line tracking-[-0.01em] pt-1">
              {event.description}
            </div>

          {/* Attendee Guide Preview Strip (if organizer provided guide info) */}
          {Boolean(
            event.attendee_guide && (
              (event.attendee_guide.schedule && event.attendee_guide.schedule.length > 0) ||
              (event.attendee_guide.highlights && event.attendee_guide.highlights.length > 0) ||
              (event.attendee_guide.whatToCarry && event.attendee_guide.whatToCarry.length > 0) ||
              event.attendee_guide.assemblyPoint ||
              (event.attendee_guide.contacts && event.attendee_guide.contacts.length > 0) ||
              event.attendee_guide.feeNote
            )
          ) && (
            <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white/80 backdrop-blur-xs border border-black/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mt-2 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-black">
                    Event Guide &amp; Schedule
                  </h4>
                  <p className="text-[11px] sm:text-xs font-medium text-zinc-600">
                    Schedule, program highlights, what to carry &amp; assembly details.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBriefingModal(true)}
                className="ringer-button bg-white hover:bg-zinc-100 text-black border border-black/10 text-xs font-black uppercase px-4 py-2 sm:px-5 sm:py-2.5 flex items-center gap-1.5 transition-all active:scale-95 shadow-xs cursor-pointer shrink-0"
              >
                <span>View More Details</span>
                <ExternalLink className="h-3.5 w-3.5 text-primary" />
              </button>
            </div>
          )}
          </div>

          <div className="flex flex-row gap-2.5 sm:gap-4 mt-6 sm:mt-8 pt-4 relative z-10">
            {isCancelled ? (
              <div className="w-full p-4 sm:p-6 rounded-2xl sm:rounded-[24px] bg-rose-50 border-2 border-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                    <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <div className="text-sm sm:text-base font-black text-rose-950 uppercase tracking-tight">
                      This Event Has Been Cancelled
                    </div>
                    <div className="text-xs font-bold text-rose-800">
                      The organizer has officially cancelled this event. Any passes and bookings have been voided.
                    </div>
                  </div>
                </div>
                <Link
                  href="/dashboard"
                  className="ringer-button text-xs font-black bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-xl uppercase tracking-wider"
                >
                  Explore Other Vibes
                </Link>
              </div>
            ) : isEventEnded ? (
              // ENDED EVENT STATE: Only Rating button or "Already Rated" confirmation stays
              hasRated ? (
                <div className="w-full p-3.5 sm:p-5 rounded-xl sm:rounded-[20px] bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black">
                      <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div>
                      <div className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wide">
                        You've Rated This Vibe &amp; Host
                      </div>
                      <div className="text-[11px] sm:text-xs font-bold text-emerald-700">
                        Thank you for your feedback! This event is completed.
                      </div>
                    </div>
                  </div>
                  {userRating?.event_rating && (
                    <div className="flex items-center gap-1.5 px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-xl bg-emerald-100 font-black text-emerald-900 text-xs sm:text-sm shadow-xs">
                      <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-amber-400 text-amber-500" />
                      <span>{userRating.event_rating}/5</span>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    if (!session?.user?.email) {
                      signIn("google", { callbackUrl: window.location.href });
                      return;
                    }
                    setShowRatingModal(true);
                  }}
                  className="ringer-button h-14 sm:h-14 md:h-16 w-full text-sm sm:text-base font-black flex items-center justify-center gap-2.5 sm:gap-3 transition-all active:scale-95 rounded-2xl sm:rounded-[20px] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black shadow-lg shadow-amber-500/25 cursor-pointer uppercase tracking-wider"
                >
                  <Star className="h-5 w-5 fill-black text-black shrink-0" />
                  <span>⭐ RATE EVENT &amp; HOST</span>
                </button>
              )
            ) : (
              // ACTIVE / UPCOMING EVENT STATE
              <>
                {rsvped ? (
                  rsvpStatus === 'pending' ? (
                    <button 
                      onClick={() => setShowBriefingModal(true)}
                      className="ringer-button h-14 sm:h-14 md:h-16 flex-1 text-xs sm:text-sm font-black tracking-wide flex items-center justify-center gap-2.5 sm:gap-3 transition-all active:scale-95 rounded-2xl sm:rounded-[20px] bg-amber-500 text-black hover:bg-amber-400 shadow-md cursor-pointer"
                    >
                      <Clock className="h-4.5 w-4.5 sm:h-5 sm:w-5 shrink-0" />
                      <span>{event.is_paid ? 'PAYMENT PENDING • VIEW BRIEFING' : 'APPROVAL PENDING • VIEW BRIEFING'}</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => setShowBriefingModal(true)}
                      className="ringer-button h-14 sm:h-14 md:h-16 flex-1 text-xs sm:text-sm font-black tracking-wide flex items-center justify-center gap-2.5 sm:gap-3 transition-all active:scale-95 rounded-2xl sm:rounded-[20px] bg-primary text-black hover:bg-primary/90 shadow-md cursor-pointer"
                    >
                      <Ticket className="h-4.5 w-4.5 sm:h-5 sm:w-5 shrink-0" />
                      <span>VIEW CONFIRMED PASS &amp; BRIEFING</span>
                    </button>
                  )
                ) : (
                  isHousefull ? (
                    <button 
                      disabled
                      className="ringer-button h-14 sm:h-14 md:h-16 flex-1 text-sm sm:text-sm font-black tracking-wide flex items-center justify-center gap-2.5 sm:gap-3 rounded-2xl sm:rounded-[20px] bg-red-500 text-white cursor-not-allowed shadow-none"
                    >
                      <Ticket className="h-4.5 w-4.5 sm:h-5 sm:w-5 shrink-0" />
                      <span>HOUSEFULL / SOLD OUT</span>
                    </button>
                  ) : event.is_paid ? (
                    <button 
                      onClick={() => handleRSVP()}
                      className={`ringer-button h-14 sm:h-14 md:h-16 flex-1 text-sm sm:text-sm font-black tracking-wide flex items-center justify-center gap-2.5 sm:gap-3 transition-all active:scale-95 rounded-2xl sm:rounded-[20px] text-white shadow-md hover:shadow-xl hover:scale-[1.02] cursor-pointer ${
                        isVibrant 
                          ? 'vibe-shimmer'
                          : 'bg-black text-white hover:bg-zinc-800'
                      }`}
                      style={isVibrant ? {
                        backgroundColor: getCategoryDarkTitleColor(event.category),
                        boxShadow: `0 8px 25px -4px ${getCategoryDarkTitleColor(event.category)}55`,
                      } : undefined}
                    >
                      <Ticket className="h-4.5 w-4.5 sm:h-5 sm:w-5 shrink-0" />
                      <span>RSVP &amp; REQUEST PASS</span>
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleRSVP()}
                      className={`ringer-button h-14 sm:h-14 md:h-16 flex-1 text-sm sm:text-sm font-black tracking-wide flex items-center justify-center gap-2.5 sm:gap-3 transition-all active:scale-95 rounded-2xl sm:rounded-[20px] text-white shadow-md hover:shadow-xl hover:scale-[1.02] cursor-pointer ${
                        isVibrant 
                          ? 'vibe-shimmer'
                          : 'bg-black text-white hover:bg-zinc-800'
                      }`}
                      style={isVibrant ? {
                        backgroundColor: getCategoryDarkTitleColor(event.category),
                        boxShadow: `0 8px 25px -4px ${getCategoryDarkTitleColor(event.category)}55`,
                      } : undefined}
                    >
                      <Ticket className="h-4.5 w-4.5 sm:h-5 sm:w-5 shrink-0" />
                      <span>RSVP FOR FREE ENTRY</span>
                    </button>
                  )
                )}
                
                <button 
                  onClick={handleDownloadICS}
                  title="Add to Calendar"
                  aria-label="Add to Calendar"
                  className="ringer-button h-14 sm:h-14 md:h-16 w-14 sm:w-auto sm:flex-1 text-sm sm:text-sm font-black tracking-wide flex items-center justify-center gap-2.5 sm:gap-3 border-2 active:scale-95 transition-all rounded-2xl sm:rounded-[20px] cursor-pointer bg-white hover:bg-zinc-50 text-zinc-900 shadow-sm border-black/15 shrink-0 px-0 sm:px-6"
                >
                  <CalendarPlus className="h-5 w-5 shrink-0 text-zinc-800" />
                  <span className="hidden sm:inline">ADD TO CALENDAR</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Torn Ticket Zig-Zag Perforation Divider */}
        <TicketPerforationDivider />

        {/* Right Side: Meta Info Box — Category Tinted Frosted Ticket Stub */}
        <div className={`w-full md:w-80 lg:w-88 p-4 sm:p-6 lg:p-7 space-y-3.5 sm:space-y-4 relative z-10 rounded-b-2xl md:rounded-b-none md:rounded-r-[24px] ticket-stub-secondary ${
          isVibrant
            ? `${getCategoryStubClass(event.category)} backdrop-blur-md`
            : 'bg-white/95 backdrop-blur-md border border-black/5'
        }`}>
          <div className="space-y-3 sm:space-y-3.5">
            {!isCancelled && !isEventEnded && rsvped && (
              rsvpStatus === 'pending' ? (
                <div className="p-3.5 rounded-xl bg-amber-50/90 border border-amber-200 space-y-1.5 shadow-xs">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-800">
                    <Clock className="h-3.5 w-3.5 text-amber-700" />
                    <span>{event.is_paid ? 'Payment Pending' : 'Approval Pending'}</span>
                  </div>
                  <p className="text-xs text-amber-950 font-bold leading-snug">
                    {event.is_paid ? 'Pass pending payment with organizer.' : 'RSVP recorded! Pass pending organizer approval.'}
                  </p>
                  <button
                    onClick={() => setShowBriefingModal(true)}
                    className="text-xs font-black uppercase tracking-wider text-black underline underline-offset-4 hover:text-amber-800 transition-colors block pt-0.5 cursor-pointer"
                  >
                    {event.is_paid ? 'Contact Organizer & View Guide →' : 'View Event Briefing & Guide →'}
                  </button>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 space-y-2 shadow-xs">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                    <span>Pass Confirmed!</span>
                  </div>
                  <p className="text-xs text-zinc-900 font-bold leading-snug">
                    {passCode ? `Pass #${passCode} is active.` : "Your spot is locked in."} Access schedule &amp; venue details anytime.
                  </p>
                  <button
                    onClick={() => setShowBriefingModal(true)}
                    className="text-xs font-black uppercase tracking-wider text-black underline underline-offset-4 hover:text-primary transition-colors block pt-0.5 cursor-pointer"
                  >
                    Open Confirmed Pass →
                  </button>

                  <button
                    onClick={handleGetTelegramPass}
                    className="w-full mt-1.5 py-2 px-3 bg-[#229ED9] hover:bg-[#1d8dc3] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#229ED9]/20 active:scale-95"
                  >
                    <Send className="h-3.5 w-3.5 fill-white" />
                    <span>Get Pass on Telegram</span>
                  </button>
                </div>
              )
            )}

            {/* Official Attendee Telegram Group (RSVP'd Card) */}
            {!isCancelled && !isEventEnded && rsvped && event.whatsapp_group_link && (
              <div className="p-3.5 rounded-xl bg-sky-50/90 border border-sky-200 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#229ED9]">
                    <Send className="h-3 w-3 fill-[#229ED9]" />
                    <span>Attendee Telegram Group</span>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-200/70 text-sky-950">
                    Active
                  </span>
                </div>
                <p className="text-xs text-sky-950 font-bold leading-snug">
                  Connect and chat with the organizer and fellow attendees!
                </p>
                <a
                  href={formatTelegramLink(event.whatsapp_group_link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 bg-[#229ED9] hover:bg-[#1d8dc3] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#229ED9]/20 active:scale-95"
                >
                  <Send className="h-3.5 w-3.5 fill-white" />
                  <span>Join Official Telegram Group</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {(() => {
              const timeInfo = formatEventTimeWithTimezone(event.date_time, event.end_time, event.timezone || 'Asia/Kolkata');
              return (
                <div className="bg-zinc-50/60 p-3.5 sm:p-4 rounded-xl border border-black/[0.08] hover:border-black/15 hover:bg-zinc-50/90 transition-all flex flex-col gap-2.5">
                   <div className="flex items-center justify-between gap-2">
                     <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Date &amp; Time</div>
                     {event.timings && (
                       <span className="text-[9px] font-black uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                         {event.timings}
                       </span>
                     )}
                   </div>
                   <div className="flex items-center gap-3">
                     <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                       <Calendar className="h-5 w-5 sm:h-6 sm:w-6" />
                     </div>
                     <div className="flex-1 min-w-0">
                       <div className="text-sm sm:text-base font-black text-zinc-950 tracking-tight leading-snug">
                         {new Date(event.date_time).toLocaleDateString(undefined, {
                           weekday: 'short',
                           month: 'short',
                           day: 'numeric',
                           year: new Date(event.date_time).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
                           timeZone: event.timezone || 'Asia/Kolkata'
                         })}
                         {event.end_time && new Date(event.date_time).toDateString() !== new Date(event.end_time).toDateString() && (
                           <span className="text-zinc-600 font-bold ml-1">
                             – {new Date(event.end_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: event.timezone || 'Asia/Kolkata' })}
                           </span>
                         )}
                       </div>
                       <div className="flex items-center gap-1.5 flex-wrap mt-1 text-xs sm:text-[13px] font-semibold text-zinc-700">
                         <div className="flex items-center gap-1 text-zinc-900 font-bold">
                           <Clock className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                           <span>{timeInfo.timeRangeDisplay}</span>
                         </div>
                         <span className="text-[9.5px] font-black uppercase text-zinc-700 bg-zinc-100 border border-zinc-200/80 px-1.5 py-0.5 rounded-md tracking-wider">
                           {timeInfo.tzAbbr}
                         </span>
                       </div>
                     </div>
                   </div>
                   {timeInfo.localTimeNote && (
                     <div className="text-[10px] sm:text-[11px] font-bold text-sky-950 bg-sky-50/90 border border-sky-200 px-2.5 py-1 rounded-lg w-full flex items-center gap-1.5">
                       <Globe className="h-3.5 w-3.5 text-sky-600 shrink-0" />
                       <span>{timeInfo.localTimeNote}</span>
                     </div>
                   )}
                </div>
              );
            })()}

            <div className="bg-zinc-50/60 p-3.5 sm:p-4 rounded-xl border border-black/[0.08] hover:border-black/15 hover:bg-zinc-50/90 transition-all flex flex-col gap-2.5">
               <div className="flex items-center justify-between gap-2">
                 <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                   {event.event_type === 'online' ? 'Event Mode & Platform' : 'Location'}
                 </div>
                 {event.event_type !== 'online' && (
                   <a
                     href={event.google_maps_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.location}, ${event.city || ''}`)}`}
                     target="_blank"
                     rel="noopener noreferrer"
                     className="text-[10px] sm:text-xs font-black text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 border border-primary/20 px-2 py-0.5 rounded-lg transition-all flex items-center gap-1 shrink-0"
                   >
                     <span>Open in Maps</span>
                     <span className="text-[11px]">↗</span>
                   </a>
                 )}
               </div>
               <div className="flex items-center gap-3">
                 <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                   {event.event_type === 'online' ? (
                     <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-sky-600" />
                   ) : (
                     <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                   )}
                 </div>
                 <div className="flex-1 min-w-0">
                   {event.event_type === 'online' ? (
                     <>
                       <div className="text-sm sm:text-base font-black text-zinc-950 tracking-tight leading-snug">
                         Online / Virtual Event
                       </div>
                       <span className="text-xs font-semibold text-zinc-600 mt-0.5 block">
                         {event.location && event.location !== 'Online Event' && event.location !== 'Online'
                           ? `Platform: ${event.location}`
                           : 'Virtual access details available in Attendee Pass.'}
                       </span>
                     </>
                   ) : (
                     <>
                       <div className="text-sm sm:text-base font-black text-zinc-950 tracking-tight leading-snug break-words">
                         {event.location}
                       </div>
                       {event.city && !event.location?.toLowerCase().includes(event.city.toLowerCase()) && (
                         <span className="text-xs font-bold text-zinc-500 mt-0.5 block">
                           {event.city}
                         </span>
                       )}
                     </>
                   )}
                 </div>
               </div>
            </div>

            {/* Compact Responsive Meta Stats Grid */}
            <div className={`grid ${event.participant_limit ? 'grid-cols-2' : 'grid-cols-1'} gap-2 sm:gap-2.5`}>
              {/* Age Criteria & Suitability Block */}
              <div className="bg-zinc-50/60 p-2.5 sm:p-3 rounded-xl border border-black/[0.08] hover:border-black/15 hover:bg-zinc-50/90 transition-all flex flex-col justify-between">
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Age Policy</div>
                <div className="flex items-center gap-2 text-zinc-950 font-black text-xs sm:text-sm mt-1.5">
                  <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-3.5 w-3.5" />
                  </div>
                  <span className="leading-tight truncate">
                    {event.min_age !== null && event.min_age !== undefined && Number(event.min_age) > 0
                      ? `${event.min_age}+ Only`
                      : (['Techno', 'Nightlife', 'Clubbing'].includes(event.category) ? "21+ Only" : "All Ages")}
                  </span>
                </div>
                {event.suitable_age && (
                  <span className="text-[10px] font-semibold text-zinc-500 block truncate mt-1">
                    {event.suitable_age}
                  </span>
                )}
              </div>

              {/* Event Capacity (if configured) */}
              {event.participant_limit && (
                <div className="bg-zinc-50/60 p-2.5 sm:p-3 rounded-xl border border-black/[0.08] hover:border-black/15 hover:bg-zinc-50/90 transition-all flex flex-col justify-between">
                  <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Capacity</div>
                  <div className="flex items-center gap-2 text-zinc-950 font-black text-xs sm:text-sm mt-1.5">
                    <div className="h-6 w-6 rounded-md bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                      <Ticket className="h-3.5 w-3.5" />
                    </div>
                    <span className="leading-tight truncate">{event.participant_limit} spots</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Evident 'Join Telegram Group' Action Button (Only visible if Telegram link is configured) */}
          {event.whatsapp_group_link && (
            <div className="pt-3 sm:pt-4 border-t border-black/10 flex flex-col gap-1.5">
               <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Community Group</div>
               <button
                 onClick={() => {
                   if (!rsvped) {
                     toast.info("Please RSVP to this event first to join the official attendee Telegram group!");
                     return;
                   }
                   window.open(formatTelegramLink(event.whatsapp_group_link!), '_blank');
                 }}
                 className="w-full py-2.5 sm:py-3 px-3.5 bg-[#229ED9] hover:bg-[#1d8dc3] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#229ED9]/25 active:scale-95 cursor-pointer"
               >
                 <Send className="h-3.5 w-3.5 fill-white" />
                 <span>Join Telegram Group</span>
                 <ExternalLink className="h-3.5 w-3.5" />
               </button>
            </div>
          )}

          <div className="pt-3 sm:pt-4 border-t border-black/10 flex items-center justify-between">
             <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Share This Vibe</div>
             <div className="flex gap-2">
                <button 
                  onClick={handleCopyLink} 
                  title="Copy Link"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-black/10 flex items-center justify-center hover:bg-white hover:border-black transition-all bg-white shadow-xs cursor-pointer"
                >
                  <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-black" />
                </button>
                <button 
                  onClick={handleShare} 
                  title="System Share"
                  className="h-8 w-8 sm:h-9 sm:w-9 rounded-full border border-black/10 flex items-center justify-center hover:bg-white hover:border-black transition-all bg-white shadow-xs cursor-pointer"
                >
                  <Share2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-black" />
                </button>
             </div>
          </div>
        </div>
      </div>

      <OrganizerDetailsModal
        isOpen={showOrganizerModal}
        onClose={() => setShowOrganizerModal(false)}
        event={event}
        userEmail={session?.user?.email || null}
        userImage={session?.user?.image || null}
      />

      <AttendeeBriefingModal
        isOpen={showBriefingModal}
        onClose={() => setShowBriefingModal(false)}
        event={event}
        rsvpStatus={rsvpStatus || (event?.is_paid ? 'pending' : 'confirmed')}
        passCode={passCode || undefined}
        isPreRsvp={!rsvped}
        onRSVP={() => handleRSVP()}
        onDownloadICS={handleDownloadICS}
        onShare={handleShare}
      />

      {/* Post-RSVP Telegram Group Prompt Modal */}
      {event?.whatsapp_group_link && (
        <JoinTelegramPromptModal
          isOpen={showTelegramPromptModal}
          onClose={() => {
            setShowTelegramPromptModal(false);
            setShowBriefingModal(true);
          }}
          eventTitle={event.title}
          telegramGroupLink={event.whatsapp_group_link}
        />
      )}

      {/* Age Verification Declaration Modal */}
      {showAgeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-black/10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-black/5">
              <div className="flex items-center gap-2 text-red-600 font-black text-xs uppercase tracking-wider">
                <span className="text-xl">🔞</span>
                <span>Mandatory Age Requirement</span>
              </div>
              <button
                onClick={() => setShowAgeModal(false)}
                className="h-8 w-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-500 font-black transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-red-50 border border-red-200/80 space-y-1">
                <div className="text-sm font-black text-red-900 uppercase">
                  Strictly {requiredMinAge}+ Only
                </div>
                <p className="text-xs text-red-800 font-medium leading-relaxed">
                  This experience is restricted to attendees aged <strong>{requiredMinAge} years or older</strong>. 
                  A mandatory Government Photo ID verification will be conducted at the venue entrance.
                </p>
              </div>

              <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-zinc-50 border border-black/10 cursor-pointer hover:bg-zinc-100/80 transition-colors">
                <input
                  type="checkbox"
                  checked={ageDeclared}
                  onChange={e => setAgeDeclared(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                />
                <span className="text-xs font-bold text-zinc-800 leading-snug">
                  I confirm that I am at least <strong>{requiredMinAge} years of age</strong> and will present valid government photo ID at the entrance.
                </span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAgeModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-black/10 text-xs font-black uppercase tracking-wider text-zinc-500 hover:bg-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!ageDeclared}
                onClick={() => {
                  setShowAgeModal(false);
                  handleRSVP(true, true);
                }}
                className={cn(
                  "flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-white transition-all shadow-md",
                  ageDeclared
                    ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 cursor-pointer"
                    : "bg-zinc-300 text-zinc-500 cursor-not-allowed shadow-none"
                )}
              >
                Confirm &amp; RSVP
              </button>
            </div>
          </div>
        </div>
      )}

      <EventRatingModal
        isOpen={showRatingModal}
        onClose={() => setShowRatingModal(false)}
        eventId={eventId}
        eventTitle={event.title}
        eventDate={event.date_time}
        eventLocation={event.venue || event.location}
        organizerEmail={event.organizer_email}
        organizerName={event.organizer_name}
        organizerImage={event.organizer_image}
        organizerRating={event.organizer_rating}
        userEmail={session?.user?.email || null}
        onSuccess={(result) => {
          if (result) {
            setHasRated(true);
            setUserRating({
              event_rating: result.event_rating,
              organizer_rating: result.organizer_rating
            });
            setEvent((prev: any) => ({
              ...prev,
              average_rating: result.event_average_rating ?? prev.average_rating,
              ratings_count: result.event_ratings_count ?? prev.ratings_count,
              organizer_rating: result.organizer_average_rating ?? prev.organizer_rating,
            }));
          }
        }}
      />

    </div>
    </>
  );
}
