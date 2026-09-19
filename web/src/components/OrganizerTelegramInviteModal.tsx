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
import { isValidTelegramLink, formatTelegramLink } from "@/lib/telegramGroup";

interface OrganizerTelegramInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
  organizerEmail: string;
  initialLink?: string | null;
  onLinkUpdated?: (newLink: string) => void;
}

export function OrganizerTelegramInviteModal({
  isOpen,
  onClose,
  eventId,
  eventTitle,
  organizerEmail,
  initialLink = "",
  onLinkUpdated,
}: OrganizerTelegramInviteModalProps) {
  const [telegramLink, setTelegramLink] = useState(initialLink || "");
  const [customMessage, setCustomMessage] = useState(
    `Join our official attendee Telegram group for "${eventTitle}" to connect with fellow guests and receive live announcements!`
  );
  const [recipientCount, setRecipientCount] = useState<number | null>(null);
  const [loadingReach, setLoadingReach] = useState(false);
  const [savingOnly, setSavingOnly] = useState(false);
  const [sendingInvite, setSendingInvite] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  // Sync initial link
  useEffect(() => {
    if (initialLink) {
      setTelegramLink(initialLink);
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

  const handleSaveOnly = async () => {
    const trimmed = telegramLink.trim();
    if (trimmed && !isValidTelegramLink(trimmed)) {
      toast.error("Please enter a valid Telegram group link (e.g. https://t.me/your_group)");
      return;
    }

    const formattedLink = formatTelegramLink(trimmed);

    setSavingOnly(true);
    try {
      const res = await fetch(`${baseUrl}/api/organizer/events/${eventId}/whatsapp-group`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizer_email: organizerEmail,
          whatsapp_group_link: formattedLink,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Telegram group link saved!");
        if (onLinkUpdated) onLinkUpdated(formattedLink);
        onClose();
      } else {
        toast.error(data.error || "Failed to update Telegram group link.");
      }
    } catch (err) {
      console.error("Error saving Telegram link:", err);
      toast.error("An error occurred while saving the link.");
    } finally {
      setSavingOnly(false);
    }
  };

  const handleSendInvite = async () => {
    const trimmed = telegramLink.trim();
    if (!trimmed) {
      toast.error("Please enter your Telegram Group Invite URL first.");
      return;
    }

    if (!isValidTelegramLink(trimmed)) {
      toast.error("Please enter a valid Telegram group link (e.g. https://t.me/your_group)");
      return;
    }

    const formattedLink = formatTelegramLink(trimmed);

    setSendingInvite(true);
    try {
      const res = await fetch(`${baseUrl}/api/organizer/events/${eventId}/whatsapp-group-invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizer_email: organizerEmail,
          whatsapp_group_link: formattedLink,
          custom_message: customMessage.trim(),
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Telegram invite notification sent to RSVP'd attendees!");
        if (onLinkUpdated) onLinkUpdated(formattedLink);
        onClose();
      } else {
        toast.error(data.error || "Failed to send Telegram group invite.");
      }
    } catch (err) {
      console.error("Error sending Telegram group invite:", err);
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
            <div className="h-12 w-12 rounded-2xl bg-[#229ED9]/20 border border-[#229ED9]/30 flex items-center justify-center text-white shrink-0">
              <Send className="h-6 w-6 fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="sticker-badge bg-[#229ED9] text-white font-black text-[9px] uppercase px-2 py-0.5 border-none">
                  Telegram Group
                </span>
                <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest truncate max-w-[200px] sm:max-w-xs">
                  {eventTitle}
                </span>
              </div>
              <h3 className="text-2xl font-black italic uppercase tracking-tight text-white mt-1">
                Attendee Telegram Group
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Reach Banner */}
        <div className="bg-sky-50/80 border-b border-sky-200/60 p-4 px-6 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Users className="h-4 w-4 text-[#229ED9] shrink-0" />
            <span className="text-xs font-bold text-sky-950">
              Eligible RSVP Audience:
            </span>
          </div>
          <div className="flex items-center gap-2">
            {loadingReach ? (
              <span className="text-xs text-[#229ED9] animate-pulse font-medium">Calculating...</span>
            ) : (
              <span className="px-3 py-1 bg-[#229ED9] text-white rounded-full text-xs font-black tracking-wider uppercase shadow-xs">
                {recipientCount ?? 0} {recipientCount === 1 ? "Attendee" : "Attendees"} RSVP'd
              </span>
            )}
          </div>
        </div>

        {/* Content Form */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Telegram Link Input */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-widest text-zinc-500 flex items-center justify-between">
              <span>Telegram Group / Channel Invite URL</span>
              <span className="text-[9px] text-[#229ED9] font-bold lowercase">t.me/your_group</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
                <LinkIcon className="h-4 w-4" />
              </div>
              <input
                type="url"
                placeholder="https://t.me/your_event_group"
                value={telegramLink}
                onChange={(e) => setTelegramLink(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-zinc-50 border border-black/10 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-[#229ED9] focus:bg-white transition-all text-black placeholder:text-zinc-400"
              />
            </div>
            <p className="text-[10px] text-zinc-400 font-medium">
              Copy the invite link from your Telegram group settings (Group Info → Add Members / Invite via Link → Copy Link).
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
              className="w-full p-4 bg-zinc-50 border border-black/10 rounded-2xl text-xs font-bold focus:ring-2 focus:ring-[#229ED9] focus:bg-white transition-all text-black placeholder:text-zinc-400"
            />
          </div>

          {/* Live Preview Card */}
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">
              Attendee Notification Preview
            </span>
            <div className="p-4 bg-zinc-50 rounded-2xl border border-black/5 flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#229ED9] text-white flex items-center justify-center text-lg shrink-0 shadow-xs">
                <Send className="h-5 w-5 fill-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border bg-sky-500/15 text-[#229ED9] border-sky-300">
                    Telegram Group Invite
                  </span>
                  <span className="text-[9px] font-bold text-zinc-400">Just now</span>
                </div>
                <h4 className="text-xs font-black text-black truncate">
                  ✈️ Telegram Group Invite: {eventTitle}
                </h4>
                <p className="text-[11px] text-zinc-600 font-medium line-clamp-2 mt-0.5">
                  {customMessage || "Join the official attendee Telegram group..."}
                </p>
                {telegramLink.trim() && (
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#229ED9] text-white text-[10px] font-black uppercase tracking-wider">
                    Join Telegram Group <ExternalLink className="h-3 w-3" />
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
            className="w-full sm:w-auto ringer-button border border-black/10 bg-white hover:bg-zinc-100 text-black text-xs py-2.5 px-5 cursor-pointer"
          >
            CANCEL
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              disabled={savingOnly || sendingInvite}
              onClick={handleSaveOnly}
              className="ringer-button border border-black/10 bg-zinc-100 hover:bg-zinc-200 text-black text-xs py-2.5 px-4 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{savingOnly ? "SAVING..." : "SAVE LINK ONLY"}</span>
            </button>

            <button
              type="button"
              disabled={savingOnly || sendingInvite || !telegramLink.trim()}
              onClick={handleSendInvite}
              className="ringer-button bg-[#229ED9] hover:bg-[#1d8dc3] text-white text-xs py-2.5 px-6 flex items-center justify-center gap-2 shadow-lg shadow-[#229ED9]/20 disabled:opacity-50 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5 fill-white" />
              <span>{sendingInvite ? "SENDING INVITES..." : "SEND TELEGRAM INVITE"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Backward compatibility alias
export const OrganizerWhatsAppInviteModal = OrganizerTelegramInviteModal;
