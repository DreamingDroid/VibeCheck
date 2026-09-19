"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PhoneVerificationModal } from "@/components/PhoneVerificationModal";
import { AttendeeBriefingModal } from "@/components/AttendeeBriefingModal";
import { OrganizerDetailsModal } from "@/components/OrganizerDetailsModal";
import { EventRatingModal } from "@/components/EventRatingModal";
import { JoinTelegramPromptModal } from "@/components/JoinTelegramPromptModal";
import { formatTelegramLink } from "@/lib/telegramGroup";
import { CategoryDecorations, getCategoryCardClass, getCategoryAccentColor } from "@/components/CategoryDecorations";
import { useTheme } from "@/context/ThemeContext";
import { ArrowLeft, Calendar, MapPin, CheckCircle2, CalendarPlus, Share2, Link2, Users, Star, Sparkles, Ticket, Clock, AlertCircle, ExternalLink, Send } from "lucide-react";
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
  const [hasRated, setHasRated] = useState(false);
  const [userRating, setUserRating] = useState<any>(null);
  const [userHasPhone, setUserHasPhone] = useState(false);
  const { isVibrant } = useTheme();

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

  const handleRSVP = async (skipPhoneCheck: boolean = false) => {
    if (!session?.user?.email) {
      signIn("google", { callbackUrl: window.location.href });
      return;
    }
    if (!skipPhoneCheck && !userHasPhone) {
      setShowPhoneModal(true);
      return;
    }
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email })
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
          toast.success("RSVP registered! Pass pending organizer confirmation.");
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
    const shareData = {
      title: event.title,
      text: event.description,
      url: window.location.href,
    };
    
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success("Vibe shared successfully!");
      } catch (err) {
        // user cancelled or error
      }
    } else {
      handleCopyLink();
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Vibe link copied to clipboard!");
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
      if (data.success && data.deep_link) {
        window.open(data.deep_link, '_blank');
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

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-12 space-y-6 sm:space-y-8 animate-in fade-in duration-700">
      <Link href="/dashboard" className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back to Explore
      </Link>
      
      <div className={`ringer-card p-0 overflow-hidden shadow-2xl flex flex-col md:flex-row relative ${isVibrant ? getCategoryCardClass(event.category) : ''}`}>
        {isVibrant && <CategoryDecorations category={event.category} />}
        {/* Left Side: Editorial Content */}
        <div className="flex-1 p-6 sm:p-12 space-y-8 sm:space-y-10 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div 
                className={`sticker-badge text-white border-none ${isVibrant ? '' : 'bg-primary'}`}
                style={isVibrant ? { backgroundColor: getCategoryAccentColor(event.category) } : {}}
              >
                {event.category}
              </div>
              {event.visibility === 'invite_only' && (
                <div className="sticker-badge bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-none font-black shadow-md flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 fill-black text-black" /> VIP Invite-Only
                </div>
              )}
              <div className="sticker-badge bg-zinc-100 border-none text-zinc-400">Verified Vibe</div>
              <div className="sticker-badge bg-zinc-100 border-none text-zinc-500 font-bold">
                {event.is_paid ? "Paid Event" : "Free Entry"}
              </div>
              {event.average_rating ? (
                <div className="sticker-badge bg-amber-100/90 text-amber-900 border-amber-300 font-black flex items-center gap-1.5 shadow-xs">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                  <span>{Number(event.average_rating).toFixed(1)}</span>
                  <span className="text-[10px] text-amber-800/80 font-bold">({event.ratings_count || 0})</span>
                </div>
              ) : null}
              {event.status === 'housefull' && (
                <div className="sticker-badge bg-red-500 border-none text-white font-black animate-pulse">Sold Out</div>
              )}
              {event.status === 'filling_fast' && (
                <div className="sticker-badge bg-orange-500 border-none text-white font-black animate-pulse flex items-center gap-1"><Sparkles className="h-4 w-4" /> Filling Fast</div>
              )}
              {isEventEnded && (
                <div className="sticker-badge bg-zinc-800 border-none text-white font-bold">Event Ended</div>
              )}
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-black leading-[0.9] uppercase italic">
              {event.title}
            </h1>
            <div className="flex items-center gap-2 pt-2">
              <span className="text-sm font-bold text-zinc-500">Organized by:</span>
              <button 
                onClick={() => setShowOrganizerModal(true)}
                className="text-sm font-black text-black underline underline-offset-4 decoration-black/20 hover:text-primary hover:decoration-primary active:text-primary active:decoration-primary transition-colors cursor-pointer"
              >
                {event.organizer_name || "VibeCheck Organizer"}
              </button>
            </div>
          </div>
          
          <div className="prose prose-zinc max-w-none text-zinc-500 text-lg font-bold leading-relaxed">
            {event.description}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            {isEventEnded ? (
              // ENDED EVENT STATE: Only Rating button or "Already Rated" confirmation stays
              hasRated ? (
                <div className="w-full p-4 sm:p-5 rounded-[20px] bg-emerald-500/10 border-2 border-emerald-500/30 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-emerald-950 uppercase tracking-wide">
                        You've Rated This Vibe &amp; Host
                      </div>
                      <div className="text-xs font-bold text-emerald-700">
                        Thank you for your feedback! This event is completed.
                      </div>
                    </div>
                  </div>
                  {userRating?.event_rating && (
                    <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-100 font-black text-emerald-900 text-sm shadow-xs">
                      <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
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
                  className="ringer-button h-16 w-full text-base font-black flex items-center justify-center gap-3 transition-all active:scale-95 rounded-[20px] bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black shadow-lg shadow-amber-500/25 cursor-pointer uppercase tracking-wider"
                >
                  <Star className="h-5 w-5 fill-black text-black" />
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
                      className="ringer-button h-16 flex-1 text-sm font-black flex items-center justify-center gap-3 transition-all active:scale-95 rounded-[20px] bg-amber-500 text-black hover:bg-amber-400 shadow-md cursor-pointer"
                    >
                      <Clock className="h-5 w-5" />
                      PAYMENT PENDING • VIEW BRIEFING
                    </button>
                  ) : (
                    <button 
                      onClick={() => setShowBriefingModal(true)}
                      className="ringer-button h-16 flex-1 text-sm font-black flex items-center justify-center gap-3 transition-all active:scale-95 rounded-[20px] bg-primary text-black hover:bg-primary/90 shadow-md cursor-pointer"
                    >
                      <Ticket className="h-5 w-5" />
                      VIEW CONFIRMED PASS &amp; BRIEFING
                    </button>
                  )
                ) : (
                  isHousefull ? (
                    <button 
                      disabled
                      className="ringer-button h-16 flex-1 text-sm font-black flex items-center justify-center gap-3 rounded-[20px] bg-red-500 text-white cursor-not-allowed shadow-none"
                    >
                      HOUSEFULL / SOLD OUT
                    </button>
                  ) : event.is_paid ? (
                    <button 
                      onClick={() => handleRSVP()}
                      className={`ringer-button h-16 flex-1 text-sm font-black flex items-center justify-center gap-3 transition-all active:scale-95 rounded-[20px] ${
                        isVibrant 
                          ? 'bg-black text-white hover:bg-zinc-800 vibe-shimmer cursor-pointer'
                          : 'bg-black text-white hover:bg-zinc-800 cursor-pointer'
                      }`}
                    >
                      RSVP &amp; REQUEST PASS
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleRSVP()}
                      className={`ringer-button h-16 flex-1 text-sm font-black flex items-center justify-center gap-3 transition-all active:scale-95 rounded-[20px] ${
                        isVibrant 
                          ? 'bg-black text-white hover:bg-zinc-800 vibe-shimmer cursor-pointer'
                          : 'bg-black text-white hover:bg-zinc-800 cursor-pointer'
                      }`}
                    >
                      RSVP FOR FREE ENTRY
                    </button>
                  )
                )}
                
                <button 
                  onClick={handleDownloadICS}
                  className="ringer-button h-16 flex-1 text-sm font-black flex items-center justify-center gap-3 border-2 border-black/5 hover:bg-black/5 active:scale-95 transition-transform rounded-[20px] cursor-pointer"
                >
                  <CalendarPlus className="h-5 w-5" />
                  ADD TO CALENDAR
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Meta Info Box */}
        <div className="w-full md:w-80 bg-zinc-50 border-t md:border-t-0 md:border-l border-black/5 p-6 sm:p-12 space-y-8 sm:space-y-12">
           <div className="space-y-6">
              {rsvped && (
                rsvpStatus === 'pending' ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-700">
                      <Clock className="h-4 w-4" />
                      <span>Registration Received</span>
                    </div>
                    <p className="text-xs text-amber-900/80 font-bold leading-snug">
                      Pass pending payment with organizer.
                    </p>
                    <button
                      onClick={() => setShowBriefingModal(true)}
                      className="text-xs font-black uppercase tracking-wider text-black underline underline-offset-4 hover:text-amber-700 transition-colors block pt-1 cursor-pointer"
                    >
                      Contact Organizer &amp; View Guide →
                    </button>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Pass Confirmed!</span>
                    </div>
                    <p className="text-xs text-zinc-600 font-bold leading-snug">
                      {passCode ? `Pass #${passCode} is active.` : "Your spot is locked in."} Access schedule &amp; venue details anytime.
                    </p>
                    <button
                      onClick={() => setShowBriefingModal(true)}
                      className="text-xs font-black uppercase tracking-wider text-black underline underline-offset-4 hover:text-primary transition-colors block pt-1 cursor-pointer"
                    >
                      Open Confirmed Pass →
                    </button>

                    <button
                      onClick={handleGetTelegramPass}
                      className="w-full mt-2 py-2.5 px-4 bg-[#229ED9] hover:bg-[#1d8dc3] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#229ED9]/20 active:scale-95"
                    >
                      <Send className="h-3.5 w-3.5 fill-white" />
                      <span>Get Pass on Telegram</span>
                    </button>
                  </div>
                )
              )}

              {/* Official Attendee Telegram Group (RSVP'd Card) */}
              {rsvped && event.whatsapp_group_link && (
                <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-[#229ED9]">
                      <Send className="h-3 w-3 fill-[#229ED9]" />
                      <span>Attendee Telegram Group</span>
                    </div>
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-200/60 text-sky-900">
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
                    className="w-full py-2.5 px-4 bg-[#229ED9] hover:bg-[#1d8dc3] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#229ED9]/20 active:scale-95"
                  >
                    <Send className="h-3.5 w-3.5 fill-white" />
                    <span>Join Official Telegram Group</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                </div>
              )}

              <div className="space-y-1">
                 <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Date & Time</div>
                 <div className="flex items-center gap-2 text-black font-black">
                   <Calendar className="h-4 w-4 text-primary" />
                   {new Date(event.date_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}
                   {event.end_time && new Date(event.date_time).toDateString() !== new Date(event.end_time).toDateString() && (
                     <span className="text-zinc-300 ml-1"> - {new Date(event.end_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric'})}</span>
                   )}
                 </div>
                 <div className="text-sm font-bold text-zinc-500">
                    {new Date(event.date_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit'})}
                    {event.end_time && (
                      <span className="text-zinc-400"> → {new Date(event.end_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit'})}</span>
                    )}
                    {event.timings && <span className="block mt-1 text-primary italic uppercase text-[9px] tracking-widest">{event.timings}</span>}
                 </div>
              </div>

              <div className="space-y-1">
                 <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Location</div>
                 <div className="flex items-center gap-2 text-black font-black">
                   <MapPin className="h-4 w-4 text-primary" />
                   {event.location}
                 </div>
                 <a
                   href={event.google_maps_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.location}, ${event.city || ''}`)}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="text-xs font-bold text-zinc-400 underline hover:text-black block w-fit"
                 >
                   Open in Maps
                 </a>
              </div>

              <div className="space-y-1">
                 <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">People Interested</div>
                 <div className="flex items-center gap-2 text-black font-black">
                   <Users className="h-4 w-4 text-primary" />
                   {event.rsvp_count || 0} {event.rsvp_count === 1 ? 'Vibe Seeker' : 'Vibe Seekers'}
                 </div>
              </div>

              {event.participant_limit && (
                <div className="space-y-1">
                   <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Event Capacity</div>
                   <div className="flex items-center gap-2 text-black font-black">
                     <Users className="h-4 w-4 text-primary" />
                     {event.participant_limit} spots
                   </div>
                </div>
              )}
           </div>

           {/* Evident 'Join Telegram Group' Action Button (Only visible if Telegram link is configured) */}
           {event.whatsapp_group_link && (
             <div className="pt-6 sm:pt-8 border-t border-black/5 flex flex-col gap-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Community Group</div>
                <button
                  onClick={() => {
                    if (!rsvped) {
                      toast.info("Please RSVP to this event first to join the official attendee Telegram group!");
                      return;
                    }
                    window.open(formatTelegramLink(event.whatsapp_group_link!), '_blank');
                  }}
                  className="w-full py-3.5 px-4 bg-[#229ED9] hover:bg-[#1d8dc3] text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#229ED9]/25 active:scale-95 cursor-pointer"
                >
                  <Send className="h-4 w-4 fill-white" />
                  <span>Join Telegram Group</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
             </div>
           )}

           <div className="pt-6 sm:pt-8 border-t border-black/5 flex flex-col gap-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Share This Vibe</div>
              <div className="flex gap-2">
                 <button 
                   onClick={handleCopyLink} 
                   title="Copy Link"
                   className="h-10 w-10 rounded-full border border-black/10 flex items-center justify-center hover:bg-white hover:border-black transition-all bg-zinc-50 cursor-pointer"
                 >
                   <Link2 className="h-4 w-4 text-black" />
                 </button>
                 <button 
                   onClick={handleShare} 
                   title="System Share"
                   className="h-10 w-10 rounded-full border border-black/10 flex items-center justify-center hover:bg-white hover:border-black transition-all bg-zinc-50 cursor-pointer"
                 >
                   <Share2 className="h-4 w-4 text-black" />
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
