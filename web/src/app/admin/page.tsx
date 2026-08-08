"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Users, Calendar, ShieldCheck, ListChecks, CheckCircle2, XCircle, Sparkles, MapPin } from "lucide-react";
import { toast } from "sonner";

// Joyful Ringer-style Palette
const COLORS = ["#19A74E", "#E4FF00", "#6366f1", "#ec4899", "#f97316", "#06b6d4"];

type Analytics = {
  totalEvents: number;
  totalWebUsers: number;
  totalWhatsappUsers: number;
  eventsByCategory: { category: string; count: string }[];
  topPreferences: { category: string; count: string }[];
};

function EventRsvpList({ eventId, title, dateStr }: { eventId: string, title: string, dateStr: string }) {
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const loadRsvps = () => {
    if (!open) {
      setLoading(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/admin/events/${eventId}/rsvps`)
        .then(r => r.json())
        .then(d => { if (d.success) setRsvps(d.data); })
        .finally(() => setLoading(false));
    }
    setOpen(!open);
  };

  return (
    <div className="ringer-card overflow-hidden group mb-4">
      <div className="flex justify-between items-center p-6 bg-white cursor-pointer hover:bg-zinc-50 transition-colors" onClick={loadRsvps}>
        <div className="flex flex-col">
          <span className="text-black font-black uppercase tracking-tighter italic text-lg">{title}</span>
          <span className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1">
            {new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric'})}
          </span>
        </div>
        <button className="ringer-button bg-black text-white text-[10px]">
          {open ? "CLOSE" : "VIEW GUEST LIST"}
        </button>
      </div>
      {open && (
        <div className="p-0 border-t border-black/5 bg-zinc-50/50">
          {loading ? (
             <p className="p-8 text-zinc-400 text-xs font-black uppercase tracking-[0.2em] text-center animate-pulse">Gathering the crowd...</p>
          ) : rsvps.length === 0 ? (
             <p className="p-8 text-zinc-400 text-xs font-bold text-center italic">The vibes are quiet. No RSVPs yet.</p>
          ) : (
            <ul className="divide-y divide-black/5">
              {rsvps.map((r, i) => (
                <li key={i} className="text-sm p-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 hover:bg-white transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                       <Users className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-black font-bold">
                      {r.name ? `${r.name} ` : ''}
                      <span className="text-zinc-400 font-medium ml-1">{r.name ? `(${r.user_email})` : r.user_email}</span>
                    </span>
                  </div>
                  <span className="text-zinc-300 text-[10px] font-black uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function OrganizerRequestsSummaryCard() {
  const [count, setCount] = useState<number | null>(null);
  
  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/admin/organizers/pending`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setCount(d.data.length);
      })
      .catch(err => console.error(err));
  }, []);

  return (
    <Card className="ringer-card h-full flex flex-col justify-between p-8 min-h-[250px] bg-white">
      <div>
        <div className="flex justify-between items-start mb-6">
          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Organizer Approvals</span>
          <div className="h-10 w-10 rounded-[15px] bg-amber-50 flex items-center justify-center shadow-sm">
            <Users className="h-5 w-5 text-amber-600" />
          </div>
        </div>
        <h3 className="text-black text-sm font-black uppercase tracking-[0.1em] mb-2 leading-none">Organizer Requests</h3>
        <p className="text-5xl font-black italic tracking-tighter leading-none mt-2 text-black">
          {count === null ? "..." : `${count} Pending`}
        </p>
      </div>
      <Link href="/admin/organizers" className="mt-8">
        <Button className="w-full bg-black text-white text-[10px] uppercase font-black hover:bg-zinc-800 h-10 tracking-widest">
          MANAGE APPLICATIONS
        </Button>
      </Link>
    </Card>
  );
}

