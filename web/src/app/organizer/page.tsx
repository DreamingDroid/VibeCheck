"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { VibeTimePicker } from "@/components/vibe-time-picker";
import { VibeDatePicker } from "@/components/vibe-date-picker";
import { toast } from "sonner";
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from "recharts";
const CATEGORIES = ["Sports", "Arts", "Education", "Spiritual", "Music", "Food", "Wellness", "Indie", "Techno", "General"];

const TIME_SLOTS = Array.from({ length: 48 }).map((_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? "00" : "30";
  const ampm = hour < 12 ? "AM" : "PM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${min} ${ampm}`;
});

function EventRsvpList({ eventId, title, status, dateStr, organizerEmail, adminComment, onEdit, onStatusUpdated }: { eventId: string, title: string, status: string, dateStr: string, organizerEmail: string, adminComment?: string, onEdit?: () => void, onStatusUpdated?: () => void }) {
  const [rsvps, setRsvps] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastStats, setBroadcastStats] = useState<{ eligibleCount: number, costPerMessage: number, totalCost: number } | null>(null);
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success">("idle");

  const [promoModalOpen, setPromoModalOpen] = useState(false);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoData, setPromoData] = useState("");

  const [analytics, setAnalytics] = useState<any>(null);

  const loadRsvps = () => {
    if (!open) {
      setLoading(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      Promise.all([
        fetch(`${baseUrl}/api/organizer/events/${eventId}/rsvps?email=${encodeURIComponent(organizerEmail)}`).then(r => r.json()),
        fetch(`${baseUrl}/api/organizer/events/${eventId}/analytics?email=${encodeURIComponent(organizerEmail)}`).then(r => r.json())
      ])
        .then(([rsvpsData, analyticsData]) => {
          if (rsvpsData.success) setRsvps(rsvpsData.data);
          if (analyticsData.success) setAnalytics(analyticsData.data);
        })
        .finally(() => setLoading(false));
    }
    setOpen(!open);
  };

  const openBroadcast = (e: React.MouseEvent) => {
    e.stopPropagation();
    setBroadcastOpen(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/organizer/events/${eventId}/broadcast-stats?email=${encodeURIComponent(organizerEmail)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setBroadcastStats(d);
        }
      });
  };

  const handlePayAndSend = () => {
    if (!broadcastMessage.trim()) { toast.error("Message cannot be empty."); return; }
    setPaymentStatus("processing");
    setTimeout(() => {
      setPaymentStatus("success");
      setBroadcasting(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/organizer/events/${eventId}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizer_email: organizerEmail, message: broadcastMessage })
      })
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            toast.success(d.message);
            setBroadcastOpen(false);
          } else {
            toast.error("Broadcast failed. Please try again.");
          }
        })
        .finally(() => {
          setBroadcasting(false);
          setPaymentStatus("idle");
          setBroadcastMessage("");
        });
    }, 2000);
  };

  const openPromoKit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setPromoModalOpen(true);
    if (!promoData) {
      setPromoLoading(true);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        const r = await fetch(`${baseUrl}/api/organizer/events/${eventId}/promo?email=${encodeURIComponent(organizerEmail)}`);
        const d = await r.json();
        if (d.success) setPromoData(d.data);
      } catch (e) {
        console.error("Promo fetch failed", e);
      } finally {
        setPromoLoading(false);
      }
    }
  };

  const copyPromoText = () => {
    navigator.clipboard.writeText(promoData);
    toast.success("Promo text copied to clipboard!");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return <span className="sticker-badge bg-primary/10 text-primary border-primary/20">Approved</span>;
      case 'housefull': return <span className="sticker-badge bg-red-500/10 text-red-600 border-red-500/20">Housefull</span>;
      case 'rejected': return <span className="sticker-badge bg-destructive/10 text-destructive border-destructive/20">Rejected</span>;
      case 'needs_changes': return <span className="sticker-badge bg-orange-500/10 text-orange-600 border-orange-500/20">Needs Changes</span>;
      default: return <span className="sticker-badge bg-amber-500/10 text-amber-600 border-amber-500/20">Pending</span>;
    }
  };

  return (
    <div className="ringer-card overflow-hidden group mb-4">
      <div className="flex flex-col md:flex-row justify-between md:items-center p-6 bg-white cursor-pointer hover:bg-zinc-50 transition-colors gap-4" onClick={() => loadRsvps()}>
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <span className="text-black font-black uppercase tracking-tighter italic text-xl">{title}</span>
            {getStatusBadge(status)}
          </div>
          <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mt-1">
            {new Date(dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </span>
          {adminComment && (status === 'rejected' || status === 'needs_changes') && (
            <div className="mt-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs p-3 rounded-xl max-w-xl">
              <span className="font-bold uppercase tracking-widest text-[9px] block mb-1">Admin Feedback:</span>
              {adminComment}
            </div>
          )}
        </div>
        <div className="flex flex-col md:flex-row gap-2 items-center shrink-0">
          {(status === 'approved' || status === 'housefull') && (
            <button
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
                  const res = await fetch(`${baseUrl}/api/organizer/events/${eventId}/toggle-housefull`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ organizer_email: organizerEmail })
                  });
                  const d = await res.json();
                  if (d.success) {
                    toast.success(d.message);
                    if (onStatusUpdated) onStatusUpdated();
                  } else {
                    toast.error(d.error || "Failed to toggle status");
                  }
                } catch (err) {
                  toast.error("An error occurred");
                }
              }}
              className="ringer-button border border-red-500 text-red-500 hover:bg-red-50 text-[10px]"
            >
              {status === 'housefull' ? 'REOPEN EVENT' : 'MARK HOUSEFULL'}
            </button>
          )}
          {(status === 'approved' || status === 'housefull') && (
            <>
              <button onClick={openPromoKit} className="ringer-button bg-black text-white hover:bg-zinc-800 text-[10px] flex items-center gap-2">
                ✨ AI PROMO KIT
              </button>
              <button onClick={openBroadcast} className="ringer-button bg-primary text-black text-[10px] flex items-center gap-2">
                📢 WHATSAPP UPDATE
              </button>
            </>
          )}
          {status === 'needs_changes' && onEdit && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="ringer-button bg-orange-500 text-white text-[10px] flex items-center gap-2">
              ✏️ EDIT & RESUBMIT
            </button>
          )}
          {(status === 'approved' || status === 'housefull' || !status) && (
            <button onClick={(e) => { e.stopPropagation(); loadRsvps(); }} className="ringer-button border border-black/5 hover:bg-black/5 text-black text-[10px]">
              {open ? "HIDE GUESTLIST" : "VIEW GUESTLIST"}
            </button>
          )}
        </div>
      </div>
      {open && (
        <div className="p-0 border-t border-black/5 bg-zinc-50/50">
          {loading ? (
            <p className="p-8 text-zinc-400 text-xs font-black uppercase tracking-[0.2em] text-center animate-pulse">Gathering the crowd...</p>
          ) : rsvps.length === 0 ? (
            <p className="p-8 text-zinc-400 text-xs font-bold text-center italic">The vibes are quiet. No RSVPs received yet.</p>
          ) : (
            <div className="p-6">
              {analytics && (
                <div className="mb-8">
                  <h4 className="text-black font-black uppercase tracking-tighter italic mb-4">Performance Metrics</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-2xl border border-black/5">
                      <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1">Total RSVPs</p>
                      <p className="text-2xl font-black">{analytics.totalRsvps}</p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-black/5">
                      <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1">Peak Day</p>
                      <p className="text-2xl font-black text-primary">
                        {analytics.timeline && analytics.timeline.length > 0
                          ? [...analytics.timeline].sort((a, b) => b.count - a.count)[0].count
                          : 0}
                      </p>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-black/5 col-span-2 md:col-span-1">
                      <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-1">Avg Velocity</p>
                      <div className="flex items-end gap-2">
                        <p className="text-2xl font-black">{analytics.avgVelocity}/day</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white p-6 rounded-3xl border border-black/5 mb-8">
                    <h5 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-6">Vibe Velocity (RSVPs over time)</h5>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.timeline}>
                          <defs>
                            <linearGradient id="colorVibe" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#C1FF00" stopOpacity={0.8} />
                              <stop offset="95%" stopColor="#C1FF00" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: '#a1a1aa' }}
                            dy={10}
                            tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          />
                          <Tooltip
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                            labelStyle={{ color: '#a1a1aa', fontSize: '10px', textTransform: 'uppercase', fontWeight: 900, letterSpacing: '0.1em' }}
                            itemStyle={{ color: '#000', fontWeight: 900 }}
                            labelFormatter={(label) => new Date(label as string).toLocaleDateString()}
                          />
                          <Area
                            type="monotone"
                            dataKey="count"
                            stroke="#C1FF00"
                            strokeWidth={4}
                            fillOpacity={1}
                            fill="url(#colorVibe)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              <h4 className="text-black font-black uppercase tracking-tighter italic mb-4">Guestlist ({rsvps.length})</h4>
              <ul className="divide-y divide-black/5 bg-white rounded-3xl border border-black/5 overflow-hidden">
                {rsvps.map((r, i) => (
                  <li key={i} className="text-sm p-4 px-6 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 hover:bg-zinc-50 transition-colors">
                    <span className="text-black font-bold">
                      {r.name || 'Anonymous Guest'}
                    </span>
                    <span className="text-zinc-300 text-[10px] font-black uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {broadcastOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200">
            <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none mb-2">Sync the Vibe</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-8">Direct WhatsApp update to your community</p>

            {broadcastStats ? (
              <div className="bg-zinc-50 border border-black/5 p-6 rounded-[24px] mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Attendees</span>
                  <span className="font-black text-black">{broadcastStats.eligibleCount}</span>
                </div>
                <div className="flex justify-between items-center mb-4">
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Unit Cost</span>
                  <span className="font-black text-black">₹{broadcastStats.costPerMessage}</span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-black/5">
                  <span className="text-[11px] font-black uppercase tracking-widest text-black">Total Investment</span>
                  <span className="font-black text-primary text-xl">₹{broadcastStats.totalCost}</span>
                </div>
              </div>
            ) : (
              <div className="p-8 mb-8 text-[10px] font-black uppercase tracking-widest text-zinc-300 text-center animate-pulse bg-zinc-50 rounded-[24px] border border-black/5">Calculating stats...</div>
            )}

            <Textarea
              placeholder="Write your update here..."
              className="bg-zinc-50 border-black/5 text-black mb-8 min-h-[120px] rounded-[20px] p-4 text-xs font-bold focus:ring-primary"
              value={broadcastMessage}
              onChange={e => setBroadcastMessage(e.target.value)}
            />

            {paymentStatus === "processing" ? (
              <div className="ringer-button w-full bg-accent text-black text-center animate-pulse flex justify-center items-center gap-2">
                💳 Processing...
              </div>
            ) : broadcasting ? (
              <div className="ringer-button w-full bg-primary text-black text-center animate-pulse flex justify-center items-center gap-2">
                📲 Sending...
              </div>
            ) : (
              <div className="flex gap-4">
                <button className="ringer-button flex-1 border border-black/5 hover:bg-black/5 text-black" onClick={() => setBroadcastOpen(false)}>CANCEL</button>
                <button
                  className="ringer-button flex-1 bg-black text-white hover:bg-zinc-800 disabled:opacity-30"
                  onClick={handlePayAndSend}
                  disabled={!broadcastStats || broadcastStats.eligibleCount === 0 || !broadcastMessage.trim()}
                >
                  PAY & SEND
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {promoModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-[40px] p-10 max-w-2xl w-full shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none mb-2 text-primary">✨ AI Promo Kit</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">Generated exclusively for {title}</p>

            <div className="flex-1 overflow-y-auto mb-6 bg-zinc-50 border border-black/5 rounded-[24px] p-6 custom-scrollbar">
              {promoLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 animate-pulse">Consulting the digital oracle...</p>
                </div>
              ) : (
                <div className="prose prose-sm prose-zinc max-w-none text-xs font-medium text-black">
                  <pre className="whitespace-pre-wrap font-sans text-xs text-black">{promoData}</pre>
                </div>
              )}
            </div>

            <div className="flex gap-4 shrink-0">
              <button className="ringer-button flex-1 border border-black/5 hover:bg-black/5 text-black" onClick={() => setPromoModalOpen(false)}>CLOSE</button>
              <button
                className="ringer-button flex-1 bg-black text-white hover:bg-zinc-800 disabled:opacity-30"
                onClick={copyPromoText}
                disabled={promoLoading || !promoData}
              >
                📋 COPY TO CLIPBOARD
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrganizerDashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [myEvents, setMyEvents] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'events' | 'crm'>('events');
  const [followers, setFollowers] = useState<any[]>([]);
  const [supportedCities, setSupportedCities] = useState<{ id: number; name: string }[]>([]);

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    title: "", description: "", category: "", location: "", city: "", google_maps_link: "", timings: "",
    startDate: "", endDate: "", startTime: "08:00 PM", endTime: "11:00 PM",
    participantLimit: "", isPaid: false
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!session?.user?.email) {
      router.push("/dashboard");
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

    // Fetch supported cities
    fetch(`${baseUrl}/api/cities`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setSupportedCities(data.data);
      })
      .catch(err => console.error("Failed to load cities", err));

    fetch(`${baseUrl}/api/admin/check?email=${encodeURIComponent(session.user.email)}`)
      .then(r => r.json())
      .then(data => {
        if (!data.success || (!data.isOrganizer && !data.isAdmin)) {
          router.push("/dashboard");
          return;
        }
        if (data.isOrganizer && data.status !== 'approved') {
          toast.error("Your organizer application is pending or rejected.");
          router.push("/");
          return;
        }
        setIsOrganizer(true);
        loadMyEvents();
        loadFollowers(session.user?.email ?? '');
      })
      .catch(err => {
        console.error("Check role error", err);
        router.push("/dashboard");
      })
      .finally(() => setLoading(false));

  }, [session, router]);

  const loadMyEvents = () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/organizer/events?email=${encodeURIComponent(session!.user!.email!)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setMyEvents(data.data);
      });
  };

  const loadFollowers = (email: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/organizer/followers?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setFollowers(data.data);
      });
  };

  const handleEditInit = (ev: any) => {
    const start = new Date(ev.date_time);
    const end = ev.end_time ? new Date(ev.end_time) : new Date(start.getTime() + 3 * 3600 * 1000);
    const fDate = (d: Date) => d.toISOString().split("T")[0];
    const fTime = (d: Date) => {
      let h = d.getHours();
      const m = d.getMinutes() >= 30 ? "30" : "00";
      const ampm = h >= 12 ? "PM" : "AM";
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${h}:${m} ${ampm}`;
    };

    setIsMultiDay(fDate(start) !== fDate(end));
    setFormData({
      title: ev.title, description: ev.description, category: ev.category,
      location: ev.location || "", city: ev.city || "", google_maps_link: ev.google_maps_link || "", timings: ev.timings || "",
      startDate: fDate(start), endDate: fDate(end),
      startTime: fTime(start), endTime: fTime(end),
      participantLimit: ev.participant_limit ? String(ev.participant_limit) : "",
      isPaid: ev.is_paid || false
    });
    setEditingEventId(ev.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setFormData({
      title: "", description: "", category: "", location: "", city: "", google_maps_link: "", timings: "",
      startDate: "", endDate: "", startTime: "08:00 PM", endTime: "11:00 PM",
      participantLimit: "", isPaid: false
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, boolean> = {};
    if (!formData.title) newErrors.title = true;
    if (!formData.startDate) newErrors.startDate = true;
    if (isMultiDay && !formData.endDate) newErrors.endDate = true;
    if (!formData.category) newErrors.category = true;
    if (!formData.city) newErrors.city = true;
    if (!formData.location) newErrors.location = true;
    if (!formData.description) newErrors.description = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // Optional: smooth scroll to first error
      const firstError = Object.keys(newErrors)[0];
      const el = document.getElementsByName(firstError)[0];
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setErrors({});
    // Combine date and time
    const combine = (date: string, timeStr: string) => {
      const [time, ampm] = timeStr.split(" ");
      let [hours, mins] = time.split(":").map(Number);
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      const d = new Date(date);
      d.setHours(hours, mins, 0, 0);
      return d.toISOString();
    };

    const start_iso = combine(formData.startDate, formData.startTime);
    const end_iso = combine(isMultiDay ? formData.endDate : formData.startDate, formData.endTime);

    setSubmitting(true);
    const toastId = toast.loading("Submitting your event...");
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const url = editingEventId
        ? `${baseUrl}/api/organizer/events/${editingEventId}`
        : `${baseUrl}/api/organizer/events`;
      const method = editingEventId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          participant_limit: formData.participantLimit ? parseInt(formData.participantLimit, 10) : null,
          is_paid: formData.isPaid,
          date_time: start_iso,
          end_time: end_iso,
          organizer_email: session?.user?.email
        })
      });
      const data = await res.json();
      if (data.success) {
        setFormData({
          title: "", description: "", category: "", location: "", city: "", google_maps_link: "", timings: "",
          startDate: "", endDate: "", startTime: "08:00 PM", endTime: "11:00 PM",
          participantLimit: "", isPaid: false
        });
        setIsMultiDay(false);
        setEditingEventId(null);
        loadMyEvents();
        toast.success("Event submitted!", { id: toastId, description: "Your event is pending review by the VibeCheck team." });
      } else {
        toast.error("Submission failed.", { id: toastId, description: data.error || "VibeCheck server rejected the request. Please check your details." });
      }
    } catch (e) {
      console.error(e);
      toast.error("Submission failed.", { id: toastId, description: "Could not reach the VibeCheck. Please try again." });
    }
    setSubmitting(false);
  };

  if (loading || !isOrganizer) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-zinc-400 font-black uppercase tracking-widest text-[10px]">Synchronizing Vibes...</div>;
  }

  return (
    <div className="min-h-screen bg-background text-black p-4 sm:p-8 animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto space-y-12 mt-4">

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-black/5 pb-12 gap-8">
          <div>
            <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase leading-[0.9]">
              The Control Room
            </h1>
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Deploy and manage your local vibes</p>
          </div>
          <Link href="/dashboard">
            <button className="ringer-button border border-black/5 hover:bg-black/5 text-black text-[10px]">
              EXIT TO PORTAL
            </button>
          </Link>
        </div>

        <div className="flex gap-4 border-b border-black/5 pb-6">
          <button
            className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 ${activeTab === 'events' ? 'border-primary text-black' : 'border-transparent text-zinc-400 hover:text-black'}`}
            onClick={() => setActiveTab('events')}
          >
            Manage Events
          </button>
          <button
            className={`text-xs font-black uppercase tracking-widest pb-2 border-b-2 ${activeTab === 'crm' ? 'border-primary text-black' : 'border-transparent text-zinc-400 hover:text-black'}`}
            onClick={() => setActiveTab('crm')}
          >
            Community CRM ({followers.length})
          </button>
        </div>

        {activeTab === 'events' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Submission Form */}
            <div className="lg:col-span-4 h-fit">
              <div className="ringer-card overflow-hidden">
                <div className="bg-primary/5 border-b border-black/5 p-6 flex justify-between items-center">
                  <div>
                    <h2 className="text-[10px] font-black uppercase tracking-widest text-black">
                      {editingEventId ? "EDIT EVENT" : "NEW EVENT"}
                    </h2>
                    <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase">Awaiting platform guardian approval</p>
                  </div>
                  {editingEventId && (
                    <button type="button" onClick={handleCancelEdit} className="ringer-button bg-zinc-200 text-black text-[9px] px-3 py-1.5">
                      CANCEL
                    </button>
                  )}
                </div>
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <Input name="title" placeholder="Event Title" value={formData.title} onChange={e => { setFormData({ ...formData, title: e.target.value }); if (errors.title) setErrors({ ...errors, title: false }) }} className={cn("bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold", errors.title && "border-red-500 ring-red-500/20")} />
                      {errors.title && <p className="text-[9px] text-red-500 font-black uppercase ml-1">Title is required</p>}
                    </div>

                    <div className="space-y-1">
                      <Select value={formData.category} onValueChange={v => { setFormData({ ...formData, category: v || "" }); if (errors.category) setErrors({ ...errors, category: false }) }}>
                        <SelectTrigger className={cn("bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold", errors.category && "border-red-500 ring-red-500/20")}>
                          <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-black/5 rounded-[20px] shadow-2xl p-2">
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat} value={cat} className="rounded-xl text-xs font-bold hover:bg-zinc-50 cursor-pointer">{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.category && <p className="text-[9px] text-red-500 font-black uppercase ml-1">Pick a category</p>}
                    </div>

                    <div className="space-y-1">
                      <Select value={formData.city} onValueChange={v => { setFormData({ ...formData, city: v || "" }); if (errors.city) setErrors({ ...errors, city: false }) }}>
                        <SelectTrigger className={cn("bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold", errors.city && "border-red-500 ring-red-500/20")}>
                          <SelectValue placeholder="Select City" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-black/5 rounded-[20px] shadow-2xl p-2">
                          {supportedCities.map(c => (
                            <SelectItem key={c.id} value={c.name} className="rounded-xl text-xs font-bold hover:bg-zinc-50 cursor-pointer">{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.city && <p className="text-[9px] text-red-500 font-black uppercase ml-1">City is required</p>}
                    </div>

                    {/* Single vs Multi Day Switcher */}
                    <div className="flex bg-zinc-50 p-1 rounded-xl border border-black/5">
                      <button
                        type="button"
                        onClick={() => setIsMultiDay(false)}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!isMultiDay ? 'bg-black text-white shadow-lg' : 'text-zinc-400 hover:text-black'}`}
                      >
                        Single Day
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMultiDay(true)}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${isMultiDay ? 'bg-black text-white shadow-lg' : 'text-zinc-400 hover:text-black'}`}
                      >
                        Multi Day
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <VibeDatePicker
                        label={isMultiDay ? "From Date" : "Date"}
                        value={formData.startDate}
                        onChange={v => { setFormData({ ...formData, startDate: v }); if (errors.startDate) setErrors({ ...errors, startDate: false }) }}
                        error={errors.startDate}
                      />
                      {isMultiDay && (
                        <VibeDatePicker
                          label="To Date"
                          value={formData.endDate}
                          onChange={v => { setFormData({ ...formData, endDate: v }); if (errors.endDate) setErrors({ ...errors, endDate: false }) }}
                          error={errors.endDate}
                        />
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <VibeTimePicker
                        label="Begins At"
                        value={formData.startTime}
                        onChange={v => setFormData({ ...formData, startTime: v })}
                      />
                      <VibeTimePicker
                        label="Ends At"
                        value={formData.endTime}
                        onChange={v => setFormData({ ...formData, endTime: v })}
                      />
                    </div>

                    <Input placeholder="Extra Timings Note (Optional)" value={formData.timings} onChange={e => setFormData({ ...formData, timings: e.target.value })} className="bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold" />

                    {/* Free vs Paid Switcher */}
                    <div className="flex bg-zinc-50 p-1 rounded-xl border border-black/5">
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isPaid: false })}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${!formData.isPaid ? 'bg-black text-white shadow-lg' : 'text-zinc-400 hover:text-black'}`}
                      >
                        Free Entry
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, isPaid: true })}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${formData.isPaid ? 'bg-black text-white shadow-lg' : 'text-zinc-400 hover:text-black'}`}
                      >
                        Paid Entry
                      </button>
                    </div>

                    <div className="space-y-1">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Event Capacity Limit (Optional)"
                        value={formData.participantLimit}
                        onChange={e => setFormData({ ...formData, participantLimit: e.target.value })}
                        className="bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold"
                      />
                      <p className="text-[9px] text-zinc-400 font-bold uppercase ml-1">Leave blank for no limit.</p>
                    </div>

                    <div className="space-y-1">
                      <Input name="location" placeholder="Location Name (e.g. Rushikonda Beach)" value={formData.location} onChange={e => { setFormData({ ...formData, location: e.target.value }); if (errors.location) setErrors({ ...errors, location: false }) }} className={cn("bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold", errors.location && "border-red-500 ring-red-500/20")} />
                      {errors.location && <p className="text-[9px] text-red-500 font-black uppercase ml-1">Location name is required</p>}
                    </div>

                    <div className="space-y-1">
                      <Input name="google_maps_link" placeholder="Google Maps Link / URL (Optional)" value={formData.google_maps_link} onChange={e => setFormData({ ...formData, google_maps_link: e.target.value })} className="bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold" />
                      <p className="text-[9px] text-zinc-400 font-bold uppercase ml-1">Copy & paste a Google Maps sharing URL so users can navigate exactly to your location.</p>
                    </div>

                    <div className="space-y-1">
                      <Textarea name="description" placeholder="Vibe Manifest (Description)..." value={formData.description} onChange={e => { setFormData({ ...formData, description: e.target.value }); if (errors.description) setErrors({ ...errors, description: false }) }} className={cn("bg-zinc-50 border-black/5 focus:ring-primary min-h-[140px] rounded-[24px] p-4 text-xs font-bold", errors.description && "border-red-500 ring-red-500/20")} />
                      {errors.description && <p className="text-[9px] text-red-500 font-black uppercase ml-1">Vibe manifest is empty</p>}
                    </div>
                  </div>

                  <button type="submit" disabled={submitting} className="ringer-button w-full bg-black text-white hover:bg-zinc-800 text-[11px]">
                    {submitting ? "DEPLOYING..." : editingEventId ? "RESUBMIT FOR REVIEW" : "SUBMIT FOR REVIEW"}
                  </button>
                </form>
              </div>
            </div>

            {/* My Events */}
            <div className="lg:col-span-8 space-y-8">
              <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-none">Deployment Log</h2>
              {myEvents.length === 0 ? (
                <div className="text-center py-20 text-zinc-300 ringer-card border-dashed">
                  <p className="text-[10px] font-black uppercase tracking-widest">No active vibes detected.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {myEvents.map(ev => (
                    <EventRsvpList key={ev.id} eventId={ev.id} title={ev.title} status={ev.status} dateStr={ev.date_time} organizerEmail={session?.user?.email || ""} adminComment={ev.admin_comment} onEdit={() => handleEditInit(ev)} onStatusUpdated={() => loadMyEvents()} />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="ringer-card">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-6">Your Community CRM</h2>
            {followers.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 font-bold italic text-sm">
                Nobody is following you yet. Keep hosting great events!
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-black/5">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">City</th>
                      <th className="px-4 py-3">Follow Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {followers.map((f, i) => (
                      <tr key={i} className="border-b border-black/5 last:border-0 hover:bg-zinc-50 transition-colors">
                        <td className="px-4 py-4 font-bold text-black">{f.name || 'Anonymous User'}</td>
                        <td className="px-4 py-4 text-zinc-600 font-medium">{f.email}</td>
                        <td className="px-4 py-4 text-zinc-600 font-medium">{f.city || 'Unknown'}</td>
                        <td className="px-4 py-4 text-zinc-400 font-bold">{new Date(f.follow_date).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
