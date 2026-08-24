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
  const [showForm, setShowForm] = useState(false);
  const [supportedCities, setSupportedCities] = useState<{ id: number; name: string }[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [crmLoading, setCrmLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<'all' | 'followers' | 'rsvp'>("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [eventFilter, setEventFilter] = useState("all");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  
  const [editingContact, setEditingContact] = useState<any | null>(null);
  const [editedNotes, setEditedNotes] = useState("");
  const [editedTags, setEditedTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");

  const [crmBroadcastOpen, setCrmBroadcastOpen] = useState(false);
  const [crmBroadcastMsg, setCrmBroadcastMsg] = useState("");
  const [crmBroadcasting, setCrmBroadcasting] = useState(false);
  const [crmPaymentStatus, setCrmPaymentStatus] = useState<"idle" | "processing" | "success">("idle");

  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState({
    title: "", description: "", category: "", location: "", city: "", google_maps_link: "", timings: "",
    startDate: "", endDate: "", startTime: "", endTime: "",
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
        loadContacts(session.user?.email ?? '');
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

  const loadContacts = (email: string) => {
    setCrmLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/organizer/crm/contacts?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) setContacts(data.data);
      })
      .catch(err => console.error("Failed to load CRM contacts", err))
      .finally(() => setCrmLoading(false));
  };

  const getTagsArray = (tagsVal: any): string[] => {
    if (!tagsVal) return [];
    if (Array.isArray(tagsVal)) return tagsVal;
    if (typeof tagsVal === 'string') {
      if (tagsVal.startsWith('{') && tagsVal.endsWith('}')) {
        return tagsVal.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, '')).filter(Boolean);
      }
      return tagsVal.split(',').map(s => s.trim()).filter(Boolean);
    }
    return [];
  };

  const allUniqueTags = Array.from(
    new Set(
      contacts
        .flatMap(c => getTagsArray(c.tags))
        .filter(t => typeof t === 'string' && t.trim() !== '')
    )
  );

  const filteredContacts = contacts.filter(c => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = (c.name || '').toLowerCase().includes(q);
      const emailMatch = (c.email || '').toLowerCase().includes(q);
      const phoneMatch = (c.phone_number || '').toLowerCase().includes(q);
      const notesMatch = (c.notes || '').toLowerCase().includes(q);
      const tagsMatch = getTagsArray(c.tags).some(t => t.toLowerCase().includes(q));
      if (!nameMatch && !emailMatch && !phoneMatch && !notesMatch && !tagsMatch) {
        return false;
      }
    }
    if (segmentFilter === 'followers' && !c.is_follower) return false;
    if (segmentFilter === 'rsvp' && !c.is_attendee) return false;
    if (tagFilter && tagFilter !== 'all') {
      if (!getTagsArray(c.tags).includes(tagFilter)) return false;
    }
    if (eventFilter && eventFilter !== 'all') {
      const eventsStr = (c.rsvped_events || '').toLowerCase();
      if (!eventsStr.includes(eventFilter.toLowerCase())) return false;
    }
    return true;
  });

  const isAllFilteredSelected = filteredContacts.length > 0 && filteredContacts.every(c => selectedEmails.includes(c.email));

  const toggleSelectEmail = (email: string) => {
    if (selectedEmails.includes(email)) {
      setSelectedEmails(selectedEmails.filter(e => e !== email));
    } else {
      setSelectedEmails([...selectedEmails, email]);
    }
  };

  const toggleSelectAllFiltered = () => {
    if (isAllFilteredSelected) {
      setSelectedEmails(selectedEmails.filter(e => !filteredContacts.map(c => c.email).includes(e)));
    } else {
      const newEmails = [...selectedEmails];
      filteredContacts.forEach(c => {
        if (!newEmails.includes(c.email)) {
          newEmails.push(c.email);
        }
      });
      setSelectedEmails(newEmails);
    }
  };

  const handleExportCsv = () => {
    if (filteredContacts.length === 0) {
      toast.error("No contacts to export");
      return;
    }
    const headers = ["Name", "Email", "Phone", "City", "Follower", "Attendee", "RSVPs Count", "RSVP'd Events", "Notes", "Tags"];
    const rows = filteredContacts.map(c => [
      c.name || "Anonymous",
      c.email,
      c.phone_number || "",
      c.city || "",
      c.is_follower ? "Yes" : "No",
      c.is_attendee ? "Yes" : "No",
      c.rsvp_count,
      c.rsvped_events || "",
      c.notes || "",
      getTagsArray(c.tags).join(", ")
    ]);

    const csvString = [
      headers.join(","),
      ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `vibecheck_crm_contacts_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully!");
  };

  const handleSaveNotes = async () => {
    if (!editingContact) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const res = await fetch(`${baseUrl}/api/organizer/crm/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizer_email: session?.user?.email,
          contact_email: editingContact.email,
          notes: editedNotes,
          tags: editedTags
        })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Contact details updated successfully!");
        setEditingContact(null);
        loadContacts(session?.user?.email ?? '');
      } else {
        toast.error(data.error || "Failed to update contact");
      }
    } catch (err) {
      toast.error("An error occurred");
    }
  };

  const openCrmBroadcast = () => {
    if (selectedEmails.length === 0) return;
    setCrmBroadcastOpen(true);
  };

  const handleCrmPayAndSend = () => {
    if (!crmBroadcastMsg.trim()) { toast.error("Message cannot be empty."); return; }
    setCrmPaymentStatus("processing");
    setTimeout(() => {
      setCrmPaymentStatus("success");
      setCrmBroadcasting(true);
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/organizer/crm/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizer_email: session?.user?.email,
          contact_emails: selectedEmails,
          message: crmBroadcastMsg
        })
      })
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            toast.success(d.message);
            setCrmBroadcastOpen(false);
            setSelectedEmails([]);
            setCrmBroadcastMsg("");
          } else {
            toast.error("Broadcast failed. Please try again.");
          }
        })
        .finally(() => {
          setCrmBroadcasting(false);
          setCrmPaymentStatus("idle");
        });
    }, 2000);
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
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingEventId(null);
    setFormData({
      title: "", description: "", category: "", location: "", city: "", google_maps_link: "", timings: "",
      startDate: "", endDate: "", startTime: "", endTime: "",
      participantLimit: "", isPaid: false
    });
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    const newErrors: Record<string, boolean> = {};
    if (!formData.title) newErrors.title = true;
    if (!formData.startDate) newErrors.startDate = true;
    if (isMultiDay && !formData.endDate) newErrors.endDate = true;
    if (!formData.startTime) newErrors.startTime = true;
    if (!formData.endTime) newErrors.endTime = true;
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
          startDate: "", endDate: "", startTime: "", endTime: "",
          participantLimit: "", isPaid: false
        });
        setIsMultiDay(false);
        setEditingEventId(null);
        setShowForm(false);
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
            Community CRM ({contacts.length})
          </button>
        </div>

        {activeTab === 'events' ? (
          <div className="space-y-8 animate-in fade-in duration-500">
            {/* My Events */}
            <div className="space-y-8">
              <h2 className="text-4xl vibecheck_font_style leading-none">Deployment Log</h2>
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
          <div className="ringer-card p-6 sm:p-10">
            <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none mb-6">Your Community CRM</h2>
            
            {/* Metrics Strip */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-zinc-50 p-6 rounded-[24px] border border-black/5 hover:border-black/10 transition-colors shadow-sm">
                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-2">Total Contacts</p>
                <p className="text-3xl font-black italic text-black">{contacts.length}</p>
                <p className="text-[9px] text-zinc-400 mt-1 font-semibold">Followers & attendees</p>
              </div>
              <div className="bg-zinc-50 p-6 rounded-[24px] border border-black/5 hover:border-black/10 transition-colors shadow-sm">
                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-2">Active Followers</p>
                <p className="text-3xl font-black italic text-primary">{contacts.filter(c => c.is_follower).length}</p>
                <p className="text-[9px] text-zinc-400 mt-1 font-semibold">Direct audience</p>
              </div>
              <div className="bg-zinc-50 p-6 rounded-[24px] border border-black/5 hover:border-black/10 transition-colors shadow-sm">
                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-2">Repeat Attendees</p>
                <p className="text-3xl font-black italic text-[#EAB308]">{contacts.filter(c => c.rsvp_count >= 2).length}</p>
                <p className="text-[9px] text-zinc-400 mt-1 font-semibold">RSVP'd 2+ times</p>
              </div>
              <div className="bg-zinc-50 p-6 rounded-[24px] border border-black/5 hover:border-black/10 transition-colors shadow-sm">
                <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest mb-2">WhatsApp Reach</p>
                <p className="text-3xl font-black italic text-[#22C55E]">{contacts.filter(c => c.phone_number).length}</p>
                <p className="text-[9px] text-zinc-400 mt-1 font-semibold">With active phone numbers</p>
              </div>
            </div>

            {/* Search, Filter & Actions Bar */}
            <div className="flex flex-col xl:flex-row gap-4 mb-6 justify-between items-stretch xl:items-center">
              <div className="flex flex-col sm:flex-row gap-3 flex-1">
                <Input
                  placeholder="Search name, email, phone, notes, tags..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold flex-1"
                />
                <Select value={segmentFilter} onValueChange={(v: any) => setSegmentFilter(v)}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold text-black">
                    <SelectValue>
                      {segmentFilter === 'all' ? 'All Segments' : segmentFilter === 'followers' ? 'Followers Only' : 'Attendees Only'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white border-black/5 rounded-[20px] shadow-2xl p-2 z-50">
                    <SelectItem value="all" className="rounded-xl text-xs font-bold hover:bg-zinc-50 cursor-pointer text-black">All Segments</SelectItem>
                    <SelectItem value="followers" className="rounded-xl text-xs font-bold hover:bg-zinc-50 cursor-pointer text-black">Followers Only</SelectItem>
                    <SelectItem value="rsvp" className="rounded-xl text-xs font-bold hover:bg-zinc-50 cursor-pointer text-black">Attendees Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Select value={tagFilter} onValueChange={(val) => setTagFilter(val || "all")}>
                  <SelectTrigger className="w-full sm:w-[150px] bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold text-black">
                    <SelectValue>
                      {tagFilter === 'all' ? 'All Tags' : tagFilter}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white border-black/5 rounded-[20px] shadow-2xl p-2 z-50">
                    <SelectItem value="all" className="rounded-xl text-xs font-bold hover:bg-zinc-50 cursor-pointer text-black">All Tags</SelectItem>
                    {allUniqueTags.map(tag => (
                      <SelectItem key={tag} value={tag} className="rounded-xl text-xs font-bold hover:bg-zinc-50 cursor-pointer text-black">{tag}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={eventFilter} onValueChange={(val) => setEventFilter(val || "all")}>
                  <SelectTrigger className="w-full sm:w-[180px] bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold text-black">
                    <SelectValue>
                      {eventFilter === 'all' ? 'All Events' : eventFilter}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-white border-black/5 rounded-[20px] shadow-2xl p-2 z-50">
                    <SelectItem value="all" className="rounded-xl text-xs font-bold hover:bg-zinc-50 cursor-pointer text-black">All Events</SelectItem>
                    {myEvents.map(e => (
                      <SelectItem key={e.id} value={e.title} className="rounded-xl text-xs font-bold hover:bg-zinc-50 cursor-pointer text-black">{e.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  <button
                    onClick={handleExportCsv}
                    className="ringer-button border border-black/10 hover:bg-zinc-100 text-[10px] flex items-center gap-2 whitespace-nowrap"
                    title="Export CSV"
                  >
                    📋 EXPORT CSV
                  </button>
                  <button
                    onClick={openCrmBroadcast}
                    disabled={selectedEmails.length === 0}
                    className="ringer-button bg-primary text-black disabled:opacity-40 text-[10px] flex items-center gap-2 whitespace-nowrap"
                  >
                    📢 BROADCAST ({selectedEmails.length})
                  </button>
                </div>
              </div>
            </div>

            {crmLoading ? (
              <p className="p-12 text-zinc-400 text-xs font-black uppercase tracking-[0.2em] text-center animate-pulse">Synchronizing CRM contacts...</p>
            ) : filteredContacts.length === 0 ? (
              <div className="p-12 text-center text-zinc-400 font-bold italic text-sm">
                No contacts found matching your filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-[10px] font-black uppercase tracking-widest text-zinc-400 border-b border-black/5">
                    <tr>
                      <th className="px-4 py-3 w-[40px]">
                        <input
                          type="checkbox"
                          checked={isAllFilteredSelected}
                          onChange={toggleSelectAllFiltered}
                          className="rounded border-zinc-300 text-black focus:ring-black cursor-pointer h-4 w-4"
                        />
                      </th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Segment</th>
                      <th className="px-4 py-3">Phone / City</th>
                      <th className="px-4 py-3">Stats</th>
                      <th className="px-4 py-3">Tags & Notes</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContacts.map((c, i) => {
                      const initial = (c.name || c.email || '?').charAt(0).toUpperCase();
                      const tags = getTagsArray(c.tags);
                      
                      let badge = null;
                      if (c.is_follower && c.is_attendee) {
                        badge = <span className="sticker-badge bg-black text-[#C1FF00] border-black text-[9px] font-bold whitespace-nowrap">Follower & Attendee</span>;
                      } else if (c.is_follower) {
                        badge = <span className="sticker-badge bg-[#C1FF00]/15 text-black border-[#C1FF00]/30 text-[9px] font-bold whitespace-nowrap">Follower</span>;
                      } else {
                        badge = <span className="sticker-badge bg-zinc-100 text-zinc-800 border-zinc-200 text-[9px] font-bold whitespace-nowrap">Attendee</span>;
                      }

                      return (
                        <tr key={i} className="border-b border-black/5 last:border-0 hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedEmails.includes(c.email)}
                              onChange={() => toggleSelectEmail(c.email)}
                              className="rounded border-zinc-300 text-black focus:ring-black cursor-pointer h-4 w-4"
                            />
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#C1FF00]/25 to-zinc-200/25 flex items-center justify-center font-black italic text-xs border border-black/5 text-zinc-800">
                                {initial}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-black text-sm">{c.name || 'Anonymous User'}</span>
                                <span className="text-zinc-400 text-[10px] font-medium">{c.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">{badge}</td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-zinc-800 font-bold text-xs">{c.phone_number || <span className="text-zinc-300 italic font-medium">No Phone</span>}</span>
                              <span className="text-zinc-400 text-[10px] font-black uppercase tracking-wider">{c.city || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-col">
                              <span className="text-black font-black text-sm">{c.rsvp_count} <span className="text-[10px] text-zinc-400 font-normal lowercase">rsvps</span></span>
                              {c.last_rsvp_date && (
                                <span className="text-zinc-400 text-[9px] font-bold">Last: {new Date(c.last_rsvp_date).toLocaleDateString()}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 max-w-[200px]">
                            <div className="flex flex-col gap-1">
                              {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {tags.map(t => (
                                    <span key={t} className="px-1.5 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200 text-[8px] font-extrabold uppercase tracking-wide">{t}</span>
                                  ))}
                                </div>
                              )}
                              {c.notes ? (
                                <span className="text-zinc-600 text-xs truncate font-medium block" title={c.notes}>{c.notes}</span>
                              ) : (
                                <span className="text-zinc-300 text-xs italic block">No notes</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <button
                              onClick={() => {
                                setEditingContact(c);
                                setEditedNotes(c.notes || '');
                                setEditedTags(tags);
                              }}
                              className="ringer-button border border-black/5 hover:bg-zinc-100 p-1.5 px-3 text-[9px]"
                            >
                              ✏️ NOTES
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Floating Action Button (FAB) */}
      {activeTab === 'events' && (
        <button
          onClick={() => {
            setEditingEventId(null);
            setFormData({
              title: "", description: "", category: "", location: "", city: "", google_maps_link: "", timings: "",
              startDate: "", endDate: "", startTime: "", endTime: "",
              participantLimit: "", isPaid: false
            });
            setShowForm(true);
          }}
          className="fixed bottom-8 right-8 z-40 bg-gradient-to-br from-[#22C55E] to-[#16A34A] text-white h-14 w-14 hover:w-48 rounded-full flex items-center justify-center shadow-[0_10px_30px_rgba(34,197,94,0.4)] hover:scale-105 transition-all duration-300 ease-in-out border border-white/20 group overflow-hidden"
          title="Create New Vibe"
        >
          <div className="flex items-center justify-center whitespace-nowrap">
            <span className="text-3xl font-bold transition-transform duration-300 group-hover:rotate-90 shrink-0 select-none leading-none">+</span>
            <span className="text-[10px] font-black uppercase tracking-widest max-w-0 opacity-0 group-hover:max-w-[120px] group-hover:opacity-100 group-hover:ml-2 transition-all duration-300 ease-in-out select-none overflow-hidden">
              Create new Vibe
            </span>
          </div>
        </button>
      )}

      {/* Side-sheet Form Drawer Overlay */}
      {showForm && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleCancelEdit}
        >
          <div 
            className="w-full max-w-xl h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 border-l border-black/5"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-primary/5 border-b border-black/5 p-6 flex justify-between items-center shrink-0">
              <div>
                <h2 className="vibecheck_font_style text-2xl text-black">
                  {editingEventId ? "EDIT EVENT" : "NEW EVENT"}
                </h2>
                <p className="text-[10px] font-bold text-zinc-400 mt-1 uppercase">Awaiting platform guardian approval</p>
              </div>
              <button 
                type="button" 
                onClick={handleCancelEdit} 
                className="ringer-button border border-black/5 hover:bg-black/5 text-black text-[10px]"
              >
                CLOSE
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <form id="organizer-event-form" onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <Input name="title" placeholder="Event Title" value={formData.title} onChange={e => { setFormData({ ...formData, title: e.target.value }); if (errors.title) setErrors({ ...errors, title: false }) }} className={cn("bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold", errors.title && "border-red-500 ring-red-500/20")} />
                    {errors.title && <p className="text-[9px] text-red-500 font-black uppercase ml-1">Title is required</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Select value={formData.category} onValueChange={v => { setFormData({ ...formData, category: v || "" }); if (errors.category) setErrors({ ...errors, category: false }) }}>
                        <SelectTrigger className={cn("w-full bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold", errors.category && "border-red-500 ring-red-500/20")}>
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
                        <SelectTrigger className={cn("w-full bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold", errors.city && "border-red-500 ring-red-500/20")}>
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
                      onChange={v => { setFormData({ ...formData, startTime: v }); if (errors.startTime) setErrors({ ...errors, startTime: false }) }}
                      error={errors.startTime}
                    />
                    <VibeTimePicker
                      label="Ends At"
                      value={formData.endTime}
                      onChange={v => { setFormData({ ...formData, endTime: v }); if (errors.endTime) setErrors({ ...errors, endTime: false }) }}
                      error={errors.endTime}
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
              </form>
            </div>

            {/* Footer */}
            <div className="border-t border-black/5 p-6 bg-zinc-50 flex justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={handleCancelEdit} 
                className="ringer-button border border-black/5 hover:bg-black/5 text-black text-[10px]"
              >
                CANCEL
              </button>
              <button 
                type="submit" 
                form="organizer-event-form" 
                disabled={submitting} 
                className="ringer-button bg-gradient-to-br from-[#22C55E] to-[#16A34A] text-white hover:from-[#16A34A] hover:to-[#15803D] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-green-500/20 text-[10px]"
              >
                {submitting ? "SUBMITTING..." : editingEventId ? "SUBMIT EDITS" : "SUBMIT FOR REVIEW"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Notes Modal */}
      {editingContact && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditingContact(null)}>
          <div className="bg-white rounded-[40px] p-10 max-w-lg w-full shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200 text-black" onClick={e => e.stopPropagation()}>
            <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none mb-2">Edit Contact Details</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-6">CRM context for {editingContact.name || editingContact.email}</p>

            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Tags</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editedTags.map(tag => (
                    <span key={tag} className="sticker-badge bg-[#C1FF00]/10 text-black border-[#C1FF00]/20 flex items-center gap-2 text-[10px]">
                      {tag}
                      <button
                        onClick={() => setEditedTags(editedTags.filter(t => t !== tag))}
                        className="text-zinc-500 hover:text-black font-black font-sans"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  {editedTags.length === 0 && (
                    <span className="text-zinc-400 text-xs italic font-medium">No tags added yet.</span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom tag (e.g. VIP, Volunteer)"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (tagInput.trim() && !editedTags.includes(tagInput.trim())) {
                          setEditedTags([...editedTags, tagInput.trim()]);
                          setTagInput("");
                        }
                      }
                    }}
                    className="bg-zinc-50 border-black/5 focus:ring-primary rounded-xl text-xs font-bold flex-1 text-black"
                  />
                  <Button
                    onClick={() => {
                      if (tagInput.trim() && !editedTags.includes(tagInput.trim())) {
                        setEditedTags([...editedTags, tagInput.trim()]);
                        setTagInput("");
                      }
                    }}
                    className="bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-bold"
                  >
                    ADD
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block mb-2">Internal Notes</label>
                <Textarea
                  placeholder="Keep track of user details, preferences, special requests, history..."
                  value={editedNotes}
                  onChange={e => setEditedNotes(e.target.value)}
                  className="bg-zinc-50 border-black/5 text-black min-h-[120px] rounded-[20px] p-4 text-xs font-bold focus:ring-primary"
                />
              </div>

              <div className="flex gap-4 pt-4 border-t border-black/5">
                <button className="ringer-button flex-1 border border-black/5 hover:bg-black/5 text-black" onClick={() => setEditingContact(null)}>CANCEL</button>
                <button
                  className="ringer-button flex-1 bg-black text-white hover:bg-zinc-800"
                  onClick={handleSaveNotes}
                >
                  SAVE CHANGES
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CRM Selected Broadcast Modal */}
      {crmBroadcastOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setCrmBroadcastOpen(false)}>
          <div className="bg-white rounded-[40px] p-10 max-w-md w-full shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200 text-black" onClick={e => e.stopPropagation()}>
            <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none mb-2">Selective Outreach</h3>
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-8">Send custom WhatsApp update to selected contacts</p>

            <div className="bg-zinc-50 border border-black/5 p-6 rounded-[24px] mb-8">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Recipients Selected</span>
                <span className="font-black text-black">{selectedEmails.length}</span>
              </div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">WhatsApp Reachable</span>
                <span className="font-black text-[#22C55E]">{contacts.filter(c => selectedEmails.includes(c.email) && c.phone_number).length} of {selectedEmails.length}</span>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-black/5">
                <span className="text-[11px] font-black uppercase tracking-widest text-black">Total Investment (₹2/msg)</span>
                <span className="font-black text-primary text-xl">₹{contacts.filter(c => selectedEmails.includes(c.email) && c.phone_number).length * 2}</span>
              </div>
            </div>

            <Textarea
              placeholder="Write your custom message here..."
              className="bg-zinc-50 border-black/5 text-black mb-8 min-h-[120px] rounded-[20px] p-4 text-xs font-bold focus:ring-primary"
              value={crmBroadcastMsg}
              onChange={e => setCrmBroadcastMsg(e.target.value)}
            />

            {crmPaymentStatus === "processing" ? (
              <div className="ringer-button w-full bg-[#EAB308]/20 text-black text-center animate-pulse flex justify-center items-center gap-2">
                💳 Processing...
              </div>
            ) : crmBroadcasting ? (
              <div className="ringer-button w-full bg-primary text-black text-center animate-pulse flex justify-center items-center gap-2">
                📲 Sending...
              </div>
            ) : (
              <div className="flex gap-4">
                <button className="ringer-button flex-1 border border-black/5 hover:bg-black/5 text-black" onClick={() => setCrmBroadcastOpen(false)}>CANCEL</button>
                <button
                  className="ringer-button flex-1 bg-black text-white hover:bg-zinc-800 disabled:opacity-30"
                  onClick={handleCrmPayAndSend}
                  disabled={selectedEmails.length === 0 || !crmBroadcastMsg.trim()}
                >
                  PAY & SEND
                </button>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
