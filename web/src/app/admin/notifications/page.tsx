"use client";

import { useEffect, useState } from "react";
import { Bell, Sparkles, MapPin, Calendar, Trash2, Send, Plus, Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

interface BroadcastNotification {
  id: string;
  type: "global" | "city" | "event";
  target_city: string | null;
  target_event_id: string | null;
  event_title?: string | null;
  title: string;
  message: string;
  action_text: string | null;
  action_href: string | null;
  created_at: string;
  expires_at: string | null;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<BroadcastNotification[]>([]);
  const [cities, setCities] = useState<{ id: string; name: string }[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string; city: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [type, setType] = useState<"global" | "city" | "event">("global");
  const [targetCity, setTargetCity] = useState("");
  const [targetEventId, setTargetEventId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [actionText, setActionText] = useState("");
  const [actionHref, setActionHref] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("7");

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const loadData = async () => {
    try {
      const [notifsRes, citiesRes, eventsRes] = await Promise.all([
        fetch(`${baseUrl}/api/admin/notifications`),
        fetch(`${baseUrl}/api/cities`),
        fetch(`${baseUrl}/api/events?limit=50`),
      ]);

      const notifsData = await notifsRes.json();
      const citiesData = await citiesRes.json();
      const eventsData = await eventsRes.json();

      if (notifsData.success && Array.isArray(notifsData.data)) {
        setNotifications(notifsData.data);
      }
      if (Array.isArray(citiesData)) {
        setCities(citiesData);
        if (citiesData.length > 0) setTargetCity(citiesData[0].name);
      }
      if (eventsData.events && Array.isArray(eventsData.events)) {
        setEvents(eventsData.events);
      }
    } catch (err) {
      console.error("Failed to load notifications data:", err);
      toast.error("Failed to load broadcast notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          target_city: type === "city" ? targetCity : null,
          target_event_id: type === "event" ? targetEventId : null,
          title: title.trim(),
          message: message.trim(),
          action_text: actionText.trim() || undefined,
          action_href: actionHref.trim() || undefined,
          expires_in_days: expiresInDays ? Number(expiresInDays) : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Broadcast notification published!");
        setTitle("");
        setMessage("");
        setActionText("");
        setActionHref("");
        loadData();
      } else {
        toast.error(data.error || "Failed to publish broadcast");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error creating notification");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this broadcast notification?")) return;
    try {
      const res = await fetch(`${baseUrl}/api/admin/notifications/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Notification deleted");
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      } else {
        toast.error(data.error || "Failed to delete notification");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error deleting notification");
    }
  };

  return (
    <div className="space-y-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="border-b border-black/5 pb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-600">
            <Radio className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase leading-[0.9]">
              Broadcast Center
            </h1>
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
              Send Themed Pop-Up Notifications (Global, City Alerts, Event Spotlights)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="sticker-badge bg-black text-white text-[10px] py-1 px-3">
            {notifications.length} Active Broadcasts
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Create Broadcast Form */}
        <div className="lg:col-span-5">
          <Card className="ringer-card p-6 sm:p-8 bg-white border border-black/5 shadow-xl sticky top-6">
            <div className="flex items-center gap-2 mb-6 border-b border-black/5 pb-4">
              <Plus className="h-4 w-4 text-primary" />
              <h2 className="text-xs font-black uppercase tracking-widest text-black">
                Create New Broadcast
              </h2>
            </div>

            <form onSubmit={handleCreate} className="space-y-5 text-left">
              {/* Type Switcher */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  Broadcast Scope / Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType("global")}
                    className={`p-3 rounded-2xl border text-xs font-black uppercase tracking-wider flex flex-col items-center gap-1.5 transition-all ${
                      type === "global"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                        : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-black/5"
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Global</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType("city")}
                    className={`p-3 rounded-2xl border text-xs font-black uppercase tracking-wider flex flex-col items-center gap-1.5 transition-all ${
                      type === "city"
                        ? "bg-amber-500 text-black border-amber-500 shadow-md"
                        : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-black/5"
                    }`}
                  >
                    <MapPin className="h-4 w-4" />
                    <span>City Alert</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setType("event")}
                    className={`p-3 rounded-2xl border text-xs font-black uppercase tracking-wider flex flex-col items-center gap-1.5 transition-all ${
                      type === "event"
                        ? "bg-pink-600 text-white border-pink-600 shadow-md"
                        : "bg-zinc-50 hover:bg-zinc-100 text-zinc-600 border-black/5"
                    }`}
                  >
                    <Calendar className="h-4 w-4" />
                    <span>Event Spotlight</span>
                  </button>
                </div>
              </div>

              {/* Target City Selector (if city) */}
              {type === "city" && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                    Target City
                  </label>
                  <select
                    value={targetCity}
                    onChange={(e) => setTargetCity(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 border border-black/10 text-xs font-bold focus:ring-2 focus:ring-amber-400 focus:outline-none"
                  >
                    {cities.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Target Event Selector (if event) */}
              {type === "event" && (
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                    Target Event
                  </label>
                  <select
                    value={targetEventId}
                    onChange={(e) => setTargetEventId(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 border border-black/10 text-xs font-bold focus:ring-2 focus:ring-pink-400 focus:outline-none"
                  >
                    <option value="">Select an event...</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.city})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                  Notification Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Flash Drop: Weekend Techno Pass"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 border border-black/10 text-xs font-bold focus:ring-2 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                  Full Notification Message
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter full details that will appear in the pop-up modal when clicked..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 border border-black/10 text-xs font-medium focus:ring-2 focus:ring-primary focus:outline-none resize-none"
                />
              </div>

              {/* Action Button Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                    Action Button Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. View Pass / RSVP"
                    value={actionText}
                    onChange={(e) => setActionText(e.target.value)}
                    className="w-full px-4 py-2 rounded-2xl bg-zinc-50 border border-black/10 text-xs font-medium focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                    Action URL
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. /dashboard?view=calendar"
                    value={actionHref}
                    onChange={(e) => setActionHref(e.target.value)}
                    className="w-full px-4 py-2 rounded-2xl bg-zinc-50 border border-black/10 text-xs font-medium focus:outline-none"
                  />
                </div>
              </div>

              {/* Expiry */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                  Active Duration (Days)
                </label>
                <select
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-zinc-50 border border-black/10 text-xs font-bold focus:outline-none"
                >
                  <option value="1">1 Day</option>
                  <option value="3">3 Days</option>
                  <option value="7">7 Days (Default)</option>
                  <option value="14">14 Days</option>
                  <option value="30">30 Days</option>
                </select>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full ringer-button bg-black text-white hover:bg-zinc-800 h-11 text-xs uppercase tracking-widest font-black flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4 text-primary" />
                {submitting ? "Publishing..." : "PUBLISH BROADCAST"}
              </Button>
            </form>
          </Card>
        </div>

        {/* Active Broadcasts List */}
        <div className="lg:col-span-7 space-y-4 text-left">
          <div className="flex items-center justify-between border-b border-black/5 pb-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">
              Live Broadcasts & Notifications
            </h2>
            <span className="text-[10px] font-bold text-zinc-400">
              {notifications.length} alerts
            </span>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-zinc-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-black/5">
              <Bell className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-sm font-black uppercase tracking-wider text-zinc-500">
                No active broadcasts
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Publish a global, city, or event notification to alert users across the web app.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {notifications.map((notif) => {
                const isGlobal = notif.type === "global";
                const isCity = notif.type === "city";
                const isEvent = notif.type === "event";

                return (
                  <Card
                    key={notif.id}
                    className={`ringer-card overflow-hidden bg-white border-2 transition-all ${
                      isGlobal
                        ? "border-indigo-200 shadow-indigo-100"
                        : isCity
                          ? "border-amber-200 shadow-amber-100"
                          : "border-pink-200 shadow-pink-100"
                    }`}
                  >
                    <CardContent className="p-6 space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              isGlobal
                                ? "bg-indigo-600 text-white"
                                : isCity
                                  ? "bg-amber-500 text-black"
                                  : "bg-pink-600 text-white"
                            }`}
                          >
                            {isGlobal
                              ? "Global Broadcast"
                              : isCity
                                ? `City · ${notif.target_city}`
                                : `Event Spotlight`}
                          </span>
                          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                            {new Date(notif.created_at).toLocaleDateString()}
                          </span>
                        </div>

                        <button
                          onClick={() => handleDelete(notif.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                          title="Delete Broadcast"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div>
                        <h3 className="text-base font-black text-black leading-tight">
                          {notif.title}
                        </h3>
                        <p className="text-xs font-medium text-zinc-600 mt-1 leading-relaxed line-clamp-3">
                          {notif.message}
                        </p>
                      </div>

                      {notif.action_text && (
                        <div className="pt-2 flex items-center justify-between border-t border-black/5 text-[10px]">
                          <span className="font-bold text-zinc-400">
                            Action: <span className="text-black font-black">{notif.action_text}</span> → {notif.action_href || "Default"}
                          </span>
                          {notif.expires_at && (
                            <span className="text-zinc-400 font-bold">
                              Expires: {new Date(notif.expires_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
