"use client";

import { useState, useEffect } from "react";
import {
  Radio,
  Send,
  Users,
  RefreshCw,
  X,
  Eye,
  ArrowRight,
  Sparkles,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  BroadcastType,
  BROADCAST_TYPE_CONFIGS
} from "@/types/broadcast";

interface OrganizerEventBroadcastModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  organizerEmail: string;
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
};

export function OrganizerEventBroadcastModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  organizerEmail,
  onSuccess,
}: OrganizerEventBroadcastModalProps) {
  const [messageType, setMessageType] = useState<BroadcastType>("general_update");
  const [title, setTitle] = useState(ORGANIZER_TEMPLATES.general_update.title);
  const [message, setMessage] = useState(ORGANIZER_TEMPLATES.general_update.body);
  const [targetAudience, setTargetAudience] = useState<"rsvps" | "attendees" | "both">("both");
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingReach, setLoadingReach] = useState(false);
  const [sending, setSending] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
  }, [isOpen, eventId]);

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

  const currentTypeConfig = BROADCAST_TYPE_CONFIGS[messageType];

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
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {(Object.keys(BROADCAST_TYPE_CONFIGS) as BroadcastType[]).map((tKey) => {
                const cfg = BROADCAST_TYPE_CONFIGS[tKey];
                const isSel = messageType === tKey;
                return (
                  <button
                    key={tKey}
                    type="button"
                    onClick={() => handleSelectType(tKey)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1 ${
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
                    </div>
                    <span className="text-[11px] font-black tracking-tight text-zinc-900 leading-tight">
                      {cfg.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

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
                messageType === "emergency_alert" ? "bg-red-50/80 border-red-300" : "bg-zinc-50/80 border-black/5"
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
              disabled={sending || !title.trim() || !message.trim()}
              className="flex-1 bg-black hover:bg-zinc-800 text-white rounded-2xl h-11 text-xs font-black uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
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
