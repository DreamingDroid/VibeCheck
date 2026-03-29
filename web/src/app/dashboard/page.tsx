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

  useEffect(() => {
    if (session?.user?.email) {
      fetch(`http://localhost:4000/api/admin/check?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.isAdmin) setIsAdmin(true);
        })
        .catch(err => console.error("Could not check admin status", err));
    }
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
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-8 animate-in fade-in duration-700">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-zinc-800 pb-6 gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              Event Discovery
            </h1>
            <p className="text-zinc-400 mt-2">Find your next vibe in Visakhapatnam.</p>
          </div>
          {session && (
            <div className="flex flex-wrap md:flex-nowrap items-center gap-3 mt-4 md:mt-0">
              {isAdmin && (
                <Link href="/admin">
                  <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm">
                    🛡 Admin
                  </Button>
                </Link>
              )}
              <Link href="/preferences">
                <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-sm">
                  ⚙ My Preferences
                </Button>
              </Link>
              <div className="text-sm bg-zinc-900 px-4 py-2 rounded-lg border border-zinc-800 text-zinc-300 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                Logged in as <span className="text-white font-medium">{session.user?.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Filters Section */}
        <div className="flex flex-col md:flex-row gap-4 bg-zinc-900 border border-zinc-800 p-4 rounded-xl shadow-lg">
          <Input 
            className="md:w-1/2 bg-zinc-950 border-zinc-800 focus-visible:ring-indigo-500 text-white"
            placeholder="Search events by title or description..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchEvents()}
          />
          <Select value={category} onValueChange={(v) => setCategory(v || "All")}>
            <SelectTrigger className="md:w-48 bg-zinc-950 border-zinc-800 focus:ring-indigo-500">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat} className="hover:bg-zinc-800 focus:bg-zinc-800 focus:text-white cursor-pointer transition-colors">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={fetchEvents} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-900/40 transition-all font-semibold px-8">
            Search
          </Button>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="bg-zinc-900 border-zinc-800 animate-pulse h-72"></Card>
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-24 text-zinc-500 bg-zinc-900/50 rounded-2xl border border-zinc-800 border-dashed">
            <h3 className="text-xl font-medium mb-2 opacity-80">No events found matching your vibe.</h3>
            <p className="text-zinc-600">Try broadening your search term or choosing a different category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((ev: { id: string, category: string, title: string, description: string, date_time: string, location: string }) => (
              <Card key={ev.id} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-all hover:shadow-2xl hover:shadow-indigo-900/10 flex flex-col group mt-2">
                <CardHeader>
                  <div className="flex justify-between items-start mb-3">
                    <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 font-semibold tracking-wide">
                      {ev.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl text-white line-clamp-2 group-hover:text-indigo-400 transition-colors">
                    {ev.title}
                  </CardTitle>
                  <CardDescription className="text-zinc-400 mt-2 line-clamp-3 leading-relaxed">
                    {ev.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <div className="flex flex-col gap-3 text-sm text-zinc-400 font-medium">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-zinc-800/50">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      </div>
                      {new Date(ev.date_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-md bg-zinc-800/50">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      </div>
                      {ev.location}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-4 border-t border-zinc-800/50 flex flex-col gap-2">
                  <Button className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-medium transition-colors border border-zinc-700">
                    RSVP / View Details
                  </Button>
                  <a
                    href={buildWhatsAppUrl(ev.title, ev.date_time, ev.location)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full"
                  >
                    <button className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-md bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] text-sm font-medium transition-all duration-200">
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                      </svg>
                      Notify Me on WhatsApp
                    </button>
                  </a>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
