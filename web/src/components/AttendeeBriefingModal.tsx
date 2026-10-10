"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { 
  X, CheckCircle2, Calendar, MapPin, Phone, 
  ExternalLink, Sparkles, Clock, Check, Copy,
  AlertCircle, Backpack,
  ShieldCheck, QrCode, Send, Globe
} from "lucide-react";
import { formatTelegramLink } from "@/lib/telegramGroup";
import { formatEventTimeWithTimezone } from "@/lib/timezone";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface ScheduleItem {
  time: string;
  title: string;
  description?: string;
}

interface ContactItem {
  name: string;
  phone: string;
  role?: string;
}

export interface AttendeeGuideData {
  schedule?: ScheduleItem[];
  highlights?: string[];
  whatToCarry?: string[];
  assemblyPoint?: string;
  assemblyMapsUrl?: string;
  contacts?: ContactItem[];
  feeNote?: string;
  importantNotes?: string[];
}

interface AttendeeBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
  rsvpStatus?: 'pending' | 'confirmed';
  passCode?: string;
  isPreRsvp?: boolean;
  onRSVP?: () => void;
  onDownloadICS?: () => void;
  onShare?: () => void;
}

export function AttendeeBriefingModal({
  isOpen,
  onClose,
  event,
  rsvpStatus = 'confirmed',
  passCode,
  isPreRsvp = false,
  onRSVP,
  onDownloadICS,
}: AttendeeBriefingModalProps) {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const isEventEnded = event?.status === 'ended' || (
    event?.end_time 
      ? new Date(event.end_time).getTime() <= Date.now() 
      : event?.date_time 
        ? new Date(event.date_time).getTime() + (4 * 60 * 60 * 1000) <= Date.now()
        : false
  );

  const eventEndTimeMs = event?.end_time 
    ? new Date(event.end_time).getTime() 
    : event?.date_time 
      ? new Date(event.date_time).getTime() + (4 * 60 * 60 * 1000) 
      : Date.now() + (24 * 60 * 60 * 1000);

  const storageKey = event?.id ? `vibecheck_checklist_${event.id}` : null;

  // Load from localStorage on mount / event change and cleanup expired
  useEffect(() => {
    if (typeof window === "undefined" || !storageKey) return;

    // Sweeping garbage collection of other expired checklist items in localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("vibecheck_checklist_")) {
          const raw = localStorage.getItem(key);
          if (raw) {
            try {
              const parsed = JSON.parse(raw);
              if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
                localStorage.removeItem(key);
              }
            } catch {}
          }
        }
      }
    } catch {}

    // Check if current event is already ended
    if (isEventEnded) {
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      setCheckedItems({});
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
          localStorage.removeItem(storageKey);
          setCheckedItems({});
        } else if (parsed.items && typeof parsed.items === "object") {
          setCheckedItems(parsed.items);
        } else if (typeof parsed === "object") {
          setCheckedItems(parsed);
        }
      }
    } catch (err) {
      console.error("Error reading checklist from localStorage:", err);
    }
  }, [storageKey, isEventEnded]);

  useEffect(() => {
    if (passCode) {
      QRCode.toDataURL(passCode, {
        width: 300,
        margin: 2, // Standard quiet zone to avoid any clipping
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
        errorCorrectionLevel: "H",
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error("Error generating pass QR code:", err));
    }
  }, [passCode]);

  if (!event) return null;

  const guide: AttendeeGuideData = event.attendee_guide || {};
  const isPaid = !!event.is_paid;
  const isPending = !isPreRsvp && rsvpStatus === 'pending';
  const isPendingPayment = !isPreRsvp && isPaid && isPending;
  const isPendingApproval = !isPreRsvp && !isPaid && isPending;
  const isConfirmedPass = !isPreRsvp && !isPending && !!passCode;

  const toggleCheck = (index: number) => {
    setCheckedItems((prev) => {
      const updated = {
        ...prev,
        [index]: !prev[index],
      };

      if (typeof window !== "undefined" && storageKey && !isEventEnded) {
        try {
          localStorage.setItem(
            storageKey,
            JSON.stringify({
              items: updated,
              expiresAt: eventEndTimeMs,
            })
          );
        } catch (err) {
          console.error("Error writing checklist to localStorage:", err);
        }
      }

      return updated;
    });
  };

  const handleCopyCode = () => {
    if (passCode) {
      navigator.clipboard.writeText(passCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const mapsLink = event.google_maps_link || guide.assemblyMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.location || guide.assemblyPoint || ""}, ${event.city || "Vizag"}`)}`;

  const tzInfo = formatEventTimeWithTimezone(event.date_time, event.end_time, event.timezone || 'Asia/Kolkata');

  const eventDateStr = event.date_time 
    ? new Date(event.date_time).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: event.timezone || 'Asia/Kolkata' })
    : "Event Date";

  const eventTimeStr = tzInfo.timeRangeDisplay ? `${tzInfo.timeRangeDisplay} ${tzInfo.tzAbbr}` : "";

  // Contact details for payment coordination if paid
  const organizerPhone = event.organizer_phone || event.phone || (guide.contacts && guide.contacts[0]?.phone) || "";
  const organizerContactName = (guide.contacts && guide.contacts[0]?.name) || event.organizer_name || "Organizer";
  const whatsappPayMsg = `Hi ${organizerContactName}, I have registered for "${event.title}" on VibeCheck and would like to complete my payment for the Attendee Pass!`;
  const whatsappPayUrl = organizerPhone ? `https://wa.me/${organizerPhone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappPayMsg)}` : "";

  // =========================================================================
  // 1. CONFIRMED PASS VIEW (Minimalist, No Scrollbar, Crisp Square QR)
  // =========================================================================
  if (isConfirmedPass) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent 
          showCloseButton={false}
          className="max-w-md w-[92vw] rounded-[32px] p-0 border border-white/10 shadow-2xl overflow-hidden bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-white flex flex-col animate-in zoom-in-95 duration-200"
        >
          
          {/* Pass Header */}
          <div className="p-6 pb-3 relative overflow-hidden shrink-0">
            {/* Ambient emerald glow */}
            <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-primary/20 blur-3xl pointer-events-none -mr-16 -mt-16" />

            <div className="flex items-start justify-between relative z-10 gap-3">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/15 text-primary border border-primary/30 text-[10px] font-black uppercase tracking-widest shadow-sm">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>CONFIRMED ENTRY PASS</span>
                </div>

                <h2 className="text-xl sm:text-2xl font-black italic tracking-tight uppercase leading-tight text-white line-clamp-2">
                  {event.title}
                </h2>
                <p className="text-xs font-bold text-zinc-400 truncate">
                  Organized by <span className="text-white">{event.organizer_name || "VibeCheck Organizer"}</span> • {event.category}
                </p>
              </div>

              <button
                onClick={onClose}
                className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-all shrink-0 cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Quick Date & Venue Strip (Optimized, No Abrupt Truncation) */}
          <div className="mx-6 p-3 bg-white/5 border border-white/10 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2.5 px-2 py-1 bg-white/5 sm:bg-transparent rounded-xl">
              <div className="p-1.5 rounded-lg bg-primary/15 text-primary shrink-0">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="font-black text-white block text-xs leading-tight">
                  {eventDateStr}
                </span>
                <span className="text-[11px] text-zinc-400 font-medium">
                  {eventTimeStr}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 px-2 py-1 bg-white/5 sm:bg-transparent rounded-xl">
              <div className="p-1.5 rounded-lg bg-primary/15 text-primary shrink-0">
                {event.event_type === 'online' ? <Globe className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
              </div>
              <div className="min-w-0">
                <span className="font-black text-white block text-xs leading-tight truncate">
                  {event.event_type === 'online' ? (event.location || "Online Event") : (event.location || event.city || "Venue Entrance")}
                </span>
                <span className="text-[11px] text-zinc-400 font-medium truncate block">
                  {event.event_type === 'online' ? "Virtual / Online Event" : event.city}
                </span>
              </div>
            </div>
          </div>

          {/* Centerpiece Pass Code & Crisp Square QR */}
          <div className="px-6 py-5 flex flex-col items-center justify-center space-y-4 text-center">
            
            {/* Standalone Pass Number Pill (No Copy Button) */}
            <div className="px-6 py-2 bg-white/10 rounded-2xl border border-white/15 font-mono text-xl sm:text-2xl font-black tracking-widest text-white shadow-inner">
              {passCode}
            </div>

            {/* Crisp Square QR Code (Square edges, no rounded clipping) */}
            <div className="p-3 bg-white shadow-2xl border-4 border-white/10 inline-block mx-auto rounded-none">
              {qrDataUrl ? (
                <img 
                  src={qrDataUrl} 
                  alt={`Pass QR Code for ${passCode}`} 
                  className="w-44 h-44 sm:w-48 sm:h-48 object-contain block rounded-none"
                  style={{ imageRendering: "pixelated" }}
                />
              ) : (
                <div className="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center bg-zinc-100 text-zinc-400">
                  <QrCode className="h-12 w-12 animate-pulse" />
                </div>
              )}
            </div>

            <p className="text-[11px] font-medium text-zinc-400 leading-snug max-w-xs">
              Present this QR code or Pass Code <strong className="text-white font-mono">{passCode}</strong> at the venue gate for instant check-in.
            </p>

            {event.whatsapp_group_link && (
              <a
                href={formatTelegramLink(event.whatsapp_group_link)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full max-w-xs py-2.5 px-4 bg-[#229ED9] hover:bg-[#1d8dc3] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#229ED9]/20 active:scale-95 cursor-pointer mt-1"
              >
                <Send className="h-3.5 w-3.5 fill-white" />
                <span>Join Attendee Telegram Group</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {/* Pass Footer */}
          <div className="p-4 sm:px-6 border-t border-white/10 bg-black/60 shrink-0">
            <button
              onClick={onClose}
              className="w-full ringer-button bg-primary hover:bg-emerald-500 text-black text-xs font-black uppercase py-3.5 rounded-2xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              Done
            </button>
          </div>

        </DialogContent>
      </Dialog>
    );
  }

  // =========================================================================
  // 2. PRE-RSVP / PENDING APPROVAL / EVENT GUIDE VIEW
  // =========================================================================
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        showCloseButton={false}
        className="max-w-3xl w-[95vw] rounded-[32px] p-0 border-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col bg-white text-black animate-in zoom-in-95 duration-200"
      >
        
        {/* Pass / Briefing Header Banner */}
        <div className={`p-4 sm:p-5 relative overflow-hidden shrink-0 text-white ${
          isPending
            ? "bg-gradient-to-br from-amber-950 via-zinc-900 to-black" 
            : "bg-gradient-to-br from-zinc-900 via-black to-zinc-950"
        }`}>
          {/* Subtle glow effect */}
          <div className={`absolute top-0 right-0 w-48 h-48 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16 ${
            isPending ? "bg-amber-500/20" : "bg-primary/20"
          }`} />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2 flex-wrap">
              {isPreRsvp ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-sm">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  <span>EVENT BRIEFING &amp; DETAILS</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest border border-amber-500/30 shadow-sm">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{isPendingPayment ? "PAYMENT PENDING" : "APPROVAL PENDING"}</span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-all shrink-0 ml-4 cursor-pointer"
              title="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Briefing Content */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6 flex-1 custom-scrollbar bg-zinc-50/50">

          {/* Payment Info Card for Paid Events */}
          {isPaid && !isConfirmedPass && (
            <div className="bg-amber-50/90 border-2 border-amber-200/80 p-5 sm:p-6 rounded-3xl space-y-4 shadow-xs">
              
              {event.payment_details_locked ? (
                /* Locked State: Awaiting Venue Verification */
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-200/60 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                        <span>⏳ Venue Authorization in Progress</span>
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-amber-950">
                        Ticketing &amp; Pass Details Locked
                      </h3>
                      <p className="text-xs font-medium text-amber-800 leading-relaxed">
                        To protect community members from unauthorized events, ticketing instructions and organizer pass links remain locked until the physical venue management officially verifies this booking.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                /* Unlocked State: Venue Verified - External & Contact Options */
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2 border-b border-amber-200/60 pb-3">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                        <ShieldCheck className="h-3 w-3" />
                        <span>🛡️ Venue Verified Event</span>
                      </div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-amber-950">
                        Pass &amp; Ticket Acquisition
                      </h3>
                    </div>
                    {event.ticket_price > 0 && (
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-amber-800 uppercase block">Ticket Fee</span>
                        <span className="text-lg font-black text-amber-950">₹{event.ticket_price}</span>
                      </div>
                    )}
                  </div>

                  {guide.feeNote && (
                    <div className="p-3 rounded-2xl bg-amber-100/60 border border-amber-300/60 text-xs font-semibold text-amber-900 leading-snug">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 block mb-0.5">
                        Pass Inclusions
                      </span>
                      {guide.feeNote}
                    </div>
                  )}

                  {/* Actions: External Link or Direct Organizer Contact */}
                  <div className="space-y-3">
                    {event.external_ticket_link && (
                      <a
                        href={event.external_ticket_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-3 px-4 bg-black hover:bg-zinc-800 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-transform active:scale-95 shadow-sm"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Book on Official Ticketing Page →</span>
                      </a>
                    )}

                    {organizerPhone && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <a
                          href={`tel:${organizerPhone}`}
                          className="flex-1 py-2.5 px-3 bg-white border border-amber-200/90 hover:bg-amber-100/60 text-amber-950 rounded-xl text-[11px] font-bold flex items-center justify-center gap-2 transition-colors shadow-2xs"
                        >
                          <Phone className="h-3.5 w-3.5 text-amber-700" />
                          <span>Call Organizer ({organizerPhone})</span>
                        </a>
                        <a
                          href={whatsappPayUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-transform active:scale-95 shadow-2xs"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>WhatsApp for Passes →</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Standard Legal Disclaimer & Warning Box */}
                  <div className="bg-amber-100/70 border border-amber-300/80 p-3.5 rounded-2xl space-y-1.5 text-left">
                    <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-950">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                      <span>Important Payment &amp; Due Diligence Notice</span>
                    </div>
                    <p className="text-[11px] font-medium text-amber-900 leading-relaxed">
                      VibeCheck Space is a community event discovery platform and <strong>does not process, collect, hold, or escrow payments</strong>. All ticket transactions and financial arrangements take place directly between you and the event organizer.
                    </p>
                    <p className="text-[10px] text-amber-950 font-bold leading-normal">
                      ⚠️ Please exercise personal due diligence before making any payments. VibeCheck Space, its founders, and affiliates bear no responsibility or liability for payments, financial fraud, cancellations, event changes, or refund disputes.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pending Approval Callout Box for Free Events */}
          {isPendingApproval && (
            <div className="bg-amber-50/80 border-2 border-amber-200 p-5 sm:p-6 rounded-3xl space-y-2 shadow-xs">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-wider text-amber-950">
                    RSVP Registered • Awaiting Organizer Confirmation
                  </h3>
                  <p className="text-xs font-medium text-amber-800 leading-relaxed">
                    Your spot request has been sent to the organizer. Once the organizer reviews and issues your attendee pass, your official pass code and entry pass will be unlocked here!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 2. Full Day Itinerary / Schedule */}
          {guide.schedule && guide.schedule.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 text-black">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>The Day&apos;s Itinerary</span>
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  {guide.schedule.length} Milestones
                </span>
              </div>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
                {guide.schedule.map((step, idx) => (
                  <div key={idx} className="relative group">
                    {/* Timeline Node Icon */}
                    <div className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-white border-2 border-primary flex items-center justify-center group-hover:scale-125 transition-transform shadow-xs">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 tracking-wider">
                          {step.time}
                        </span>
                        <h4 className="text-xs font-black text-black">
                          {step.title}
                        </h4>
                      </div>
                      {step.description && (
                        <p className="text-xs font-medium text-zinc-500 leading-relaxed pl-0.5">
                          {step.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Highlights Strip */}
          {guide.highlights && guide.highlights.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 p-5 rounded-3xl space-y-3">
              <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <span>Program Highlights</span>
              </h3>
              <ul className="space-y-2">
                {guide.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs font-bold text-zinc-700">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="leading-snug">{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 4. What to Carry (Interactive Checklist) */}
          {guide.whatToCarry && guide.whatToCarry.length > 0 && (
            <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-black/5 pb-3">
                <h3 className="text-xs sm:text-sm font-black uppercase tracking-wider flex items-center gap-2 text-black">
                  <Backpack className="h-4 w-4 text-primary" />
                  <span>What to Carry Checklist</span>
                </h3>
                <span className="text-[10px] font-bold text-zinc-400">
                  Tap to check off items
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {guide.whatToCarry.map((item, idx) => {
                  const isChecked = !!checkedItems[idx];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleCheck(idx)}
                      className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-start gap-3 select-none ${
                        isChecked 
                          ? "bg-zinc-100/60 border-black/5 line-through text-zinc-400" 
                          : "bg-zinc-50 hover:bg-zinc-100/80 border-black/5 text-black"
                      }`}
                    >
                      <div className={`mt-0.5 h-4 w-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        isChecked ? "bg-primary border-primary text-black" : "border-zinc-300 bg-white"
                      }`}>
                        {isChecked && <Check className="h-3 w-3 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold leading-snug">{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Official Telegram Community Card (Locked for Pre-RSVP / Pending) */}
          {event.whatsapp_group_link && (
            <div className="bg-sky-50/60 border border-sky-200/80 p-5 rounded-3xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-sky-100 text-[#229ED9]">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900">Official Attendee Community</h4>
                    <span className="text-[10px] font-bold text-zinc-500">Live announcements &amp; attendee coordination</span>
                  </div>
                </div>
                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 font-bold">
                  Pass Required
                </span>
              </div>
              <p className="text-xs font-medium text-zinc-600 leading-relaxed">
                The Telegram group link will be unlocked and accessible once your entry pass is confirmed.
              </p>
            </div>
          )}

          {/* 6. Helpline & Queries Contact */}
          {guide.contacts && guide.contacts.length > 0 && (
            <div className="bg-white p-5 sm:p-6 rounded-3xl border border-black/5 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10 text-primary shrink-0">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900">Queries &amp; Emergency Helpline</h4>
                  <span className="text-[10px] font-bold text-zinc-400">Direct organizer contacts for event day</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {guide.contacts.map((contact, idx) => (
                  <a
                    key={idx}
                    href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}
                    className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-black/5 transition-all text-xs group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="h-8 w-8 rounded-xl bg-white border border-black/5 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                        <Phone className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-black truncate text-xs">{contact.name}</div>
                        {contact.role && (
                          <div className="text-[10px] font-medium text-zinc-500 truncate">{contact.role}</div>
                        )}
                      </div>
                    </div>
                    <span className="font-mono font-bold text-zinc-800 text-xs shrink-0 ml-2 group-hover:text-primary transition-colors">
                      {contact.phone}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Sticky Footer */}
        <div className="p-4 sm:px-8 border-t border-black/5 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
            {isPreRsvp ? (
              <>
                <Sparkles className="h-4 w-4 text-primary shrink-0" />
                <span>Review event briefing and checklist before securing your spot</span>
              </>
            ) : isPendingPayment ? (
              <>
                <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Registration saved. Pass unlocks upon payment confirmation.</span>
              </>
            ) : (
              <>
                <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                <span>RSVP saved. Pass unlocks upon organizer approval.</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {isPreRsvp && onRSVP && (
              <button
                onClick={() => {
                  onClose();
                  onRSVP();
                }}
                className="ringer-button bg-primary hover:bg-emerald-600 text-black text-xs font-black uppercase px-7 py-2.5 transition-all shadow-md active:scale-95 flex-1 sm:flex-none cursor-pointer"
              >
                RSVP Now
              </button>
            )}

            <button
              onClick={onClose}
              className="ringer-button bg-black hover:bg-zinc-800 text-white text-xs font-black uppercase px-7 py-2.5 transition-colors flex-1 sm:flex-none cursor-pointer"
            >
              {isPreRsvp ? "Close" : "Done"}
            </button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
