"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PhoneVerificationModal } from "@/components/PhoneVerificationModal";
import { CategoryDecorations, getCategoryCardClass, getCategoryAccentColor } from "@/components/CategoryDecorations";
import { useTheme } from "@/context/ThemeContext";
import { ArrowLeft, Calendar, MapPin, CheckCircle2, CalendarPlus, Share2, Link2, MessageCircle, Users, Star, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useSwipeToClose } from "@/hooks/useSwipeToClose";

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rsvped, setRsvped] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'ios' | 'android'>('desktop');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showOrganizerModal, setShowOrganizerModal] = useState(false);
  const [userHasPhone, setUserHasPhone] = useState(false);
  const { isVibrant } = useTheme();

  const swipeRef = useSwipeToClose(() => setShowOrganizerModal(false));

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      signIn("google", { callbackUrl: window.location.href });
      return;
    }
    if (!params.id) return;
    
    if (session?.user?.email) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/user?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(res => {
          if (res.success && res.data.phone_number) {
            setUserHasPhone(true);
          }
        });
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/events/${params.id}`)
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          setEvent(res.data);
          if (session?.user?.email) {
            const baseUrlInner = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
            fetch(`${baseUrlInner}/api/events/${params.id}/rsvp/check?email=${encodeURIComponent(session.user.email)}`)
              .then(r => r.json())
              .then(d => {
                if (d.success && d.rsvped) {
                  setRsvped(true);
                }
              })
              .finally(() => setLoading(false));
          } else {
            setLoading(false);
          }
        } else {
          router.push("/dashboard");
        }
      })
      .catch(err => {
        console.error(err);
        router.push("/dashboard");
      });

    if (typeof window !== "undefined") {
      const ua = navigator.userAgent;
      if (/iPhone|iPad|iPod/i.test(ua)) setDevice('ios');
      else if (/Android/i.test(ua)) setDevice('android');
      else setDevice('desktop');
    }
  }, [params.id, router, session, status]);

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

  const handleRSVP = async () => {
    if (!session?.user?.email) {
      signIn("google");
      return;
    }
    if (!userHasPhone) {
      setShowPhoneModal(true);
      return;
    }
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/events/${params.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: session.user.email })
      });
      const data = await res.json();
      if (data.success) {
        setRsvped(true);
        // Refresh event data to update rsvp_count
        const refreshedEventRes = await fetch(`${baseUrl}/api/events/${params.id}`);
        const refreshedEvent = await refreshedEventRes.json();
        if (refreshedEvent.success) {
          setEvent(refreshedEvent.data);
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

  const handleWhatsappShare = () => {
    if (!event) return;
    const text = `Check out this vibe: ${event.title}\n\n${window.location.href}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto p-12 space-y-8">
      <div className="h-8 w-48 bg-zinc-100 animate-pulse rounded-full" />
      <div className="h-96 w-full bg-zinc-100 animate-pulse rounded-[40px]" />
    </div>
  );

  if (!event) return null;

  const isHousefull = event.status === 'housefull' || (event.participant_limit && (event.rsvp_count || 0) >= event.participant_limit);
  const isFillingFast = event.status === 'filling_fast';

  return (
    <>
      {session?.user?.email && (
        <PhoneVerificationModal
          isOpen={showPhoneModal}
          onClose={() => setShowPhoneModal(false)}
          onVerified={() => {
            setUserHasPhone(true);
            setShowPhoneModal(false);
            handleRSVP();
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
              <div className="sticker-badge bg-zinc-100 border-none text-zinc-400">Verified Vibe</div>
              <div className="sticker-badge bg-zinc-100 border-none text-zinc-500 font-bold">
                {event.is_paid ? "Paid Event" : "Free Entry"}
              </div>
              {event.status === 'housefull' && (
                <div className="sticker-badge bg-red-500 border-none text-white font-black animate-pulse">Sold Out</div>
              )}
              {event.status === 'filling_fast' && (
                <div className="sticker-badge bg-orange-500 border-none text-white font-black animate-pulse flex items-center gap-1"><Sparkles className="h-4 w-4" /> Filling Fast</div>
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
            <button 
              onClick={handleRSVP}
              disabled={rsvped || isHousefull}
              className={`ringer-button h-16 flex-1 text-sm font-black flex items-center justify-center gap-3 transition-all active:scale-95 rounded-[20px] ${
                isHousefull
                ? 'bg-red-500 text-white cursor-not-allowed hover:bg-red-600'
                : rsvped 
                  ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
                  : isVibrant 
                    ? 'bg-black text-white hover:bg-zinc-800 vibe-shimmer'
                    : 'bg-black text-white hover:bg-zinc-800'
              }`}
            >
              {rsvped ? <CheckCircle2 className="h-5 w-5" /> : null}
              {isHousefull ? "HOUSEFULL" : rsvped ? "ALREADY IN" : "RSVP TO EVENT"}
            </button>
            
            <button 
              onClick={handleDownloadICS}
              className="ringer-button h-16 flex-1 text-sm font-black flex items-center justify-center gap-3 border-2 border-black/5 hover:bg-black/5 active:scale-95 transition-transform rounded-[20px]"
            >
              <CalendarPlus className="h-5 w-5" />
              ADD TO CALENDAR
            </button>
          </div>
        </div>

        {/* Right Side: Meta Info Box */}
        <div className="w-full md:w-80 bg-zinc-50 border-t md:border-t-0 md:border-l border-black/5 p-6 sm:p-12 space-y-8 sm:space-y-12">
           <div className="space-y-6">
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

           <div className="pt-6 sm:pt-8 border-t border-black/5 flex flex-col gap-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Share This Vibe</div>
              <div className="flex gap-2">
                 <button 
                   onClick={handleCopyLink} 
                   title="Copy Link"
                   className="h-10 w-10 rounded-full border border-black/10 flex items-center justify-center hover:bg-white hover:border-black transition-all bg-zinc-50"
                 >
                   <Link2 className="h-4 w-4 text-black" />
                 </button>
                 <button 
                   onClick={handleShare} 
                   title="System Share"
                   className="h-10 w-10 rounded-full border border-black/10 flex items-center justify-center hover:bg-white hover:border-black transition-all bg-zinc-50"
                 >
                   <Share2 className="h-4 w-4 text-black" />
                 </button>
                 <button 
                   onClick={handleWhatsappShare} 
                   title="Share on WhatsApp"
                   className="h-10 w-10 rounded-full border border-black/10 flex items-center justify-center hover:bg-white hover:border-black transition-all bg-zinc-50"
                 >
                   <MessageCircle className="h-4 w-4 text-black" />
                 </button>
              </div>
           </div>
         </div>
      </div>

      <Dialog open={showOrganizerModal} onOpenChange={setShowOrganizerModal}>
        <DialogContent ref={swipeRef} className="sm:max-w-md rounded-[32px] p-8 border-none shadow-2xl max-h-[90vh] overflow-y-auto">
          <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-4 md:hidden" />
          <DialogHeader>
            <DialogTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 text-center">Organizer Details</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-6 pt-2">
            {event.organizer_image ? (
              <img 
                src={event.organizer_image} 
                alt={event.organizer_name} 
                className="w-24 h-24 rounded-full object-cover border-4 border-zinc-100"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-zinc-100 flex items-center justify-center border-4 border-white shadow-sm">
                <Users className="h-10 w-10 text-zinc-400" />
              </div>
            )}
            
            <div className="text-center space-y-3 w-full">
              <h3 className="text-3xl font-black tracking-tight">{event.organizer_name || "VibeCheck Organizer"}</h3>
              
              <div className="flex items-center justify-center gap-3 text-xs font-bold text-zinc-600">
                {event.organizer_rating && (
                  <div className="flex items-center gap-1.5 bg-yellow-100/50 text-yellow-700 px-3 py-1 rounded-full border border-yellow-200/50">
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                    <span>{event.organizer_rating} Rating</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5 bg-zinc-100 px-3 py-1 rounded-full border border-black/5">
                  <Users className="h-3.5 w-3.5" />
                  <span>{event.organizer_followers_count || 0} Followers</span>
                </div>
              </div>
            </div>
            
            {event.organizer_description && (
              <div className="w-full bg-zinc-50 border border-black/5 rounded-[20px] p-5">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-2">About Organizer</div>
                <p className="text-sm font-medium text-zinc-600 leading-relaxed text-left">
                  {event.organizer_description}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
    </>
  );
}