function PendingEventsList() {
  const [events, setEvents] = useState<any[]>([]);
  
  const loadEvents = () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/admin/events/pending`).then(r=>r.json()).then(d => {
      if(d.success) setEvents(d.data);
    });
  }
  
  useEffect(() => { loadEvents(); }, []);
  
  const handleReview = async (id: string, status: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const r = await fetch(`${baseUrl}/api/admin/events/${id}/review`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })
    });
    const d = await r.json();
    if(d.success) loadEvents();
  }

  if (events.length === 0) return null;

  return (
    <Card className="ringer-card border-accent bg-accent/5 mb-12 relative overflow-hidden">
      <div className="absolute top-0 w-full h-1 bg-accent" />
      <CardHeader>
        <CardTitle className="text-black text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Submissions Awaiting Vibes ({events.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {events.map(ev => (
          <div key={ev.id} className="p-6 bg-white rounded-[30px] border border-black/5 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-6 shadow-sm">
             <div className="space-y-2">
               <div className="sticker-badge bg-black text-white w-fit">{ev.category}</div>
               <p className="text-black font-black uppercase italic tracking-tighter text-2xl">{ev.title}</p>
               <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {ev.location}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(ev.date_time).toLocaleDateString()}</span>
               </div>
               <p className="text-zinc-400 text-[10px] font-bold">BY: {ev.organizer_email}</p>
             </div>
             <div className="flex gap-4">
               <button onClick={() => handleReview(ev.id, 'approved')} className="ringer-button bg-primary text-black text-[10px] flex items-center gap-2">
                 <CheckCircle2 className="h-4 w-4" /> APPROVE & PUBLISH
               </button>
               <button onClick={() => handleReview(ev.id, 'rejected')} className="ringer-button border-2 border-black/5 hover:bg-black/5 text-black text-[10px] flex items-center gap-2">
                 <XCircle className="h-4 w-4" /> REJECT
               </button>
             </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default function AdminPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [cronEnabled, setCronEnabled] = useState(false);
  const [updatingCron, setUpdatingCron] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [updatingWhatsapp, setUpdatingWhatsapp] = useState(false);
  const [eventsList, setEventsList] = useState<any[]>([]);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    Promise.all([
      fetch(`${baseUrl}/api/admin/analytics`).then(r => r.json()),
      fetch(`${baseUrl}/api/admin/settings`).then(r => r.json()),
      fetch(`${baseUrl}/api/admin/events`).then(r => r.json())
    ])
    .then(([analyticsRes, settingsRes, eventsRes]) => {
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
      if (settingsRes.success && settingsRes.data) {
        const cronVal = settingsRes.data.cron_enabled;
        setCronEnabled(cronVal === "true" || cronVal === true);
        const waVal = settingsRes.data.whatsapp_enabled;
        setWhatsappEnabled(waVal === undefined || waVal === "true" || waVal === true);
      }
      if (eventsRes.success && eventsRes.data) {
        setEventsList(eventsRes.data);
      }
    })
    .catch(err => console.error("Admin data fetch error:", err))
    .finally(() => setLoading(false));
  }, []);

  const toggleCron = async () => {
    setUpdatingCron(true);
    const newValue = !cronEnabled;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "cron_enabled", value: newValue ? "true" : "false" })
      });
      const data = await res.json();
      if (data.success) {
        setCronEnabled(newValue);
      }
    } catch (e) {
      console.error("Failed to update setting", e);
    }
    setUpdatingCron(false);
  };

  const toggleWhatsapp = async () => {
    setUpdatingWhatsapp(true);
    const newValue = !whatsappEnabled;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "whatsapp_enabled", value: newValue ? "true" : "false" })
      });
      const data = await res.json();
      if (data.success) {
        setWhatsappEnabled(newValue);
      }
    } catch (e) {
      console.error("Failed to update setting", e);
    }
    setUpdatingWhatsapp(false);
  };

  if (loading) {
    return (
      <div className="space-y-12 max-w-7xl mx-auto">
        <div className="h-10 w-64 bg-zinc-100 animate-pulse rounded-full" />
        <div className="grid grid-cols-3 gap-8">
          {[1,2,3].map(i => <div key={i} className="h-32 bg-zinc-100 rounded-[40px] animate-pulse" />)}
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Active Vibes", value: analytics?.totalEvents ?? 0, icon: <Sparkles className="h-6 w-6 text-primary" />, bg: "bg-primary/5" },
    { label: "Total Explorers", value: analytics?.totalWebUsers ?? 0, icon: <Users className="h-6 w-6 text-indigo-500" />, bg: "bg-indigo-50" },
    { label: "Phone Alerts", value: analytics?.totalWhatsappUsers ?? 0, icon: <CheckCircle2 className="h-6 w-6 text-emerald-500" />, bg: "bg-emerald-50" },
  ];

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-black/5 pb-12">
        <div>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-[0.9]">
            The Mission Room
          </h1>
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Core Platform Integrity & Analytics</p>
        </div>

        <div className="flex flex-wrap gap-4">
           {/* Settings Toggles */}
           <div className="ringer-card py-4 px-6 flex items-center gap-6">
              <div className="space-y-0.5">
                <div className="text-[10px] font-black uppercase tracking-widest text-black">A.I. Matchmaker</div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase">Automated Push</div>
              </div>
              <button
                onClick={toggleCron}
                disabled={updatingCron}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${cronEnabled ? 'bg-primary' : 'bg-zinc-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${cronEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
           </div>

           <div className="ringer-card py-4 px-6 flex items-center gap-6">
              <div className="space-y-0.5">
                <div className="text-[10px] font-black uppercase tracking-widest text-black">WhatsApp Visibility</div>
                <div className="text-[10px] font-bold text-zinc-400 uppercase">Dash Control</div>
              </div>
              <button
                onClick={toggleWhatsapp}
                disabled={updatingWhatsapp}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${whatsappEnabled ? 'bg-primary' : 'bg-zinc-200'}`}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${whatsappEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
           </div>
        </div>
      </div>

      <PendingEventsList />

      {/* High impact Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {statCards.map(s => (
          <div key={s.label} className={`ringer-card ${s.bg} p-8 border-none flex flex-col justify-between h-48`}>
             <div className="flex justify-between items-start">
               <span className="text-[10px] font-black uppercase tracking-widest text-black/60">{s.label}</span>
               <div className="h-10 w-10 rounded-[15px] bg-white flex items-center justify-center shadow-sm">
                 {s.icon}
               </div>
             </div>
             <p className="text-6xl font-black italic tracking-tighter leading-none">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Grid of tools */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4">
           <OrganizerRequestsSummaryCard />
        </div>
        
        {/* Charts */}
        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="ringer-card">
            <CardHeader>
              <CardTitle className="text-black text-[10px] font-black uppercase tracking-widest">Events By Vibe</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics?.eventsByCategory ?? []} margin={{ left: -20, bottom: 0, top: 10 }}>
                  <XAxis dataKey="category" tick={{ fill: "#000", fontSize: 9, fontWeight: 900 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#A1A1AA", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#000", border: "none", borderRadius: 12, color: "#fff", fontSize: 10, fontWeight: 900 }}
                    cursor={{ fill: "rgba(0,0,0,0.05)" }}
                  />
                  <Bar dataKey="count" radius={[10, 10, 0, 0]}>
                    {(analytics?.eventsByCategory ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="ringer-card">
            <CardHeader>
              <CardTitle className="text-black text-[10px] font-black uppercase tracking-widest">User Desires</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics?.topPreferences ?? []} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="category" type="category" tick={{ fill: "#000", fontSize: 10, fontWeight: 900 }} width={70} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#000", border: "none", borderRadius: 12, color: "#fff", fontSize: 10, fontWeight: 900 }}
                  />
                  <Bar dataKey="count" radius={[0, 10, 10, 0]}>
                    {(analytics?.topPreferences ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Editorial RSVP List */}
      <div className="pt-12 border-t border-black/5 pb-16">
        <h2 className="text-4xl font-black italic tracking-tighter uppercase italic leading-none mb-2">Guest List Manifest</h2>
        <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-10">Expand a vibe to synchronize attendees</p>
        
        <div className="space-y-10">
          {eventsList.length === 0 ? (
            <p className="text-zinc-400 text-xs italic py-12 text-center">No vibes detected in the database.</p>
          ) : (
            Object.entries(
              eventsList.reduce((acc: any, ev: any) => {
                const city = ev.city || "Unspecified Location";
                if (!acc[city]) acc[city] = [];
                acc[city].push(ev);
                return acc;
              }, {})
            ).map(([city, evs]: [string, any]) => (
              <div key={city} className="flex flex-col gap-2">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-black tracking-[0.2em] uppercase text-black bg-white shadow-sm border border-black/5 px-4 py-2 rounded-full w-fit">
                    <MapPin className="inline h-3 w-3 mr-1 -mt-0.5 text-primary" /> {city}
                  </h3>
                  <div className="h-px bg-black/5 flex-1" />
                </div>
                <div className="space-y-3">
                  {evs.map((ev: any) => (
                    <EventRsvpList key={ev.id} eventId={ev.id} title={ev.title} dateStr={ev.date_time} />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
