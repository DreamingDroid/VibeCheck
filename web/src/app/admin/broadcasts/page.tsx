"use client";

import { useEffect, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Radio,
  Sparkles,
  Send,
  Users,
  MapPin,
  Calendar,
  Tag,
  Globe,
  AlertTriangle,
  Clock,
  CalendarDays,
  XCircle,
  Megaphone,
  CheckCircle2,
  Filter,
  History,
  Eye,
  ArrowRight,
  RefreshCw,
  BellRing
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { vibeConfirm } from "@/components/vibe-confirm";
import {
  BroadcastType,
  BroadcastScope,
  BroadcastMessage,
  BROADCAST_TYPE_CONFIGS
} from "@/types/broadcast";

const CATEGORIES = [
  "Music",
  "Arts",
  "Sports",
  "Food",
  "Wellness",
  "Indie",
  "Techno",
  "Education",
  "Spiritual",
  "General",
];

const TEMPLATES: Record<BroadcastType, { title: string; body: string }> = {
  general_update: {
    title: "Exciting New Community Features on VibeCheck",
    body: "We have just rolled out new updates to enhance your experience. Check out your personalized dashboard and discover new vibing events happening this week!",
  },
  event_reminder: {
    title: "Reminder: Get Ready for Tomorrow's Vibe!",
    body: "Your upcoming event is happening tomorrow! Doors open early. Please arrive on time and have your ticket/RSVP confirmation ready at the entrance.",
  },
  emergency_alert: {
    title: "URGENT SAFETY NOTICE: Severe Weather Advisory",
    body: "Due to sudden weather warnings and safety considerations, please note that current outdoor sessions are temporarily moved indoors. Please follow on-ground security guidelines.",
  },
  agenda_shift: {
    title: "Schedule Update: Revised Performance Timings",
    body: "Please note the headliner act has been shifted by 30 minutes. Check the updated live agenda for precise set times.",
  },
  event_rescheduled: {
    title: "Official Notice: Event Rescheduled to New Date",
    body: "Due to unforeseen logistical constraints, this event has been officially rescheduled. Your RSVP remains fully valid for the new date.",
  },
  event_cancellation: {
    title: "Important Notice: Event Cancellation",
    body: "We regret to inform you that this event has been officially cancelled. Any ticket refunds or credits are currently being processed automatically.",
  },
};

export default function AdminBroadcastsPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"compose" | "history">("compose");

  // Broadcast Form State
  const [scope, setScope] = useState<BroadcastScope>("global");
  const [targetCity, setTargetCity] = useState<string>("");
  const [targetEventId, setTargetEventId] = useState<string>("");
  const [targetCategory, setTargetCategory] = useState<string>("");

  const [messageType, setMessageType] = useState<BroadcastType>("general_update");
  const [title, setTitle] = useState<string>(TEMPLATES.general_update.title);
  const [message, setMessage] = useState<string>(TEMPLATES.general_update.body);
  const [actionLink, setActionLink] = useState<string>("");

  // Data states
  const [cities, setCities] = useState<Array<{ id: number; name: string }>>([]);
  const [events, setEvents] = useState<Array<{ id: string; title: string; city?: string; date_time?: string }>>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastMessage[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Audience preview state
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [calculatingReach, setCalculatingReach] = useState(false);
  const [sending, setSending] = useState(false);

  // Filter state for history
  const [historyTypeFilter, setHistoryTypeFilter] = useState<string>("all");
  const [historyScopeFilter, setHistoryScopeFilter] = useState<string>("all");

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Fetch Cities and Events on load
  useEffect(() => {
    fetch(`${baseUrl}/api/cities`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setCities(data.data);
          if (data.data.length > 0 && !targetCity) {
            setTargetCity(data.data[0].name);
          }
        }
      })
      .catch((err) => console.error("Error fetching cities:", err));

    fetch(`${baseUrl}/api/events`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setEvents(data.data);
          if (data.data.length > 0 && !targetEventId) {
            setTargetEventId(data.data[0].id);
          }
        }
      })
      .catch((err) => console.error("Error fetching events:", err));
  }, []);

  // Fetch broadcast history
  const fetchBroadcasts = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/broadcasts`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setBroadcasts(data.data);
      }
    } catch (err) {
      console.error("Error loading broadcasts:", err);
      toast.error("Failed to load broadcast history");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchBroadcasts();
    }
  }, [activeTab]);

  // Recipient Count Calculator
  useEffect(() => {
    let isCancelled = false;
    const fetchAudienceReach = async () => {
      setCalculatingReach(true);
      try {
        const queryParams = new URLSearchParams();
        queryParams.set("scope", scope);
        if (scope === "city" && targetCity) queryParams.set("city", targetCity);
        if (scope === "event" && targetEventId) queryParams.set("eventId", targetEventId);
        if (scope === "category" && targetCategory) queryParams.set("category", targetCategory);

        const res = await fetch(`${baseUrl}/api/admin/broadcasts/recipients-count?${queryParams.toString()}`);
        const data = await res.json();
        if (!isCancelled && data.success && data.data) {
          setRecipientCount(data.data.total);
        }
      } catch (err) {
        if (!isCancelled) setRecipientCount(null);
      } finally {
        if (!isCancelled) setCalculatingReach(false);
      }
    };

    const timeout = setTimeout(fetchAudienceReach, 250);
    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [scope, targetCity, targetEventId, targetCategory]);

  const handleSelectType = (type: BroadcastType) => {
    setMessageType(type);
    const template = TEMPLATES[type];
    if (template) {
      setTitle(template.title);
      setMessage(template.body);
    }
  };

  const handleSendBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Title and message body are required.");
      return;
    }

    if (scope === "city" && !targetCity) {
      toast.error("Please select a target city.");
      return;
    }
    if (scope === "event" && !targetEventId) {
      toast.error("Please select a target event.");
      return;
    }
    if (scope === "category" && !targetCategory) {
      toast.error("Please select a target category.");
      return;
    }

    const confirmed = await vibeConfirm({
      title: "Send In-App Broadcast?",
      message: `This will dispatch an in-app notification to ${recipientCount ?? "matching"} users under the "${BROADCAST_TYPE_CONFIGS[messageType].label}" category.`,
      confirmLabel: "Yes, Send Broadcast",
      cancelLabel: "Cancel",
    });

    if (!confirmed) return;

    setSending(true);
    try {
      const payload = {
        title: title.trim(),
        message: message.trim(),
        type: messageType,
        scope,
        target_city: scope === "city" ? targetCity : null,
        target_event_id: scope === "event" ? targetEventId : null,
        target_category: scope === "category" ? targetCategory : null,
        admin_email: session?.user?.email,
        link: actionLink.trim() || (scope === "event" && targetEventId ? `/event/${targetEventId}` : null),
        metadata: {
          event_title: scope === "event" ? events.find((e) => e.id === targetEventId)?.title : undefined,
        },
      };

      const res = await fetch(`${baseUrl}/api/admin/broadcasts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Broadcast successfully sent!");
        // Reset or switch to history
        setActiveTab("history");
        fetchBroadcasts();
      } else {
        toast.error(data.error || "Failed to send broadcast.");
      }
    } catch (err) {
      console.error("Broadcast send error:", err);
      toast.error("An error occurred while sending the broadcast.");
    } finally {
      setSending(false);
    }
  };

  const selectedTypeConfig = BROADCAST_TYPE_CONFIGS[messageType];

  const filteredBroadcasts = useMemo(() => {
    return broadcasts.filter((b) => {
      if (historyTypeFilter !== "all" && b.type !== historyTypeFilter) return false;
      if (historyScopeFilter !== "all" && b.scope !== historyScopeFilter) return false;
      return true;
    });
  }, [broadcasts, historyTypeFilter, historyScopeFilter]);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="border-b border-black/5 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-rose-500/10 text-rose-600 rounded-2xl border border-rose-500/20 shadow-sm">
            <Radio className="h-6 w-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-rose-600">
                NOTIFICATION ENGINE
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                IN-APP BROADCASTS
              </span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black italic tracking-tighter uppercase leading-tight">
              Broadcast Studio
            </h1>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-zinc-200/50 p-1.5 rounded-2xl border border-black/5 self-start md:self-auto">
          <button
            onClick={() => setActiveTab("compose")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "compose"
                ? "bg-black text-white shadow-md"
                : "text-zinc-500 hover:text-black hover:bg-black/5"
            }`}
          >
            <Megaphone className="h-3.5 w-3.5" />
            Compose
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === "history"
                ? "bg-black text-white shadow-md"
                : "text-zinc-500 hover:text-black hover:bg-black/5"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            Broadcast Logs
          </button>
        </div>
      </div>

      {activeTab === "compose" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Form (Left 7 Cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Step 1: Audience Scope Selection */}
            <Card className="ringer-card bg-white border border-black/5 shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-black/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-black text-white text-xs font-black flex items-center justify-center">
                      1
                    </span>
                    <CardTitle className="text-sm font-black uppercase tracking-wider">
                      Select Target Audience Scope
                    </CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-bold tracking-wider">
                    {calculatingReach ? (
                      <span className="flex items-center gap-1">
                        <RefreshCw className="h-2.5 w-2.5 animate-spin" /> Calculating...
                      </span>
                    ) : (
                      <span className="text-primary font-black">
                        ~{recipientCount ?? 0} active users
                      </span>
                    )}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-5">
                {/* 4 Scope Buttons */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setScope("global")}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                      scope === "global"
                        ? "border-black bg-black text-white shadow-lg"
                        : "border-black/5 bg-zinc-50/50 hover:bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    <Globe className={`h-4 w-4 ${scope === "global" ? "text-primary" : "text-zinc-500"}`} />
                    <div>
                      <div className="text-xs font-black uppercase tracking-tight">Global</div>
                      <div className={`text-[9px] ${scope === "global" ? "text-zinc-400" : "text-zinc-500"} font-medium`}>
                        All signed up users
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope("city")}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                      scope === "city"
                        ? "border-black bg-black text-white shadow-lg"
                        : "border-black/5 bg-zinc-50/50 hover:bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    <MapPin className={`h-4 w-4 ${scope === "city" ? "text-primary" : "text-zinc-500"}`} />
                    <div>
                      <div className="text-xs font-black uppercase tracking-tight">City Level</div>
                      <div className={`text-[9px] ${scope === "city" ? "text-zinc-400" : "text-zinc-500"} font-medium`}>
                        Users by City
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope("event")}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                      scope === "event"
                        ? "border-black bg-black text-white shadow-lg"
                        : "border-black/5 bg-zinc-50/50 hover:bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    <Calendar className={`h-4 w-4 ${scope === "event" ? "text-primary" : "text-zinc-500"}`} />
                    <div>
                      <div className="text-xs font-black uppercase tracking-tight">Event Level</div>
                      <div className={`text-[9px] ${scope === "event" ? "text-zinc-400" : "text-zinc-500"} font-medium`}>
                        Event RSVPs
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope("category")}
                    className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between gap-2 ${
                      scope === "category"
                        ? "border-black bg-black text-white shadow-lg"
                        : "border-black/5 bg-zinc-50/50 hover:bg-zinc-100 text-zinc-700"
                    }`}
                  >
                    <Tag className={`h-4 w-4 ${scope === "category" ? "text-primary" : "text-zinc-500"}`} />
                    <div>
                      <div className="text-xs font-black uppercase tracking-tight">Category</div>
                      <div className={`text-[9px] ${scope === "category" ? "text-zinc-400" : "text-zinc-500"} font-medium`}>
                        Interest Toggles
                      </div>
                    </div>
                  </button>
                </div>

                {/* Conditional Sub-selectors */}
                {scope === "city" && (
                  <div className="p-3.5 bg-zinc-50 rounded-2xl border border-black/5 space-y-2 animate-in fade-in duration-200">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      Select Target City
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {cities.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setTargetCity(c.name)}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                            targetCity === c.name
                              ? "bg-black text-white shadow-sm"
                              : "bg-white border border-black/10 text-zinc-600 hover:border-black"
                          }`}
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {scope === "event" && (
                  <div className="p-3.5 bg-zinc-50 rounded-2xl border border-black/5 space-y-2 animate-in fade-in duration-200">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      Select Target Event
                    </Label>
                    <select
                      value={targetEventId}
                      onChange={(e) => setTargetEventId(e.target.value)}
                      className="w-full bg-white border border-black/10 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {events.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.title} {ev.city ? `(${ev.city})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {scope === "category" && (
                  <div className="p-3.5 bg-zinc-50 rounded-2xl border border-black/5 space-y-2 animate-in fade-in duration-200">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      Select Interest Category
                    </Label>
                    <div className="flex flex-wrap gap-1.5">
                      {CATEGORIES.map((cat) => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setTargetCategory(cat)}
                          className={`px-3 py-1 rounded-full text-[11px] font-bold transition-all ${
                            targetCategory === cat
                              ? "bg-black text-white shadow-sm"
                              : "bg-white border border-black/10 text-zinc-600 hover:border-black"
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Step 2: Message Type Selection */}
            <Card className="ringer-card bg-white border border-black/5 shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-black/5">
                <div className="flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-black text-white text-xs font-black flex items-center justify-center">
                    2
                  </span>
                  <CardTitle className="text-sm font-black uppercase tracking-wider">
                    Select Broadcast Message Type
                  </CardTitle>
                </div>
              </CardHeader>

              <CardContent className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {(Object.keys(BROADCAST_TYPE_CONFIGS) as BroadcastType[]).map((typeKey) => {
                    const cfg = BROADCAST_TYPE_CONFIGS[typeKey];
                    const isSelected = messageType === typeKey;
                    return (
                      <button
                        key={typeKey}
                        type="button"
                        onClick={() => handleSelectType(typeKey)}
                        className={`p-3.5 rounded-2xl border text-left transition-all flex items-start gap-3 ${
                          isSelected
                            ? `${cfg.cardBg} border-black shadow-md ring-1 ring-black`
                            : "border-black/5 bg-zinc-50/50 hover:bg-zinc-100/80 text-zinc-700"
                        }`}
                      >
                        <span className="text-xl shrink-0 p-1.5 bg-white/80 rounded-xl shadow-xs">
                          {cfg.icon}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-black tracking-tight text-zinc-900">
                              {cfg.label}
                            </span>
                            {typeKey === "emergency_alert" && (
                              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                            )}
                          </div>
                          <p className="text-[10px] text-zinc-500 leading-snug line-clamp-2 mt-0.5">
                            {cfg.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Step 3: Broadcast Content */}
            <Card className="ringer-card bg-white border border-black/5 shadow-sm overflow-hidden">
              <CardHeader className="p-5 pb-3 border-b border-black/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="h-6 w-6 rounded-full bg-black text-white text-xs font-black flex items-center justify-center">
                      3
                    </span>
                    <CardTitle className="text-sm font-black uppercase tracking-wider">
                      Compose Notification
                    </CardTitle>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleSelectType(messageType)}
                    className="text-[10px] font-bold text-zinc-400 hover:text-black uppercase tracking-wider flex items-center gap-1"
                  >
                    <RefreshCw className="h-2.5 w-2.5" /> Reset Template
                  </button>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Broadcast Title
                  </Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter an attention-grabbing title..."
                    className="text-xs font-bold rounded-xl border-black/10 focus:border-black"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                      Message Body
                    </Label>
                    <span className="text-[9px] font-mono text-zinc-400">
                      {message.length} characters
                    </span>
                  </div>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    placeholder="Type the broadcast message details..."
                    className="text-xs font-medium rounded-xl border-black/10 focus:border-black"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                    Action Link (Optional)
                  </Label>
                  <Input
                    value={actionLink}
                    onChange={(e) => setActionLink(e.target.value)}
                    placeholder="e.g. /event/123 or /local-currents (Defaults to Event or Dashboard)"
                    className="text-xs font-medium rounded-xl border-black/10"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    onClick={handleSendBroadcast}
                    disabled={sending || calculatingReach}
                    className="w-full h-12 bg-black hover:bg-zinc-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" /> Dispatching Broadcast...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" /> Send In-App Broadcast (Reach: ~{recipientCount ?? 0})
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Live Preview Panel (Right 5 Cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="sticky top-24 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5" /> Live In-App Notification Preview
                </h3>
                <Badge className="bg-zinc-100 text-zinc-700 border-black/5 text-[9px] font-black uppercase">
                  User View
                </Badge>
              </div>

              {/* Notification Card Mockup */}
              <div className="p-6 bg-zinc-900 rounded-[32px] shadow-2xl border border-black/10 text-white space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <img src="/logo.png" alt="Logo" className="h-4 w-4 rounded-md object-contain" />
                    <span className="text-[10px] font-black tracking-widest uppercase text-zinc-300">
                      Notification Center
                    </span>
                  </div>
                  <span className="text-[9px] font-mono text-zinc-400">Just now</span>
                </div>

                {/* Rendered Notification Item */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    selectedTypeConfig.borderColor
                  } ${
                    messageType === "emergency_alert"
                      ? "bg-red-950/40 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]"
                      : "bg-white/5 border-white/10"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl shrink-0">{selectedTypeConfig.icon}</span>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${selectedTypeConfig.badgeBg}`}
                        >
                          {selectedTypeConfig.label}
                        </span>
                        <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                          • {scope === "global" ? "All Users" : scope}
                        </span>
                      </div>

                      <h4 className="text-xs font-black text-white leading-snug">
                        {title || "Untitled Notification"}
                      </h4>

                      <p className="text-[11px] text-zinc-300 font-medium leading-relaxed whitespace-pre-wrap">
                        {message || "No content specified..."}
                      </p>

                      <div className="pt-2 flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                          View details <ArrowRight className="h-2.5 w-2.5" />
                        </span>
                        <span className="h-2 w-2 rounded-full bg-primary" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scope Summary Footer */}
                <div className="p-3 bg-white/5 rounded-xl border border-white/5 space-y-1 text-[10px] text-zinc-400 font-medium">
                  <div className="flex justify-between">
                    <span>Targeting Scope:</span>
                    <span className="font-bold text-white uppercase">{scope}</span>
                  </div>
                  {scope === "city" && (
                    <div className="flex justify-between">
                      <span>Target City:</span>
                      <span className="font-bold text-white">{targetCity || "Not selected"}</span>
                    </div>
                  )}
                  {scope === "event" && (
                    <div className="flex justify-between">
                      <span>Target Event:</span>
                      <span className="font-bold text-white truncate max-w-[180px]">
                        {events.find((e) => e.id === targetEventId)?.title || "Not selected"}
                      </span>
                    </div>
                  )}
                  {scope === "category" && (
                    <div className="flex justify-between">
                      <span>Category Preference:</span>
                      <span className="font-bold text-white">{targetCategory || "Not selected"}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-white/10">
                    <span>Estimated Reach:</span>
                    <span className="font-black text-primary">~{recipientCount ?? 0} Users</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: History & Logs */
        <div className="space-y-6">
          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-black/5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Type:
              </span>
              <select
                value={historyTypeFilter}
                onChange={(e) => setHistoryTypeFilter(e.target.value)}
                className="bg-zinc-50 border border-black/10 rounded-xl px-2.5 py-1 text-xs font-bold"
              >
                <option value="all">All Types</option>
                {(Object.keys(BROADCAST_TYPE_CONFIGS) as BroadcastType[]).map((t) => (
                  <option key={t} value={t}>
                    {BROADCAST_TYPE_CONFIGS[t].label}
                  </option>
                ))}
              </select>

              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-2">
                Scope:
              </span>
              <select
                value={historyScopeFilter}
                onChange={(e) => setHistoryScopeFilter(e.target.value)}
                className="bg-zinc-50 border border-black/10 rounded-xl px-2.5 py-1 text-xs font-bold"
              >
                <option value="all">All Scopes</option>
                <option value="global">Global</option>
                <option value="city">City</option>
                <option value="event">Event</option>
                <option value="category">Category</option>
              </select>
            </div>

            <Button
              onClick={fetchBroadcasts}
              variant="outline"
              size="sm"
              className="rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3 w-3 ${historyLoading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>

          {/* Broadcasts List */}
          {historyLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-zinc-100 rounded-3xl animate-pulse" />
              ))}
            </div>
          ) : filteredBroadcasts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-3xl border border-black/5 p-8">
              <Radio className="h-10 w-10 text-zinc-300 mx-auto mb-3" />
              <h3 className="text-sm font-black uppercase tracking-wider">No Broadcasts Found</h3>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1">
                You have not sent any broadcasts matching these criteria yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBroadcasts.map((b) => {
                const typeCfg = BROADCAST_TYPE_CONFIGS[b.type] || BROADCAST_TYPE_CONFIGS.general_update;
                const formattedDate = new Date(b.created_at).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <Card
                    key={b.id}
                    className={`ringer-card bg-white border transition-all ${
                      b.type === "emergency_alert" ? "border-red-300 shadow-sm" : "border-black/5"
                    }`}
                  >
                    <CardContent className="p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <span className="text-2xl shrink-0 p-2 bg-zinc-50 rounded-2xl border border-black/5">
                          {typeCfg.icon}
                        </span>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${typeCfg.badgeBg}`}
                            >
                              {typeCfg.label}
                            </span>
                            <Badge variant="outline" className="text-[9px] font-bold uppercase">
                              Scope: {b.scope}
                              {b.target_city ? ` (${b.target_city})` : ""}
                              {b.target_category ? ` (${b.target_category})` : ""}
                            </Badge>
                            {b.event_title && (
                              <Badge className="bg-primary/10 text-black border-none text-[9px] font-bold">
                                🎟️ {b.event_title}
                              </Badge>
                            )}
                          </div>
                          <h4 className="text-sm font-black text-black leading-snug">{b.title}</h4>
                          <p className="text-xs text-zinc-500 font-medium line-clamp-2 leading-relaxed">
                            {b.message}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto shrink-0 border-t md:border-t-0 pt-3 md:pt-0 border-black/5 gap-1">
                        <div className="flex items-center gap-1.5 text-xs font-black text-black">
                          <Users className="h-3.5 w-3.5 text-zinc-400" />
                          <span>{b.recipient_count} Recipients</span>
                        </div>
                        <div className="text-[10px] font-medium text-zinc-400">{formattedDate}</div>
                        <div className="text-[9px] font-mono text-zinc-400">By: {b.sender_email}</div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
