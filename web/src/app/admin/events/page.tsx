"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit3, Trash2, Calendar, MapPin, ExternalLink, Phone, FileText, ChevronDown, ChevronUp } from "lucide-react";
import { VibeTimePicker } from "@/components/vibe-time-picker";
import { VibeDatePicker } from "@/components/vibe-date-picker";
import { toast } from "sonner";
import { vibeConfirm } from "@/components/vibe-confirm";

const CATEGORIES = ["Sports", "Arts", "Education", "Spiritual", "Music", "Food", "Wellness", "Indie", "Techno", "General"];

const TIME_SLOTS = Array.from({ length: 48 }).map((_, i) => {
  const hour = Math.floor(i / 2);
  const min = i % 2 === 0 ? "00" : "30";
  const ampm = hour < 12 ? "AM" : "PM";
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${min} ${ampm}`;
});

type Event = {
  id: string; title: string; description: string; category: string;
  location: string; date_time: string; end_time?: string; timings?: string; external_link: string; contact_info: string;
  status?: string; admin_comment?: string; organizer_email?: string; venue_type?: string;
};

const emptyForm = { 
  title: "", description: "", category: "General", location: "", 
  startDate: "", endDate: "", startTime: "08:00 PM", endTime: "11:00 PM",
  timings: "", external_link: "", contact_info: "", venue_type: "Indoor" 
};

function AdminEventsPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = searchParams.get("tab");

  const [isMultiDay, setIsMultiDay] = useState(false);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [activeTab, setActiveTab] = useState(tabParam || "approved");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Review Dialogue Modal State
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    id: string | null;
    status: "rejected" | "needs_changes" | null;
  }>({ isOpen: false, id: null, status: null });
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/admin/events?tab=${tabId}`);
  };

  const fetchEvents = () => {
    setLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    let url = `${baseUrl}/api/admin/events/status/${activeTab}`;
    if (activeTab === 'rejected') url += '?days=30';
    
    fetch(url)
      .then(r => r.json())
      .then(data => { if (data.success) setEvents(data.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { 
    fetchEvents(); 
    setExpandedId(null);
  }, [activeTab]);

  const handleEdit = (ev: Event) => {
    const start = new Date(ev.date_time);
    const end = ev.end_time ? new Date(ev.end_time) : new Date(start.getTime() + 3*3600*1000);
    
    // Format helpers
    const fDate = (d: Date) => d.toISOString().split("T")[0];
    const fTime = (d: Date) => {
      let h = d.getHours();
      const m = d.getMinutes() >= 30 ? "30" : "00";
      const ampm = h >= 12 ? "PM" : "AM";
      if (h > 12) h -= 12;
      if (h === 0) h = 12;
      return `${h}:${m} ${ampm}`;
    };

    const multi = fDate(start) !== fDate(end);
    setIsMultiDay(multi);

    setForm({
      title: ev.title, description: ev.description, category: ev.category,
      location: ev.location || "", 
      startDate: fDate(start),
      endDate: fDate(end),
      startTime: fTime(start),
      endTime: fTime(end),
      timings: ev.timings || "",
      external_link: ev.external_link || "", contact_info: ev.contact_info || "",
      venue_type: ev.venue_type || "Indoor"
    });
    setEditingId(ev.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    const confirmed = await vibeConfirm({
      title: "Delete Event?",
      message: "This action is permanent and cannot be undone. All RSVPs for this event will also be removed.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    await fetch(`${baseUrl}/api/admin/events/${id}`, { method: "DELETE" });
    toast.success("Event deleted.");
    fetchEvents();
  };

  const handleReview = async (id: string, status: string) => {
    if (status === "rejected" || status === "needs_changes") {
      setReviewModal({
        isOpen: true,
        id,
        status: status as "rejected" | "needs_changes",
      });
      setReviewComment("");
      return;
    }

    // Approved flow
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const response = await fetch(`${baseUrl}/api/admin/events/${id}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, comment: "" })
      });
      const data = await response.json();
      if (data.success) {
        toast.success("Event approved and published successfully.");
        fetchEvents();
      } else {
        toast.error("Failed to approve event.");
      }
    } catch (err) {
      toast.error("An error occurred during approval.");
    }
  };

  const handleReviewSubmit = async () => {
    if (!reviewModal.id || !reviewModal.status || !reviewComment) return;
    setReviewLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    try {
      const response = await fetch(`${baseUrl}/api/admin/events/${reviewModal.id}/review`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: reviewModal.status, comment: reviewComment })
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Event status updated to ${reviewModal.status.replace("_", " ")}.`);
        setReviewModal({ isOpen: false, id: null, status: null });
        setReviewComment("");
        fetchEvents();
      } else {
        toast.error("Failed to update event status.");
      }
    } catch (err) {
      toast.error("An error occurred during status update.");
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    const newErrors: Record<string, boolean> = {};
    if (!form.title) newErrors.title = true;
    if (!form.startDate) newErrors.startDate = true;
    if (isMultiDay && !form.endDate) newErrors.endDate = true;
    if (!form.category) newErrors.category = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setSaving(true);
    const method = editingId ? "PUT" : "POST";
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const url = editingId ? `${baseUrl}/api/admin/events/${editingId}` : `${baseUrl}/api/admin/events`;
    const combine = (date: string, timeStr: string) => {
      const [time, ampm] = timeStr.split(" ");
      let [hours, mins] = time.split(":").map(Number);
      if (ampm === "PM" && hours < 12) hours += 12;
      if (ampm === "AM" && hours === 12) hours = 0;
      const d = new Date(date);
      d.setHours(hours, mins, 0, 0);
      return d.toISOString();
    };

    const start_iso = combine(form.startDate, form.startTime);
    const end_iso = combine(isMultiDay ? form.endDate : form.startDate, form.endTime);

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        ...form, 
        date_time: start_iso,
        end_time: end_iso
      }),
    });
    setSaving(false);
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
    fetchEvents();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-black/5 pb-10">
        <div>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-[0.9]">
            Vibe Catalog
          </h1>
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Inventory Management of Experiences</p>
        </div>
        <button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(v => !v); }}
          className={`ringer-button px-8 py-4 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl ${
            showForm ? 'bg-zinc-100 text-zinc-400' : 'bg-black text-white hover:bg-zinc-800'
          }`}
        >
          {showForm ? "CANCEL OPERATION" : "INITIALIZE NEW VIBE +"}
        </button>
      </div>

      {/* Create / Edit Form Card */}
      {showForm && (
        <Card className="ringer-card bg-zinc-50 border-primary shadow-2xl scale-100 animate-in zoom-in-95 duration-300">
          <CardHeader className="bg-white border-b border-black/5 rounded-t-[40px] px-8 py-6">
            <CardTitle className="text-black text-xs font-black uppercase tracking-widest flex items-center gap-3">
              <Plus className="h-5 w-5 text-primary" />
              {editingId ? "Re-Authoring Vibe" : "Authoring New Vibe"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8 sm:p-12">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Event Title</Label>
                <Input value={form.title} onChange={e => {setForm(f => ({ ...f, title: e.target.value })); if(errors.title) setErrors({...errors, title: false})}}
                  placeholder="Vibe Title" className={cn("bg-white border-black/5 h-12 rounded-xl text-xs font-bold", errors.title && "border-red-500 ring-red-500/20")} />
              </div>
              
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Editorial Description</Label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required rows={4} placeholder="What's the energy like?"
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-black/5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Category</Label>
                <Select value={form.category} onValueChange={v => {setForm(f => ({ ...f, category: v || "" })); if(errors.category) setErrors({...errors, category: false})}}>
                  <SelectTrigger className={cn("bg-white border-black/5 h-12 rounded-xl text-xs font-bold uppercase tracking-widest", errors.category && "border-red-500 ring-red-500/20")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-black/5">
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs font-bold uppercase tracking-widest">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Venue Type</Label>
                <Select value={form.venue_type} onValueChange={v => setForm(f => ({ ...f, venue_type: v || "Indoor" }))}>
                  <SelectTrigger className="bg-white border-black/5 h-12 rounded-xl text-xs font-bold uppercase tracking-widest">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-black/5">
                    <SelectItem value="Indoor" className="text-xs font-bold uppercase tracking-widest">Indoor</SelectItem>
                    <SelectItem value="Outdoor" className="text-xs font-bold uppercase tracking-widest">Outdoor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-4">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Scheduling Logic</Label>
                <div className="flex bg-white p-1 rounded-xl border border-black/5 divide-x divide-black/5">
                  <button 
                    type="button"
                    onClick={() => setIsMultiDay(false)}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${!isMultiDay ? 'bg-black text-white' : 'text-zinc-400 hover:text-black'}`}
                  >
                    Single Day
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsMultiDay(true)}
                    className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest transition-all ${isMultiDay ? 'bg-black text-white' : 'text-zinc-400 hover:text-black'}`}
                  >
                    Multi Day
                  </button>
                </div>
              </div>

              <VibeDatePicker 
                label={isMultiDay ? "From Date" : "Date Coordinate"}
                value={form.startDate}
                onChange={v => {setForm(f => ({ ...f, startDate: v })); if(errors.startDate) setErrors({...errors, startDate: false})}}
                error={errors.startDate}
              />

              {isMultiDay && (
                <VibeDatePicker 
                  label="To Date"
                  value={form.endDate}
                  onChange={v => {setForm(f => ({ ...f, endDate: v })); if(errors.endDate) setErrors({...errors, endDate: false})}}
                  error={errors.endDate}
                />
              )}

              <VibeTimePicker 
                label="Begins At"
                value={form.startTime}
                onChange={v => setForm(f => ({ ...f, startTime: v }))}
              />

              <VibeTimePicker 
                label="Ends At"
                value={form.endTime}
                onChange={v => setForm(f => ({ ...f, endTime: v }))}
              />

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Event Timings Note</Label>
                <Input value={form.timings}
                  onChange={e => setForm(f => ({ ...f, timings: e.target.value }))}
                  placeholder="e.g. 10 PM - 3 AM" className="bg-white border-black/5 h-12 rounded-xl text-xs font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Venue Coordinates</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Venue & Address" className="bg-white border-black/5 h-12 rounded-xl text-xs font-bold" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Contact Frequencies</Label>
                <Input value={form.contact_info} onChange={e => setForm(f => ({ ...f, contact_info: e.target.value }))}
                  placeholder="+91 000 000 0000" className="bg-white border-black/5 h-12 rounded-xl text-xs font-bold" />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">External Linkages</Label>
                <Input value={form.external_link} onChange={e => setForm(f => ({ ...f, external_link: e.target.value }))}
                  placeholder="https://..." className="bg-white border-black/5 h-12 rounded-xl text-xs font-bold" />
              </div>

              <div className="md:col-span-2 flex justify-end pt-4">
                <button type="submit" disabled={saving}
                  className="ringer-button bg-black text-white px-12 py-4 text-[10px] font-black tracking-widest uppercase">
                  {saving ? "SYNCHRONIZING..." : editingId ? "PUBLISH UPDATES" : "STORE NEW VIBE"}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex overflow-x-auto space-x-2 pb-2 no-scrollbar">
        {[
          { id: 'approved', label: 'Active Inventory' },
          { id: 'pending', label: 'Pending Review' },
          { id: 'needs_changes', label: 'Awaiting Changes' },
          { id: 'rejected', label: 'Rejected (30d)' },
        ].map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => handleTabChange(tab.id)}
            className={`px-6 py-3 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-black text-white shadow-md'
                : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-black'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-6 pb-20">
        <h2 className="text-black text-xs font-black uppercase tracking-[0.2em] px-2 flex items-center gap-2">
          <FileText className="h-4 w-4 text-zinc-400" />
          {activeTab === 'approved' && 'Active Inventory'}
          {activeTab === 'pending' && 'Pending Review'}
          {activeTab === 'needs_changes' && 'Awaiting Organizer Changes'}
          {activeTab === 'rejected' && 'Recently Rejected'}
          <span className="text-zinc-400 ml-1">({events.length})</span>
        </h2>

        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-xs font-black uppercase tracking-widest animate-pulse">Scanning database frequencies...</div>
        ) : events.length === 0 ? (
          <div className="ringer-card p-20 text-center text-zinc-400 text-xs font-bold italic">No vibes detected in this category.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {events.map(ev => {
              const isExpanded = expandedId === ev.id;
              return (
                <div 
                  key={ev.id} 
                  className={cn(
                    "ringer-card group bg-white border-black/5 p-6 hover:shadow-xl transition-all flex flex-col gap-6 cursor-pointer",
                    isExpanded && "border-primary/50 shadow-lg"
                  )}
                  onClick={() => setExpandedId(isExpanded ? null : ev.id)}
                >
                  {/* Top Header Row (always visible) */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="flex-1 min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="sticker-badge bg-black text-white px-3 flex items-center gap-1">
                          {ev.category}
                        </div>
                        <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-none group-hover:text-primary transition-colors">
                          {ev.title}
                        </h3>
                      </div>
                      
                      <div className="flex flex-wrap gap-x-6 gap-y-2 items-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3 text-primary" /> {new Date(ev.date_time).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-primary" /> {ev.location || "FIELD UNKNOWN"}
                        </span>
                        {ev.organizer_email && (
                          <span className="flex items-center gap-1.5">
                            <span className="font-bold text-black">BY:</span> {ev.organizer_email}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons or expand/collapse indicator */}
                    <div className="flex items-center gap-3 shrink-0" onClick={e => e.stopPropagation()}>
                      {!isExpanded ? (
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 group-hover:text-black flex items-center gap-1.5">
                          SHOW DETAILS <ChevronDown className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="text-[10px] font-black uppercase tracking-widest text-black flex items-center gap-1.5">
                          HIDE DETAILS <ChevronUp className="h-4 w-4" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Section */}
                  {isExpanded && (
                    <div className="border-t border-black/5 pt-6 space-y-6 animate-in fade-in duration-300" onClick={e => e.stopPropagation()}>
                      {/* Description / Vibe Manifest */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Vibe Description</h4>
                        <p className="text-sm font-semibold text-zinc-800 leading-relaxed whitespace-pre-wrap">
                          {ev.description || "No description provided."}
                        </p>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50/50 p-6 rounded-[24px] border border-black/5 text-xs font-bold text-zinc-600">
                        <div className="space-y-3">
                          {ev.timings && (
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-zinc-400 block mb-1">timings note</span>
                              <span className="text-zinc-800 font-black">{ev.timings}</span>
                            </div>
                          )}
                          {ev.end_time && (
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-zinc-400 block mb-1">end time coordinate</span>
                              <span className="text-zinc-800 font-black">{new Date(ev.end_time).toLocaleString()}</span>
                            </div>
                          )}
                          {ev.contact_info && (
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-zinc-400 block mb-1">contact frequency</span>
                              <span className="text-zinc-800 font-black flex items-center gap-1.5 select-all"><Phone className="h-3.5 w-3.5 text-primary" /> {ev.contact_info}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          {ev.external_link && (
                            <div>
                              <span className="text-[9px] uppercase tracking-wider text-zinc-400 block mb-1">external linkage</span>
                              <a href={ev.external_link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-black flex items-center gap-1.5 break-all">
                                <ExternalLink className="h-3.5 w-3.5" /> {ev.external_link}
                              </a>
                            </div>
                          )}
                          <div>
                            <span className="text-[9px] uppercase tracking-wider text-zinc-400 block mb-1">venue coordinates</span>
                            <span className="text-zinc-800 font-black flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> {ev.location || "None"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Rejection comment / admin comment */}
                      {ev.admin_comment && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-4 rounded-2xl">
                          <span className="font-black uppercase tracking-widest text-[9px] block mb-1">Admin Feedback:</span>
                          {ev.admin_comment}
                        </div>
                      )}

                      {/* Action buttons inside expanded card */}
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-black/5">
                        <div className="flex items-center gap-3">
                          {activeTab === 'pending' && (
                            <>
                              <button onClick={() => handleReview(ev.id, 'approved')} className="ringer-button bg-primary text-black text-[10px] flex items-center gap-2">
                                APPROVE & PUBLISH
                              </button>
                              <button onClick={() => handleReview(ev.id, 'needs_changes')} className="ringer-button bg-orange-500 text-white text-[10px] flex items-center gap-2">
                                REQUEST CHANGES
                              </button>
                              <button onClick={() => handleReview(ev.id, 'rejected')} className="ringer-button bg-destructive text-white text-[10px] flex items-center gap-2">
                                REJECT SUBMISSION
                              </button>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => handleEdit(ev)}
                            className="ringer-button bg-zinc-50 border border-black/5 hover:bg-black hover:text-white text-black text-[10px] flex items-center gap-2"
                          >
                            <Edit3 className="h-3 w-3" /> EDIT
                          </button>
                          <button 
                            onClick={() => handleDelete(ev.id)}
                            className="ringer-button bg-zinc-50 border border-black/5 hover:bg-red-500 hover:text-white text-black text-[10px] flex items-center gap-2"
                          >
                            <Trash2 className="h-3 w-3" /> DELETE
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Review Modal */}
      {reviewModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black italic tracking-tighter uppercase mb-2">
              {reviewModal.status === "rejected" ? "Reject Submission" : "Request Changes"}
            </h2>
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
              {reviewModal.status === "rejected" ? "Provide feedback for rejection" : "Specify changes required from organizer"}
            </p>
            <textarea
              value={reviewComment}
              onChange={(e) => setReviewComment(e.target.value)}
              placeholder={reviewModal.status === "rejected" ? "Reason for rejection..." : "Changes needed..."}
              className="w-full h-36 p-4 text-xs bg-zinc-50 border border-black/10 rounded-2xl mb-6 font-medium focus:outline-none focus:border-black/30 resize-none text-black"
            />
            <div className="flex gap-4">
              <Button
                onClick={handleReviewSubmit}
                disabled={reviewLoading || !reviewComment}
                className="flex-1 bg-black text-white uppercase text-xs font-black h-12 rounded-xl"
              >
                Confirm
              </Button>
              <Button
                onClick={() => setReviewModal({ isOpen: false, id: null, status: null })}
                disabled={reviewLoading}
                variant="outline"
                className="flex-1 uppercase text-xs font-black h-12 rounded-xl border border-black/10 hover:bg-black/5 text-black bg-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminEventsPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-zinc-400 text-xs font-black uppercase tracking-widest animate-pulse">Scanning database frequencies...</div>}>
      <AdminEventsPageContent />
    </Suspense>
  );
}
