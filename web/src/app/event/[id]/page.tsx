"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PhoneVerificationModal } from "@/components/PhoneVerificationModal";
import { CategoryDecorations, getCategoryCardClass, getCategoryAccentColor } from "@/components/CategoryDecorations";
import { useTheme } from "@/context/ThemeContext";
import { ArrowLeft, Calendar, MapPin, CheckCircle2, CalendarPlus, Share2, Link2, MessageCircle, Users, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [rsvped, setRsvped] = useState(false);
  const [device, setDevice] = useState<'desktop' | 'ios' | 'android'>('desktop');
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [userHasPhone, setUserHasPhone] = useState(false);
  const { isVibrant } = useTheme();

  const [isFollowing, setIsFollowing] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      signIn("google", { callbackUrl: window.location.href });
      return;
    }
    if (!params.id) return;
    
    // Log trackable share click if ref parameter is present
    const searchParams = new URLSearchParams(window.location.search);
    const ref = searchParams.get('ref');
    if (ref && session?.user?.email) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/events/${params.id}/track-share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referrerEmail: ref, clickedByEmail: session.user.email })
      }).catch(e => console.error("Error tracking share click:", e));
    }

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

  useEffect(() => {
    if (!session?.user?.email || !event?.organizer_email) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/followers/user/${session.user.email}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setIsFollowing(res.data.includes(event.organizer_email));
        }
      });
    fetch(`${baseUrl}/api/blocks/user/${session.user.email}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          if (res.data.includes(event.organizer_email)) {
            setIsBlocked(true);
            router.push("/dashboard");
          }
        }
      });
  }, [session, event, router]);

  const toggleFollow = async () => {
    if (!session?.user?.email || !event?.organizer_email) return;
    const method = isFollowing ? "DELETE" : "POST";
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/followers`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: session.user.email, organizerEmail: event.organizer_email })
      });
      const data = await res.json();
      if (data.success) {
        setIsFollowing(!isFollowing);
        toast.success(isFollowing ? "Unfollowed host" : "Following host!");
      }
    } catch (err) {
      console.error("Follow error:", err);
    }
  };

  const toggleBlock = async () => {
    if (!session?.user?.email || !event?.organizer_email) return;
    const confirmed = window.confirm("Are you sure you want to block this host? You will no longer receive alerts or see feeds generated by them.");
    if (!confirmed) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: session.user.email, organizerEmail: event.organizer_email })
      });
      const data = await res.json();
      if (data.success) {
        setIsBlocked(true);
        setIsFollowing(false);
        toast.success("Host blocked. Redirecting...");
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Block error:", err);
    }
  };

  const handleShare = async () => {
    if (!event) return;
    const shareLink = `${window.location.origin}/event/${event.id}?ref=${encodeURIComponent(session?.user?.email || "")}`;
    const shareData = {
      title: event.title,
      text: event.description,
      url: shareLink,
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
    if (!event) return;
    const shareLink = `${window.location.origin}/event/${event.id}?ref=${encodeURIComponent(session?.user?.email || "")}`;
    navigator.clipboard.writeText(shareLink);
    toast.success("Trackable share link copied to clipboard!");
  };

  const handleWhatsappShare = () => {
    if (!event) return;
    const shareLink = `${window.location.origin}/event/${event.id}?ref=${encodeURIComponent(session?.user?.email || "")}`;
    const text = `Check out this vibe: ${event.title}\n\n${shareLink}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

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
      }
    } catch (err) {
      console.error("RSVP failed", err);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-zinc-400 font-black uppercase tracking-widest text-[10px]">
        Synchronizing Vibes...
      </div>
    );
  }

    if (status === "unauthenticated") {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full ringer-card p-10 bg-white text-center space-y-8 shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200">
            <div className="sticker-badge bg-primary text-black w-fit mx-auto border-none shadow-sm font-black text-[9px] uppercase tracking-widest">
              VibeCheck Exclusive
            </div>
            <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">
              Vibe Locked
            </h2>
            <p className="text-zinc-500 font-bold text-xs leading-relaxed">
              You've been invited to explore this exclusive Visakhapatnam happening. Please sign in to view the event details and secure your spot.
            </p>
            <button
              onClick={() => signIn("google", { callbackUrl: window.location.href })}
              className="ringer-button w-full bg-black text-white hover:bg-zinc-800 h-14 text-xs font-black tracking-widest flex items-center justify-center gap-2"
            >
              🔑 SIGN IN TO REVEAL DETAILS
            </button>
          </div>
        </div>
      );
    }

    if (loading) return (
      <div className="max-w-4xl mx-auto p-12 space-y-8">
        <div className="h-8 w-48 bg-zinc-100 animate-pulse rounded-full" />
        <div className="h-96 w-full bg-zinc-100 animate-pulse rounded-[40px]" />
      </div>
    );

    if (!event) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8 animate-in fade-in duration-700">
      <Link href="/dashboard" className="group flex items-center gap-2 text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back to Explore
      </Link>
      
      <div className={`ringer-card p-0 overflow-hidden shadow-2xl flex flex-col md:flex-row relative ${isVibrant ? getCategoryCardClass(event.category) : ''}`}>
        {isVibrant && <CategoryDecorations category={event.category} />}
        {/* Left Side: Editorial Content */}
        <div className="flex-1 p-8 sm:p-12 space-y-10 relative z-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div 
                className={`sticker-badge text-white border-none ${isVibrant ? '' : 'bg-primary'}`}
                style={isVibrant ? { backgroundColor: getCategoryAccentColor(event.category) } : {}}
              >
                {event.category}
              </div>
              <div className="sticker-badge bg-zinc-100 border-none text-zinc-400">{event.venue_type || "Indoor"}</div>
              <div className="sticker-badge bg-zinc-100 border-none text-zinc-400">Verified Vibe</div>
            </div>
            
            <h1 className="text-4xl sm:text-6xl font-black tracking-tighter text-black leading-[0.9] uppercase italic">
              {event.title}
            </h1>
          </div>
          
          <div className="prose prose-zinc max-w-none text-zinc-500 text-lg font-bold leading-relaxed">
            {event.description}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <button 
              onClick={handleRSVP}
              disabled={rsvped}
              className={`ringer-button h-16 flex-1 text-sm font-black flex items-center justify-center gap-3 transition-all rounded-[20px] ${
                rsvped 
                ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed' 
                : isVibrant 
                  ? 'bg-black text-white hover:bg-zinc-800 vibe-shimmer'
                  : 'bg-black text-white hover:bg-zinc-800'
              }`}
            >
              {rsvped ? <CheckCircle2 className="h-5 w-5" /> : null}
              {rsvped ? "ALREADY IN" : "RSVP TO EVENT"}
            </button>
            
            <button 
              onClick={handleDownloadICS}
              className="ringer-button h-16 flex-1 text-sm font-black flex items-center justify-center gap-3 border-2 border-black/5 hover:bg-black/5 rounded-[20px]"
            >
              <CalendarPlus className="h-5 w-5" />
              ADD TO CALENDAR
            </button>
          </div>
        </div>

        {/* Right Side: Meta Info Box */}
        <div className="w-full md:w-80 bg-zinc-50 border-l border-black/5 p-8 sm:p-12 space-y-12">
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

              <div className="space-y-1">
                 <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Venue Type</div>
                 <div className="text-sm font-bold text-zinc-600">
                   {event.venue_type || "Indoor"}
                 </div>
              </div>
           </div>

            <div className="space-y-2 pt-6 border-t border-black/5">
               <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Host / Organizer</div>
               <div className="text-xs font-bold text-black truncate mb-2">{event.organizer_email || 'Platform Admin'}</div>
               {event.organizer_email && (
                 <div className="flex flex-col gap-2">
                   <button 
                     onClick={toggleFollow}
                     className={`ringer-button w-full text-[9px] font-black tracking-widest h-10 ${
                       isFollowing 
                       ? 'bg-zinc-200 text-black hover:bg-zinc-300' 
                       : 'bg-white text-black border border-black hover:bg-zinc-50'
                     }`}
                   >
                     {isFollowing ? '✓ FOLLOWING HOST' : '➕ FOLLOW HOST'}
                   </button>
                   <button 
                     onClick={toggleBlock}
                     className="ringer-button w-full text-[9px] font-black tracking-widest h-10 bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                   >
                     🚫 BLOCK HOST
                   </button>
                 </div>
               )}
            </div>

            <div className="pt-8 border-t border-black/5 flex flex-col gap-4">
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
    </div>
  );
}
