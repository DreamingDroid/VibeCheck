"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCity } from "@/context/CityContext";
import { useTheme } from "@/context/ThemeContext";
import { CategoryDecorations, getCategoryCardClass, getCategoryAccentColor } from "@/components/CategoryDecorations";
import { Calendar, MapPin, Share2, Sparkles, TrendingUp, Zap, Users } from "lucide-react";
import { toast } from "sonner";

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

export default function Dashboard() {
  const { data: session } = useSession();
  const { currentCity, events, isLoadingEvents: loading, selectedCategory } = useCity();
  const { isVibrant } = useTheme();
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [following, setFollowing] = useState<string[]>([]);

  const handleJoinWhatsApp = () => {
    const text = `Hey! I want to join the VibeCheck community and stay updated with the latest events.`;
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

  const featuredEvent = filteredEvents[0];
  const otherEvents = filteredEvents.slice(1);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 space-y-12">
      
      {/* Editorial Hero Section */}
      {featuredEvent && (
        <section className="relative group cursor-pointer overflow-hidden ringer-card h-auto md:h-[500px] flex flex-col md:flex-row shadow-2xl rounded-[24px] md:rounded-[40px]">
           <div className={`w-full md:w-1/2 ${getCategoryColor(featuredEvent.category)} p-6 sm:p-8 flex flex-col justify-between gap-8 md:gap-0 min-h-[320px] md:min-h-0 relative overflow-hidden`}>
              {isVibrant && <CategoryDecorations category={featuredEvent.category} showAccent={false} />}
              <div className="sticker-badge bg-black text-white w-fit px-4 border-none flex items-center gap-2 relative z-10">
                <TrendingUp className="h-3 w-3" />
                Featured Vibe
              </div>
              <div className="space-y-4 relative z-10">
                <h2 className="text-4xl sm:text-5xl font-black tracking-tighter leading-none uppercase italic break-words hyphens-auto">
                  {featuredEvent.title}
                </h2>
                <p className="font-bold text-black/60 line-clamp-2 max-w-md">
                  {featuredEvent.description}
                </p>
                <div className="flex gap-4 pt-4">
                    <Link href={`/event/${featuredEvent.id}`}>
                      <button className="ringer-button bg-black text-white px-8 py-3 text-sm">
                        SECURE YOUR SPOT
                      </button>
                    </Link>
                </div>
              </div>
           </div>
           <div className="w-full md:w-1/2 bg-white p-5 sm:p-8 flex flex-col justify-center gap-6">
              <div className="space-y-2 border-l-4 border-black pl-6">
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
                  <div className="sticker-badge bg-red-500 border-none text-white font-black animate-pulse">Housefull</div>
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
      <section className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-8 auto-rows-min">
        {otherEvents.map((ev, i) => {
          const isLarge = i % 5 === 0;
          return (
            <div 
              key={ev.id} 
              className={`
                ringer-card p-0 group flex flex-col relative overflow-hidden
                ${isLarge ? 'md:col-span-6 lg:col-span-8' : 'md:col-span-3 lg:col-span-4'}
                ${isVibrant ? `${getCategoryCardClass(ev.category)} vibe-hover-lift` : ''}
              `}
            >
              {isVibrant && <CategoryDecorations category={ev.category} showAccent={false} />}
              <div className="p-5 sm:p-8 flex flex-col h-full space-y-6 relative z-10">
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
                         Housefull
                       </div>
                     )}
                   </div>
                   <div className="flex items-center gap-2">
                     <button 
                       onClick={(e) => toggleFollow(e, ev.organizer_email)}
                       className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${following.includes(ev.organizer_email) ? 'bg-zinc-200 border-transparent text-black' : 'border-zinc-200 text-zinc-400 hover:text-black hover:border-black'}`}
                     >
                       {following.includes(ev.organizer_email) ? '✓ Following' : 'Follow'}
                     </button>
                     <button className="text-zinc-300 hover:text-black transition-colors">
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
                        <Calendar className="h-3.5 w-3.5" />
                        {new Date(ev.date_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </div>
                      <a
                        href={ev.google_maps_link || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ev.location}, ${ev.city || ''}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wide hover:text-black hover:underline cursor-pointer"
                      >
                        <MapPin className="h-2.5 w-2.5" />
                        {ev.location}
                      </a>
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wide mt-1" style={{ color: isVibrant ? getCategoryAccentColor(ev.category) : '#19A74E' }}>
                        <Users className="h-2.5 w-2.5" />
                        <span>{ev.rsvp_count || 0} Interested</span>
                      </div>
                    </div>
                    
                    <Link href={`/event/${ev.id}`}>
                      <button 
                        className={`h-10 w-10 flex items-center justify-center rounded-full hover:scale-110 transition-all ${
                          isVibrant 
                            ? 'text-white shadow-lg' 
                            : 'bg-black text-white hover:bg-primary'
                        }`}
                        style={isVibrant ? { backgroundColor: getCategoryAccentColor(ev.category) } : {}}
                      >
                        <Sparkles className="h-4 w-4" />
                      </button>
                    </Link>
                 </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Discovery Sidebar Style Section */}
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
            <button onClick={handleJoinWhatsApp} className="ringer-button bg-primary text-black">JOIN WHATSAPP</button>
            <button onClick={handleSharePlatform} className="ringer-button border border-white/20 hover:bg-white/10">SHARE PLATFORM</button>
         </div>
      </section>

    </main>
  );
}
