"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#f97316", "#84cc16"];

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
      fetch(`http://localhost:4000/api/admin/events/${eventId}/rsvps`)
        .then(r => r.json())
        .then(d => { if (d.success) setRsvps(d.data); })
        .finally(() => setLoading(false));
    }
    setOpen(!open);
  };

  return (
    <div className="border border-zinc-800 rounded-lg mb-3 overflow-hidden group">
      <div className="flex justify-between items-center p-4 bg-zinc-900/50 cursor-pointer hover:bg-zinc-800 transition-colors" onClick={loadRsvps}>
        <div className="flex flex-col">
          <span className="text-white font-semibold text-base">{title}</span>
          <span className="text-zinc-500 text-xs mt-1">{new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'})}</span>
        </div>
        <span className="text-indigo-400 text-sm font-medium px-4 py-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">{open ? "Hide Guestlist" : "View Guestlist"}</span>
      </div>
      {open && (
        <div className="p-0 border-t border-zinc-800 bg-zinc-950">
          {loading ? (
             <p className="p-6 text-zinc-500 text-sm text-center animate-pulse">Loading attendees...</p>
          ) : rsvps.length === 0 ? (
             <p className="p-6 text-zinc-500 text-sm text-center italic">No RSVPs received yet.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/50">
              {rsvps.map((r, i) => (
                <li key={i} className="text-sm p-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 hover:bg-zinc-900/30 transition-colors">
                  <span className="text-zinc-300 font-medium">
                    {r.name ? `${r.name} ` : ''}
                    <span className="text-zinc-500 font-normal">{r.name ? `(${r.user_email})` : r.user_email}</span>
                  </span>
                  <span className="text-zinc-600 text-xs">{new Date(r.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function OrganizerManager() {
  const [organizers, setOrganizers] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  
  const loadOrganizers = () => {
    fetch("http://localhost:4000/api/admin/organizers").then(r=>r.json()).then(d => {
      if(d.success) setOrganizers(d.data);
    });
  }
  
  useEffect(() => { loadOrganizers(); }, []);
  
  const handleAdd = async () => {
    if(!email) return;
    const r = await fetch("http://localhost:4000/api/admin/organizers", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email })
    });
    const d = await r.json();
    if(d.success) {
      setEmail("");
      loadOrganizers();
    } else {
      alert("Failed to add organizer");
    }
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800 h-full">
      <CardHeader>
        <CardTitle className="text-white text-base">Event Organizers</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2 mb-4">
          <Input placeholder="Enter user's email..." value={email} onChange={e=>setEmail(e.target.value)} className="bg-zinc-950 border-zinc-800 text-white flex-1" />
          <Button onClick={handleAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white">Authorize</Button>
        </div>
        <ul className="space-y-2 max-h-48 overflow-y-auto pr-2">
          {organizers.map(o => (
            <li key={o.email} className="text-sm p-3 bg-zinc-950 rounded-lg border border-zinc-800/50 text-emerald-400 font-medium flex items-center gap-3">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              <span>{o.email}</span>
            </li>
          ))}
          {organizers.length === 0 && <p className="text-zinc-500 text-sm">No organizers added yet.</p>}
        </ul>
      </CardContent>
    </Card>
  )
}

function PendingEventsList() {
  const [events, setEvents] = useState<any[]>([]);
  
  const loadEvents = () => {
    fetch("http://localhost:4000/api/admin/events/pending").then(r=>r.json()).then(d => {
      if(d.success) setEvents(d.data);
    });
  }
  
  useEffect(() => { loadEvents(); }, []);
  
  const handleReview = async (id: string, status: string) => {
    const r = await fetch(`http://localhost:4000/api/admin/events/${id}/review`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status })
    });
    const d = await r.json();
    if(d.success) loadEvents();
  }

  if (events.length === 0) return null;

  return (
    <Card className="bg-zinc-900 border-amber-500/30 mb-8 relative overflow-hidden shadow-xl shadow-amber-900/5">
      <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500" />
      <CardHeader>
        <CardTitle className="text-amber-400 text-lg flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          Pending Submissions ({events.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.map(ev => (
          <div key={ev.id} className="p-4 bg-zinc-950 rounded-xl border border-zinc-800 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
             <div>
               <p className="text-white font-medium text-lg">{ev.title}</p>
               <p className="text-zinc-400 text-sm mt-1">{ev.location} • {new Date(ev.date_time).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}</p>
               <p className="text-zinc-500 text-xs mt-2">Submitted by: <span className="text-zinc-300">{ev.organizer_email}</span></p>
             </div>
             <div className="flex gap-3 w-full lg:w-auto mt-2 lg:mt-0">
               <Button onClick={() => handleReview(ev.id, 'approved')} className="flex-1 lg:flex-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-900/20">
                 Approve & Publish
               </Button>
               <Button onClick={() => handleReview(ev.id, 'rejected')} variant="destructive" className="flex-1 lg:flex-none opacity-80 hover:opacity-100">
                 Reject
               </Button>
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
    Promise.all([
      fetch("http://localhost:4000/api/admin/analytics").then(r => r.json()),
      fetch("http://localhost:4000/api/admin/settings").then(r => r.json()),
      fetch("http://localhost:4000/api/admin/events").then(r => r.json())
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
    .finally(() => setLoading(false));
  }, []);

  const toggleCron = async () => {
    setUpdatingCron(true);
    const newValue = !cronEnabled;
    try {
      const res = await fetch("http://localhost:4000/api/admin/settings", {
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
      const res = await fetch("http://localhost:4000/api/admin/settings", {
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
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-zinc-800 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-zinc-900 rounded-xl border border-zinc-800" />)}
        </div>
        <div className="h-72 bg-zinc-900 rounded-xl border border-zinc-800" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Events", value: analytics?.totalEvents ?? 0, icon: "🎉", color: "text-indigo-400" },
    { label: "Web Users", value: analytics?.totalWebUsers ?? 0, icon: "🌐", color: "text-cyan-400" },
    { label: "WhatsApp Users", value: analytics?.totalWhatsappUsers ?? 0, icon: "📱", color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Overview
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Platform analytics at a glance.</p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 px-5 py-3 rounded-xl shadow-lg min-w-[250px]">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white mb-0.5">Push Alerts (Cron Job)</span>
              <span className="text-xs text-zinc-500">Scheduled 9:00 AM IST</span>
            </div>
            <button
              onClick={toggleCron}
              disabled={updatingCron}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${cronEnabled ? 'bg-emerald-500' : 'bg-zinc-700'} ${updatingCron ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${cronEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 px-5 py-3 rounded-xl shadow-lg min-w-[250px]">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white mb-0.5">WhatsApp Notify</span>
              <span className="text-xs text-zinc-500">Show buttons on dashboard</span>
            </div>
            <button
              onClick={toggleWhatsapp}
              disabled={updatingWhatsapp}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${whatsappEnabled ? 'bg-emerald-500' : 'bg-zinc-700'} ${updatingWhatsapp ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${whatsappEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map(s => (
          <Card key={s.label} className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-sm">{s.label}</p>
                  <p className={`text-4xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
                <span className="text-4xl">{s.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
     </div>

      <PendingEventsList />
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OrganizerManager />
        {/* Events by Category */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Events by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics?.eventsByCategory ?? []} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="category" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#fff" }}
                  cursor={{ fill: "rgba(99,102,241,0.1)" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {(analytics?.eventsByCategory ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Preferred Categories */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base">User Preferred Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {(analytics?.topPreferences ?? []).length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-zinc-600 text-sm">
                No preference data yet — users haven&apos;t saved their interests.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics?.topPreferences ?? []} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="category" type="category" tick={{ fill: "#a1a1aa", fontSize: 12 }} width={70} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#fff" }}
                    cursor={{ fill: "rgba(99,102,241,0.1)" }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(analytics?.topPreferences ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* RSVP Management List */}
      <div className="pt-8 border-t border-zinc-800 pb-16">
        <h2 className="text-2xl font-bold text-white mb-2">Event RSVPs</h2>
        <p className="text-zinc-500 text-sm mb-6">Expand an event to view the full guest list and attendance records.</p>
        <div className="space-y-1">
          {eventsList.length === 0 ? (
            <div className="text-center py-10 bg-zinc-900 border border-zinc-800 rounded-xl">
              <p className="text-zinc-500">No events exist in the database yet.</p>
            </div>
          ) : (
            eventsList.map((ev: any) => (
              <EventRsvpList key={ev.id} eventId={ev.id} title={ev.title} dateStr={ev.date_time} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
