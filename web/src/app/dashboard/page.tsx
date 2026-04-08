"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const CATEGORIES = ["All", "Sports", "Arts", "Education", "Spiritual", "Music", "Food", "Wellness", "Indie", "Techno"];

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

function buildWhatsAppUrl(title: string, date: string, location: string) {
  const formattedDate = new Date(date).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const text = `Hey Vizag Vibes! 👋 I saw *${title}* (${formattedDate} @ ${location}) on the website and I'd love to know more. Can you add me to the notification list?`;
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("All");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);

  useEffect(() => {
    if (session?.user?.email) {
      fetch(`http://localhost:4000/api/admin/check?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            if (data.isAdmin) setIsAdmin(true);
            if (data.isOrganizer) setIsOrganizer(true);
          }
        })
        .catch(err => console.error("Could not check admin status", err));
    }

    fetch("http://localhost:4000/api/admin/settings")
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          const val = res.data.whatsapp_enabled;
          setWhatsappEnabled(val === undefined || val === "true" || val === true);
        }
      })
      .catch(err => console.error("Could not fetch settings", err));
  }, [session]);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const url = new URL("http://localhost:4000/api/events");
      if (category !== "All") url.searchParams.append("category", category);
      if (searchTerm) url.searchParams.append("search", searchTerm);

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setEvents(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch events:", err);
    }
    setLoading(false);
  };

  // Auto-fetch when category dropdown changes or on mount
  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return (
    <div className="min-h-screen text-white p-4 sm:p-8 animate-in fade-in duration-700 relative overflow-hidden">
      
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-white/10 pb-6 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-green-400 bg-clip-text text-transparent drop-shadow-sm">
              Event Discovery
            </h1>
            <p className="text-cyan-100/70 mt-2 font-medium">Find your next vibe along the coast.</p>
          </div>
          {session && (
            <div className="flex flex-wrap md:flex-nowrap items-center gap-3 mt-4 md:mt-0">
              {isAdmin && (
                <Link href="/admin">
                  <Button variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 text-sm bg-black/30 backdrop-blur-md">
                    🛡 Admin
                  </Button>
                </Link>
              )}
              {isOrganizer && (
                <Link href="/organizer">
                  <Button variant="outline" className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/20 text-sm font-semibold bg-black/30 backdrop-blur-md">
                    ✨ Organizer
                  </Button>
                </Link>
              )}
              <Link href="/preferences">
                <Button variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 text-sm bg-black/30 backdrop-blur-md">
                  ⚙ My Preferences
                </Button>
              </Link>
              <div className="text-sm bg-black/40 backdrop-blur-md px-4 py-2 rounded-lg border border-white/10 text-cyan-100/80 flex items-center gap-3 shadow-lg">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Logged in as <span className="text-white font-semibold">{session.user?.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Filters Section */}
        <div className="flex flex-col md:flex-row gap-4 bg-black/40 backdrop-blur-lg border border-white/10 p-4 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.4)]">
          <Input 
            className="md:w-1/2 bg-black/50 border-white/10 focus-visible:ring-cyan-500 text-white placeholder:text-zinc-500"
            placeholder="Search events by title or description..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchEvents()}
          />
          <Select value={category} onValueChange={(v) => setCategory(v || "All")}>
            <SelectTrigger className="md:w-48 bg-black/50 border-white/10 focus:ring-cyan-500">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-white/10 text-white backdrop-blur-xl">
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat} className="hover:bg-cyan-900/50 focus:bg-cyan-900/50 focus:text-white cursor-pointer transition-colors">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={fetchEvents} className="bg-cyan-600 hover:bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all font-bold px-8 border border-cyan-400/50">
            Search
          </Button>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-black/30 border-white/5 animate-pulse h-72 backdrop-blur-sm"></Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24 text-zinc-400 bg-black/20 backdrop-blur-md rounded-2xl border border-white/10 border-dashed">
            <h3 className="text-xl font-medium mb-2 opacity-80 text-cyan-100">No events found matching your vibe.</h3>
            <p className="text-cyan-100/60">Try broadening your search term or choosing a different category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((ev: { id: string, category: string, title: string, description: string, date_time: string, location: string }) => (
              <Card key={ev.id} className="bg-black/40 backdrop-blur-xl border-white/10 hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_25px_rgba(6,182,212,0.2)] hover:-translate-y-1 flex flex-col group mt-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -z-10 group-hover:bg-cyan-500/20 transition-all"></div>
                <CardHeader>
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant="outline" className="border-cyan-500/40 text-cyan-300 bg-cyan-500/10 font-bold tracking-wide shadow-[0_0_10px_rgba(6,182,212,0.2)]">
                      {ev.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl text-white line-clamp-2 group-hover:text-cyan-300 transition-colors drop-shadow-sm">
                    {ev.title}
                  </CardTitle>
                  <CardDescription className="text-zinc-300 mt-2 line-clamp-3 leading-relaxed font-medium">
                    {ev.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex flex-col gap-3 text-sm text-cyan-50/80 font-medium">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-white/5 border border-white/5 shadow-inner">
                        <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      {new Date(ev.date_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-white/5 border border-white/5 shadow-inner">
                        <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                      {ev.location}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-white/5 flex flex-col gap-2 z-10">
                  <Link href={`/event/${ev.id}`} className="w-full">
                    <Button className="w-full bg-white/10 hover:bg-white/20 text-white font-bold transition-colors border border-white/10 shadow-lg backdrop-blur-md">
                      RSVP / View Details
                    </Button>
                  </Link>
                  {whatsappEnabled && (
                    <a
                      href={buildWhatsAppUrl(ev.title, ev.date_time, ev.location)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full"
                    >
                      <button className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/40 text-[#25D366] text-sm font-bold transition-all duration-200 shadow-[0_0_10px_rgba(37,211,102,0.1)]">
                        <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        Notify Me on WhatsApp
                      </button>
                    </a>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
