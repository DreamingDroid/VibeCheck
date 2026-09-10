"use client";

import { useState, useEffect } from "react";
import {
  Users,
  Send,
  X,
  Link as LinkIcon,
  ExternalLink,
  Save
} from "lucide-react";
import { toast } from "sonner";

interface OrganizerWhatsAppInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  organizerEmail: string;
  initialLink?: string | null;
  onLinkUpdated?: (newLink: string) => void;
}

export function OrganizerWhatsAppInviteModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  organizerEmail,
  initialLink = "",
  onLinkUpdated,
}: OrganizerWhatsAppInviteModalProps) {
  const [whatsappLink, setWhatsappLink] = useState(initialLink || "");
  const [customMessage, setCustomMessage] = useState(
    `Join our official attendee WhatsApp group for "${eventTitle}" to connect with fellow guests and receive live announcements!`
  );
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingReach, setLoadingReach] = useState(false);
  const [savingOnly, setSavingOnly] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Sync initial link
  useEffect(() => {
    if (initialLink) {
      setWhatsappLink(initialLink);
    }
  }, [initialLink]);

  // Fetch recipient reach (RSVP'd attendees)
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

  const validateLink = (url: string) => {
    const trimmed = url.trim();
    if (!trimmed) return false;
    return (
      trimmed.startsWith("https://chat.whatsapp.com/") ||
      trimmed.startsWith("http://chat.whatsapp.com/") ||
      trimmed.startsWith("https://wa.me/") ||
      trimmed.startsWith("http://wa.me/") ||
      trimmed.includes("whatsapp.com")
    );
  };

  const handleSaveOnly = async () => {
    const trimmed = whatsappLink.trim();
    if (trimmed && !validateLink(trimmed)) {
      toast.error("Please enter a valid WhatsApp group link (e.g. https://chat.whatsapp.com/...)");
      return;
    }

    setSavingOnly(true);
    try {
      const res = await fetch(`${baseUrl}/api/organizer/events/${eventId}/whatsapp-group`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizer_email: organizerEmail,
          whatsapp_group_link: trimmed,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "WhatsApp group link saved!");
        if (onLinkUpdated) onLinkUpdated(trimmed);
        onClose();
      } else {
        toast.error(data.error || "Failed to update WhatsApp group link.");
      }
    } catch (err) {
      console.error("Error saving WhatsApp link:", err);
      toast.error("An error occurred while saving the link.");
    } finally {
      setSavingOnly(false);
    }
  };

  const handleSendInvite = async () => {
    const trimmed = whatsappLink.trim();
    if (!trimmed) {
      toast.error("Please enter your WhatsApp Group Invite URL first.");
      return;
    }

    if (!validateLink(trimmed)) {
      toast.error("Please enter a valid WhatsApp group link (e.g. https://chat.whatsapp.com/...)");
      return;
    }

    setSendingInvite(true);
    try {
      const res = await fetch(`${baseUrl}/api/organizer/events/${eventId}/whatsapp-group-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizer_email: organizerEmail,
          whatsapp_group_link: trimmed,
          custom_message: customMessage.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "WhatsApp invite notification sent to RSVP'd attendees!");
        if (onLinkUpdated) onLinkUpdated(trimmed);
        onClose();
      } else {
        toast.error(data.error || "Failed to send WhatsApp group invite.");
      }
    } catch (err) {
      console.error("Error sending WhatsApp group invite:", err);
      toast.error("An error occurred while dispatching the group invite.");
    } finally {
      setSendingInvite(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[36px] max-w-2xl w-full shadow-2xl border border-black/5 overflow-hidden animate-in zoom-in-95 duration-200 my-8 text-black"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 sm:p-8 bg-zinc-950 text-white flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl shrink-0">
              💬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="sticker-badge bg-emerald-500 text-black font-black text-[9px] uppercase px-2 py-0.5 border-none">
                  Community Chat
                </span>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest truncate max-w-[200px] sm:max-w-xs">
                  {eventTitle}
                </span>
              </div>
              <h3 className="text-2xl font-black italic uppercase tracking-tight text-white mt-1">
                WhatsApp Group Invite
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Reach Banner */}
        <div className="bg-emerald-50/80 border-b border-emerald-200/60 p-4 px-6 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-emerald-700 shrink-0" />
            <span className="text-xs font-bold text-emerald-950">
              Eligible RSVP Audience:
            </span>
          </div>
          <div className="flex items-center gap-2">
            {loadingReach ? (
              <span className="text-xs text-emerald-700 animate-pulse font-medium">Calculating...</span>
            ) : (
              <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-black tracking-wider uppercase shadow-xs">
                {recipientCount ?? 0} {recipientCount === 1 ? "Attendee" : "Attendees"} RSVP'd
              </span>
            )}
          </div>
        </div>

        {/* Content Form */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* WhatsApp Link Input */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 flex items-center justify-between">
              <span>WhatsApp Group Invite URL</span>
              <span className="text-[9px] text-emerald-600 font-bold lowercase">chat.whatsapp.com/...</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <LinkIcon className="h-4 w-4" />
              </div>
              <input
                type="url"
                placeholder="https://chat.whatsapp.com/ABC123xyz..."
                value={whatsappLink}
                onChange={(e) => setWhatsappLink(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-black/10 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-black placeholder:text-zinc-400"
              />
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">
              Copy the invite link from your WhatsApp group info (Group Info → Invite via link → Copy link).
            </p>
          </div>

          {/* Invitation Message Body */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500">
              Notification Message (Included in In-App Alert &amp; Email)
            </label>
            <textarea
              rows={3}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Add a friendly note for attendees..."
              className="w-full p-4 bg-zinc-50 border border-black/10 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all text-black placeholder:text-zinc-400"
            />
          </div>

          {/* Live Preview Card */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
              Attendee Notification Preview
            </span>
            <div className="p-4 bg-zinc-50 rounded-2xl border border-black/5 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-white border border-black/5 flex items-center justify-center text-lg shrink-0 shadow-xs">
                💬
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-emerald-500/15 text-emerald-700 border-emerald-300">
                    WhatsApp Group Invite
                  </span>
                  <span className="text-[9px] font-bold text-zinc-400">Just now</span>
                </div>
                <h4 className="text-xs font-black text-black truncate">
                  💬 WhatsApp Group Invite: {eventTitle}
                </h4>
                <p className="text-[11px] text-zinc-600 font-medium line-clamp-2 mt-0.5">
                  {customMessage || "Join the official attendee WhatsApp group..."}
                </p>
                {whatsappLink.trim() && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                    Join Group Chat <ExternalLink className="h-3 w-3" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-zinc-50 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto ringer-button border border-black/10 bg-white hover:bg-zinc-100 text-black text-xs py-2.5 px-5"
          >
            CANCEL
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              disabled={savingOnly || sendingInvite}
              onClick={handleSaveOnly}
              className="ringer-button border border-black/10 bg-zinc-100 hover:bg-zinc-200 text-black text-xs py-2.5 px-4 flex items-center justify-center gap-2"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{savingOnly ? "SAVING..." : "SAVE LINK ONLY"}</span>
            </button>

            <button
              type="button"
              disabled={savingOnly || sendingInvite || !whatsappLink.trim()}
              onClick={handleSendInvite}
              className="ringer-button bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2.5 px-6 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{sendingInvite ? "SENDING INVITES..." : "SEND GROUP INVITE"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
