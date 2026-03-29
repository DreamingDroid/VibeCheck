"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Event Management
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Create, edit, and delete events.</p>
        </div>
        <Button
          onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(v => !v); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
        >
          {showForm ? "✕ Cancel" : "+ New Event"}
        </Button>
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <Card className="bg-zinc-900 border-zinc-800 border-indigo-500/30">
          <CardHeader>
            <CardTitle className="text-white text-base">
              {editingId ? "✏️ Edit Event" : "✨ New Event"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 space-y-1">
                <Label className="text-zinc-300">Title *</Label>
                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required placeholder="Event title" className="bg-zinc-950 border-zinc-700 text-white" />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label className="text-zinc-300">Description *</Label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  required rows={3} placeholder="Describe the event..."
                  className="w-full px-3 py-2 rounded-md bg-zinc-950 border border-zinc-700 text-white text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-300">Category *</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v || "General" }))}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-300">Date & Time *</Label>
                <Input type="datetime-local" value={form.date_time}
                  onChange={e => setForm(f => ({ ...f, date_time: e.target.value }))}
                  required className="bg-zinc-950 border-zinc-700 text-white [color-scheme:dark]" />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-300">Location</Label>
                <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Venue, City" className="bg-zinc-950 border-zinc-700 text-white" />
              </div>
              <div className="space-y-1">
                <Label className="text-zinc-300">Contact Info</Label>
                <Input value={form.contact_info} onChange={e => setForm(f => ({ ...f, contact_info: e.target.value }))}
                  placeholder="+91 9876543210" className="bg-zinc-950 border-zinc-700 text-white" />
              </div>
              <div className="md:col-span-2 space-y-1">
                <Label className="text-zinc-300">External Link</Label>
                <Input value={form.external_link} onChange={e => setForm(f => ({ ...f, external_link: e.target.value }))}
                  placeholder="https://..." className="bg-zinc-950 border-zinc-700 text-white" />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={saving}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-8">
                  {saving ? "Saving..." : editingId ? "Update Event" : "Create Event"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Events Table */}
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white text-base">All Events ({events.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-zinc-500 animate-pulse">Loading events...</div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center text-zinc-600">No events yet. Create your first one above!</div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {events.map(ev => (
                <div key={ev.id} className="flex items-start justify-between p-4 hover:bg-zinc-800/40 transition-colors gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="border-indigo-500/30 text-indigo-400 bg-indigo-500/10 text-xs shrink-0">
                        {ev.category}
                      </Badge>
                      <h3 className="text-white font-medium truncate">{ev.title}</h3>
                    </div>
                    <p className="text-zinc-500 text-xs line-clamp-1">{ev.description}</p>
                    <p className="text-zinc-600 text-xs mt-1">
                      📅 {new Date(ev.date_time).toLocaleString()} · 📍 {ev.location || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline"
                      onClick={() => handleEdit(ev)}
                      className="border-zinc-700 text-zinc-300 hover:bg-zinc-700 h-8 px-3 text-xs">
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive"
                      onClick={() => handleDelete(ev.id)}
                      className="h-8 px-3 text-xs">
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
