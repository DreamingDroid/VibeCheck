"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit3, Trash2, Calendar, MapPin, ExternalLink, Phone, FileText } from "lucide-react";

const CATEGORIES = ["Sports", "Arts", "Education", "Spiritual", "Music", "Food", "Wellness", "Indie", "Techno", "General"];

type Event = {
  id: string; title: string; description: string; category: string;
  location: string; date_time: string; external_link: string; contact_info: string;
};

const emptyForm = { title: "", description: "", category: "General", location: "", date_time: "", external_link: "", contact_info: "" };

export default function AdminEventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchEvents = () => {
    setLoading(true);
    fetch("http://localhost:4000/api/admin/events")
      .then(r => r.json())
      .then(data => { if (data.success) setEvents(data.data); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchEvents(); }, []);

  const handleEdit = (ev: Event) => {
    setForm({
      title: ev.title, description: ev.description, category: ev.category,
      location: ev.location || "", date_time: ev.date_time?.slice(0, 16) || "",
      external_link: ev.external_link || "", contact_info: ev.contact_info || "",
    });
    setEditingId(ev.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this event permanently?")) return;
    await fetch(`http://localhost:4000/api/admin/events/${id}`, { method: "DELETE" });
    fetchEvents();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `http://localhost:4000/api/admin/events/${editingId}` : "http://localhost:4000/api/admin/events";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, date_time: new Date(form.date_time).toISOString() }),
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
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required placeholder="Enter Catchy Vibe Title" className="bg-white border-black/5 h-12 text-sm font-bold uppercase tracking-tight rounded-xl focus:ring-primary" />
              </div>
              
              <div className="md:col-span-2 space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Editorial Description</Label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required rows={4} placeholder="What's the energy like?"
                  className="w-full px-4 py-3 rounded-2xl bg-white border border-black/5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v || "General" }))}>
                  <SelectTrigger className="bg-white border-black/5 h-12 rounded-xl text-xs font-bold uppercase tracking-widest">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-black/5">
                    {CATEGORIES.map(c => <SelectItem key={c} value={c} className="text-xs font-bold uppercase tracking-widest">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Temporal Coordinates</Label>
                <Input type="datetime-local" value={form.date_time}
                  onChange={e => setForm(f => ({ ...f, date_time: e.target.value }))}
                  required className="bg-white border-black/5 h-12 rounded-xl text-xs font-bold" />
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

      {/* Events List */}
      <div className="space-y-6 pb-20">
        <h2 className="text-black text-xs font-black uppercase tracking-[0.2em] px-2 flex items-center gap-2">
          <FileText className="h-4 w-4 text-zinc-400" />
          Active Inventory ({events.length})
        </h2>

        {loading ? (
          <div className="p-12 text-center text-zinc-400 text-xs font-black uppercase tracking-widest animate-pulse">Scanning database frequencies...</div>
        ) : events.length === 0 ? (
          <div className="ringer-card p-20 text-center text-zinc-400 text-xs font-bold italic">No vibrations detected in the catalog.</div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {events.map(ev => (
              <div key={ev.id} className="ringer-card group bg-white border-black/5 p-6 hover:shadow-xl transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="sticker-badge bg-black text-white px-3 flex items-center gap-1">
                      {ev.category}
                    </div>
                    <h3 className="text-2xl font-black italic tracking-tighter uppercase leading-none group-hover:text-primary transition-colors">{ev.title}</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-x-6 gap-y-2 items-center text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    <span className="flex items-center gap-1.5"><Calendar className="h-3 w-3 text-primary" /> {new Date(ev.date_time).toLocaleString()}</span>
                    <span className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-primary" /> {ev.location || "FIELD UNKNOWN"}</span>
                    {ev.contact_info && <span className="flex items-center gap-1.5 line-clamp-1"><Phone className="h-3 w-3" /> {ev.contact_info}</span>}
                    {ev.external_link && <span className="flex items-center gap-1.5 text-primary underline"><ExternalLink className="h-3 w-3" /> LINK</span>}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
