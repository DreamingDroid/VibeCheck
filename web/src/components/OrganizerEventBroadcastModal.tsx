"use client";

import { useState, useEffect } from "react";
import {
  Radio,
  Send,
  Users,
  RefreshCw,
  X,
  Eye,
  AlertTriangle,
  Clock,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BroadcastType,
  BROADCAST_TYPES,
  BROADCAST_TYPE_CONFIGS
} from "@/types/broadcast";

interface OrganizerEventBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  organizerEmail: string;
  eventDate?: string;
  eventEndTime?: string;
  initialType?: BroadcastType;
  onSuccess?: () => void;
}

const ORGANIZER_TEMPLATES: Record<BroadcastType, { title: string; body: string }> = {
  general_update: {
    title: "Event Update for Attendees",
    body: "Hi everyone! We are excited to see you soon. Please check out the event details and arrive a few minutes prior to start time.",
  },
  event_reminder: {
    title: "Reminder: Event Starts Soon!",
    body: "Get ready! Doors will open on time. Make sure you have your confirmation ready at the gate.",
  },
  emergency_alert: {
    title: "URGENT SAFETY ALERT: Please Read",
    body: "Important safety advisory for all attendees: Please follow the updated on-site security guidelines and check the venue entry points.",
  },
  agenda_shift: {
    title: "Agenda Update: Revised Timings",
    body: "Please note a slight adjustment to our schedule for tonight. The revised session timings are now active.",
  },
  event_rescheduled: {
    title: "Official Notice: Event Rescheduled",
    body: "Due to unforeseen circumstances, our event has been rescheduled. Your RSVP remains fully valid for the new date!",
  },
  event_cancellation: {
    title: "Notice of Event Cancellation",
    body: "We deeply regret to announce that this event has been cancelled. Thank you for your support and understanding.",
  },
  whatsapp_group_invite: {
    title: "Join Our Official WhatsApp Group",
    body: "Connect with fellow attendees and get real-time announcements by joining our event's WhatsApp group!",
  },
  rating_request: {
    title: "⭐ How was the vibe? Rate your experience!",
    body: "Thank you for attending! We'd love to know how your experience was. Please take a quick moment to rate the event & organizer, and follow for future happenings.",
  },
};

export function OrganizerEventBroadcastModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  organizerEmail,
  eventDate,
  eventEndTime,
  initialType = "general_update",
  onSuccess,
}: OrganizerEventBroadcastModalProps) {
  const [messageType, setMessageType] = useState<BroadcastType>(initialType);
  const [title, setTitle] = useState(ORGANIZER_TEMPLATES[initialType]?.title || "");
  const [message, setMessage] = useState(ORGANIZER_TEMPLATES[initialType]?.body || "");
  const [targetAudience, setTargetAudience] = useState<"rsvps" | "attendees" | "both">("both");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingReach, setLoadingReach] = useState(false);
  const [sending, setSending] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Calculate 24-hour validity for post-event rating request
  const eventEndMs = eventEndTime ? new Date(eventEndTime).getTime() : eventDate ? new Date(eventDate).getTime() : null;
  const now = Date.now();
  const isConcluded = eventEndMs !== null && now >= eventEndMs;
  const isRatingExpired = eventEndMs !== null && now > eventEndMs + 24 * 60 * 60 * 1000;
  const isRatingWindowValid = isConcluded && !isRatingExpired;

  // Sync initial type whenever modal opens or initialType changes
  useEffect(() => {
    if (isOpen) {
      const typeToSet = initialType || "general_update";
      setMessageType(typeToSet);
      const tmpl = ORGANIZER_TEMPLATES[typeToSet];
      if (tmpl) {
        setTitle(tmpl.title);
        setMessage(tmpl.body);
      }
    }
  }, [isOpen, initialType]);

  // Calculate attendees count
  useEffect(() => {
    if (!isOpen || !eventId) return;

    setLoadingReach(true);
    fetch(`${baseUrl}/api/admin/broadcasts/recipients-count?scope=event&eventId=${eventId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setRecipientCount(data.data.total);
        }
      })
      .catch((err) => console.error("Error fetching recipient count:", err))
      .finally(() => setLoadingReach(false));
  }, [isOpen, eventId, baseUrl]);

  const handleSelectType = (type: BroadcastType) => {
    setMessageType(type);
    const tmpl = ORGANIZER_TEMPLATES[type];
    if (tmpl) {
      setTitle(tmpl.title);
      setMessage(tmpl.body);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error("Please enter a title and message body.");
      return;
    }

    if (messageType === 'rating_request' && !isRatingWindowValid) {
      if (!isConcluded) {
        toast.error("Rating request can only be sent once the event has reached its end date/time.");
      } else if (isRatingExpired) {
        toast.error("The 24-hour window to request ratings for this event has expired.");
      }
      return;
    }

    setSending(true);
    try {
      const res = await fetch(`${baseUrl}/api/organizer/events/${eventId}/in-app-broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizer_email: organizerEmail,
          title: title.trim(),
          message: message.trim(),
          type: messageType,
          metadata: {
            event_id: eventId,
            event_title: eventTitle,
            target_audience: targetAudience,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "In-app broadcast successfully sent to attendees!");
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error(data.error || "Failed to dispatch broadcast.");
      }
    } catch (err) {
      console.error("Error sending organizer broadcast:", err);
      toast.error("An error occurred while sending the broadcast.");
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const currentTypeConfig = BROADCAST_TYPE_CONFIGS[messageType] || BROADCAST_TYPE_CONFIGS.general_update;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[36px] max-w-2xl w-full shadow-2xl border border-black/5 overflow-hidden animate-in zoom-in-95 duration-200 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 sm:p-8 bg-zinc-950 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/20 text-primary rounded-2xl border border-primary/30">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-primary">
                  ORGANIZER HUB
                </span>
                <span className="h-1 w-1 rounded-full bg-zinc-500" />
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest truncate max-w-[200px]">
                  {eventTitle}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl text-white font-black italic tracking-tighter uppercase leading-tight">
                Send Event Broadcast
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Audience Selector & Counter */}
          <div className="p-4 bg-zinc-50 rounded-2xl border border-black/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-500" />
                <span className="text-xs font-bold text-zinc-700">Target Audience:</span>
              </div>
              <div className="flex bg-white rounded-xl border border-black/10 p-1 w-fit">
                {(['rsvps', 'attendees', 'both'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTargetAudience(t)}
                    className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors ${
                      targetAudience === t
                        ? 'bg-black text-white'
                        : 'text-zinc-500 hover:text-black hover:bg-zinc-100'
                    }`}
                  >
                    {t === 'rsvps' ? 'RSVPs' : t === 'attendees' ? 'Attendees' : 'Both'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center">
              <Badge className="bg-black text-white text-[10px] font-black shrink-0 px-3 py-1">
                {loadingReach ? "Calculating..." : `${recipientCount ?? 0} Recipients`}
              </Badge>
            </div>
          </div>

          {/* Step 1: Message Type */}
          <div className="space-y-2.5">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
              1. Select Message Type
            </Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {BROADCAST_TYPES.map((tKey) => {
                const cfg = BROADCAST_TYPE_CONFIGS[tKey] || BROADCAST_TYPE_CONFIGS.general_update;
                const isSel = messageType === tKey;
                const isRating = tKey === "rating_request";

                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => handleSelectType(tKey)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 relative ${
                      isSel
                        ? `${cfg.cardBg} border-black ring-1 ring-black shadow-xs`
                        : "border-black/5 bg-zinc-50/50 hover:bg-zinc-100/80 text-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-base">{cfg.icon}</span>
                      {tKey === "emergency_alert" && (
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping" />
                      )}
                      {isRating && (
                        <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-800 border border-amber-300">
                          24h Limit
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-black tracking-tight text-zinc-900 leading-tight">
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Rating Request 24h Window Banner Warning if selected */}
          {messageType === "rating_request" && (
            <div className={`p-4 rounded-2xl border flex items-start gap-3 ${
              isRatingWindowValid
                ? "bg-amber-50/90 border-amber-200 text-amber-900"
                : "bg-red-50 border-red-200 text-red-900"
            }`}>
              <Clock className={`w-5 h-5 shrink-0 mt-0.5 ${isRatingWindowValid ? "text-amber-600" : "text-red-600"}`} />
              <div className="space-y-0.5 text-xs">
                <span className="font-black uppercase tracking-wider block">
                  {isRatingWindowValid
                    ? "24-Hour Rating Window Active ⭐"
                    : !isConcluded
                    ? "Event Not Yet Concluded"
                    : "Rating Request Window Expired"}
                </span>
                <p className="font-medium text-xs opacity-90">
                  {isRatingWindowValid
                    ? "Your broadcast will invite attendees to rate the event, rate you as host, and follow your profile."
                    : !isConcluded
                    ? "Rating broadcasts can only be dispatched once the event has reached its scheduled end date & time."
                    : "Rating requests are strictly restricted to within 24 hours of event conclusion."}
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Inputs */}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Broadcast Title
              </Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title..."
                className="text-xs font-bold rounded-xl border-black/10 focus:border-black"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                  Message Body
                </Label>
                <span className="text-[9px] font-mono text-zinc-400">{message.length} chars</span>
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Type your message to attendees..."
                className="text-xs font-medium rounded-xl border-black/10 focus:border-black"
              />
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1">
              <Eye className="h-3 w-3" /> Live In-App Notification Preview
            </Label>
            <div
              className={`p-4 rounded-2xl border transition-all ${
                currentTypeConfig.borderColor
              } ${
                messageType === "emergency_alert"
                  ? "bg-red-50/80 border-red-300"
                  : messageType === "rating_request"
                  ? "bg-amber-50/80 border-amber-300 ring-1 ring-amber-400/20"
                  : "bg-zinc-50/80 border-black/5"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">{currentTypeConfig.icon}</span>
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${currentTypeConfig.badgeBg}`}
                    >
                      {currentTypeConfig.label}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                      • {eventTitle}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-black">{title || "Untitled Notification"}</h4>
                  <p className="text-[11px] text-zinc-600 font-medium whitespace-pre-wrap leading-relaxed">
                    {message || "No content..."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 rounded-2xl h-11 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSend}
              disabled={
                sending ||
                !title.trim() ||
                !message.trim() ||
                (messageType === "rating_request" && !isRatingWindowValid)
              }
              className="flex-1 bg-black hover:bg-zinc-800 text-white rounded-2xl h-11 text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Dispatching...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Send to {recipientCount ?? 0} Recipients
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
