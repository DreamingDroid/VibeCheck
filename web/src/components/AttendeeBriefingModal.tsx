"use client";

import React, { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import { 
  X, CheckCircle2, Calendar, MapPin, Phone, 
  ExternalLink, Sparkles, Clock, Check, Copy,
  AlertCircle, Backpack, RotateCcw,
  ShieldCheck, QrCode, Send, Globe, Ticket, Trees
} from "lucide-react";
import { formatTelegramLink } from "@/lib/telegramGroup";
import { formatEventTimeWithTimezone } from "@/lib/timezone";
import { getCategoryAccentColor, getCategoryDarkTitleColor } from "@/components/CategoryDecorations";
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

export type BriefingTabId = 
  | 'pass' 
  | 'payment' 
  | 'itinerary' 
  | 'checklist' 
  | 'highlights' 
  | 'community' 
  | 'contacts';

interface AttendeeBriefingModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
  rsvpStatus?: 'pending' | 'confirmed';
  passCode?: string;
  isPreRsvp?: boolean;
  initialTab?: BriefingTabId;
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
  initialTab,
  onRSVP,
  onDownloadICS,
}: AttendeeBriefingModalProps) {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<BriefingTabId>('itinerary');

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
        margin: 2,
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

  const guide: AttendeeGuideData = event?.attendee_guide || {};
  const isPaid = !!event?.is_paid;
  const isPending = !isPreRsvp && rsvpStatus === 'pending';
  const isPendingPayment = !isPreRsvp && isPaid && isPending;
  const isPendingApproval = !isPreRsvp && !isPaid && isPending;
  const isConfirmedPass = !isPreRsvp && !isPending && !!passCode;

  // Detect availability of each content section
  const hasSchedule = Boolean(guide.schedule && guide.schedule.length > 0);
  const hasChecklist = Boolean(guide.whatToCarry && guide.whatToCarry.length > 0);
  const hasHighlights = Boolean(guide.highlights && guide.highlights.length > 0);
  const hasPaymentInfo = Boolean(isPaid || (event?.ticket_price && Number(event.ticket_price) > 0) || guide.feeNote);
  const hasCommunity = Boolean(event?.whatsapp_group_link);
  const hasContacts = Boolean((guide.contacts && guide.contacts.length > 0) || event?.organizer_phone || event?.phone);

  // Build the list of available tabs dynamically
  const availableTabs = useMemo(() => {
    const tabs: { id: BriefingTabId; label: string; icon: React.ReactNode; badge?: string | number }[] = [];

    if (isConfirmedPass) {
      tabs.push({ id: 'pass', label: 'Pass QR', icon: <QrCode className="h-3.5 w-3.5" /> });
    }
    if (hasPaymentInfo) {
      tabs.push({ 
        id: 'payment', 
        label: 'Pass & Payment', 
        icon: <Ticket className="h-3.5 w-3.5" />, 
        badge: event?.ticket_price && Number(event.ticket_price) > 0 ? `₹${event.ticket_price}` : undefined 
      });
    }
    if (hasSchedule) {
      tabs.push({ 
        id: 'itinerary', 
        label: 'Itinerary', 
        icon: <Clock className="h-3.5 w-3.5" />, 
        badge: guide.schedule?.length 
      });
    }
    if (hasChecklist) {
      tabs.push({ 
        id: 'checklist', 
        label: 'Checklist', 
        icon: <Backpack className="h-3.5 w-3.5" />, 
        badge: guide.whatToCarry?.length 
      });
    }
    if (hasHighlights) {
      tabs.push({ 
        id: 'highlights', 
        label: 'Highlights', 
        icon: <Sparkles className="h-3.5 w-3.5" />,
        badge: guide.highlights?.length
      });
    }
    if (hasCommunity) {
      tabs.push({ 
        id: 'community', 
        label: 'Community', 
        icon: <Send className="h-3.5 w-3.5" /> 
      });
    }
    if (hasContacts) {
      tabs.push({ 
        id: 'contacts', 
        label: 'Helpline', 
        icon: <Phone className="h-3.5 w-3.5" /> 
      });
    }

    return tabs;
  }, [isConfirmedPass, hasPaymentInfo, hasSchedule, hasChecklist, hasHighlights, hasCommunity, hasContacts, event?.ticket_price, guide.schedule?.length, guide.whatToCarry?.length, guide.highlights?.length]);

  // Synchronize activeTab whenever isOpen or initialTab changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialTab && availableTabs.some(t => t.id === initialTab)) {
      setActiveTab(initialTab);
    } else if (isConfirmedPass) {
      setActiveTab('pass');
    } else if (isPendingPayment && hasPaymentInfo) {
      setActiveTab('payment');
    } else if (hasSchedule) {
      setActiveTab('itinerary');
    } else if (hasChecklist) {
      setActiveTab('checklist');
    } else if (availableTabs.length > 0) {
      setActiveTab(availableTabs[0].id);
    }
  }, [isOpen, initialTab, isConfirmedPass, isPendingPayment, hasPaymentInfo, hasSchedule, hasChecklist, availableTabs]);

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

  const handleResetChecklist = () => {
    setCheckedItems({});
    if (typeof window !== "undefined" && storageKey) {
      try {
        localStorage.removeItem(storageKey);
      } catch (err) {
        console.error("Error clearing checklist from localStorage:", err);
      }
    }
  };

  const totalChecklistItems = guide.whatToCarry?.length || 0;
  const checkedCount = useMemo(() => {
    if (!guide.whatToCarry) return 0;
    return guide.whatToCarry.filter((_, idx) => checkedItems[idx]).length;
  }, [guide.whatToCarry, checkedItems]);

  const handleCopyCode = () => {
    if (passCode) {
      navigator.clipboard.writeText(passCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!event) return null;

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

  const category = event?.category || "General";
  const categoryAccent = getCategoryAccentColor(category) || "#10B981";

  const getCategoryVibrantColor = (cat: string) => {
    switch (cat) {
      case "Adventure": return "#059669";
      case "Music": return "#D97706";
      case "Nightlife": return "#6366F1";
      case "Arts & Culture":
      case "Arts": return "#9333EA";
      case "Sports": return "#EA580C";
      case "Food & Drink":
      case "Food": return "#E11D48";
      case "Wellness": return "#0D9488";
      case "Workshops":
      case "Education": return "#2563EB";
      case "Spiritual": return "#7C3AED";
      case "Comedy": return "#D97706";
      case "Social": return "#E11D48";
      case "Fitness": return "#EA580C";
      case "Tech": return "#0284C7";
      default: return categoryAccent || "#059669";
    }
  };
  const categoryTextColor = getCategoryVibrantColor(category);

  const getCardTypeHeader = () => {
    switch (activeTab) {
      case 'checklist':
        return {
          title: "What to Carry Checklist",
          icon: <Backpack className="h-4.5 w-4.5" />,
          color: categoryTextColor || "#059669",
        };
      case 'itinerary':
        return {
          title: "The Day's Itinerary",
          icon: <Clock className="h-4.5 w-4.5" />,
          color: categoryTextColor || "#10B981",
        };
      case 'highlights':
        return {
          title: "Program Highlights",
          icon: <Sparkles className="h-4.5 w-4.5" />,
          color: categoryTextColor || "#8B5CF6",
        };
      case 'payment':
        return {
          title: "Pass & Payment Info",
          icon: <Ticket className="h-4.5 w-4.5" />,
          color: categoryTextColor || "#D97706",
        };
      case 'pass':
        return {
          title: "Confirmed Entry Pass",
          icon: <ShieldCheck className="h-4.5 w-4.5" />,
          color: categoryTextColor || "#10B981",
        };
      case 'community':
        return {
          title: "Attendee Community",
          icon: <Send className="h-4.5 w-4.5" />,
          color: "#229ED9",
        };
      case 'contacts':
        return {
          title: "Queries & Helpline",
          icon: <Phone className="h-4.5 w-4.5" />,
          color: "#2563EB",
        };
      default:
        return {
          title: "Event Details",
          icon: <Sparkles className="h-4.5 w-4.5" />,
          color: categoryTextColor || "#10B981",
        };
    }
  };

  const headerInfo = getCardTypeHeader();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        showCloseButton={false}
        className="max-w-2xl w-[94vw] rounded-[28px] sm:rounded-[32px] p-0 border border-black/10 shadow-2xl overflow-hidden max-h-[88vh] flex flex-col bg-white text-black animate-in zoom-in-95 duration-200"
      >
        
        {/* ─── 1. Vibrant Themed Header (Italic Title, Styled by Category & Theme) ─── */}
        <div 
          className="px-5 py-3.5 sm:px-6 sm:py-4 border-b border-black/10 flex items-center justify-between shrink-0 relative overflow-hidden"
          style={{ 
            background: `linear-gradient(135deg, ${categoryAccent}16 0%, ${categoryAccent}05 55%, #ffffff 100%)` 
          }}
        >
          {/* Category Accent Top Border Bar */}
          <div 
            className="absolute top-0 left-0 right-0 h-1.5"
            style={{ backgroundColor: categoryAccent }}
          />

          <div className="flex items-center gap-2.5 min-w-0">
            <div 
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs border"
              style={{ 
                backgroundColor: `${categoryAccent}22`, 
                borderColor: `${categoryAccent}35`,
                color: categoryTextColor 
              }}
            >
              {headerInfo.icon}
            </div>

            <h2 
              className="text-base sm:text-lg font-black italic tracking-tight uppercase truncate"
              style={{ color: categoryTextColor }}
            >
              {headerInfo.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 -mr-1.5 rounded-full hover:bg-black/5 text-zinc-400 hover:text-black transition-colors shrink-0 cursor-pointer"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ─── 3. Single Active Section View (No Endless Scrolling) ─── */}
        <div className="overflow-y-auto p-4 sm:p-6 flex-1 custom-scrollbar bg-zinc-50/50">

          {/* TAB: CONFIRMED ENTRY PASS QR */}
          {activeTab === 'pass' && isConfirmedPass && (
            <div className="flex flex-col items-center justify-center space-y-4 text-center py-2">
              <div className="px-6 py-2 bg-zinc-900 rounded-2xl border border-black/10 font-mono text-xl sm:text-2xl font-black tracking-widest text-white shadow-inner">
                {passCode}
              </div>

              {/* Crisp Square QR Code */}
              <div className="p-3 bg-white shadow-xl border-4 border-black/5 inline-block mx-auto rounded-none">
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

              <div className="space-y-1 max-w-sm">
                <p className="text-xs font-bold text-zinc-900">
                  Gate Check-in Pass • Entry Verified
                </p>
                <p className="text-[11px] font-medium text-zinc-500 leading-snug">
                  Present this QR code or Pass Code <strong className="text-black font-mono">{passCode}</strong> at the venue entrance.
                </p>
              </div>

              {event.whatsapp_group_link && (
                <a
                  href={formatTelegramLink(event.whatsapp_group_link)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full max-w-xs py-2.5 px-4 bg-[#229ED9] hover:bg-[#1d8dc3] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#229ED9]/20 active:scale-95 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5 fill-white" />
                  <span>Join Attendee Telegram Group</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          )}

          {/* TAB: PASS & PAYMENT INFORMATION */}
          {activeTab === 'payment' && (
            <div className="space-y-4">
              <div className="bg-amber-50/90 border-2 border-amber-200/80 p-5 rounded-3xl space-y-4 shadow-xs">
                {event.payment_details_locked ? (
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
                  <div className="space-y-4">
                    <div className="flex items-start justify-between gap-2 border-b border-amber-200/60 pb-3">
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                          {event.is_outdoor ? (
                            <>
                              <Trees className="h-3 w-3 text-emerald-700" />
                              <span>🏞️ Outdoor Gathering</span>
                            </>
                          ) : event.event_type === 'online' ? (
                            <>
                              <Globe className="h-3 w-3 text-cyan-700" />
                              <span>💻 Virtual Event</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="h-3 w-3 text-emerald-700" />
                              <span>🛡️ Venue Verified Event</span>
                            </>
                          )}
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
                      <div className="p-3.5 rounded-2xl bg-amber-100/60 border border-amber-300/60 text-xs font-semibold text-amber-900 leading-snug">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-950 block mb-1">
                          Pass Inclusions
                        </span>
                        {guide.feeNote}
                      </div>
                    )}

                    <div className="space-y-2.5">
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

                    <div className="bg-amber-100/70 border border-amber-300/80 p-3.5 rounded-2xl space-y-1 text-left">
                      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-amber-950">
                        <AlertCircle className="h-3.5 w-3.5 text-amber-700 shrink-0" />
                        <span>Important Payment Notice</span>
                      </div>
                      <p className="text-[11px] font-medium text-amber-900 leading-relaxed">
                        VibeCheck Space is a community event discovery platform and <strong>does not process or escrow payments</strong>. Transactions take place directly with the host.
                      </p>
                      <p className="text-[10px] text-amber-950 font-bold leading-normal">
                        ⚠️ Please exercise personal due diligence before making any payments.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {isPendingApproval && (
                <div className="bg-amber-50/80 border-2 border-amber-200 p-4 rounded-2xl space-y-1.5 shadow-xs">
                  <div className="flex items-start gap-2.5">
                    <Clock className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-950">
                        RSVP Registered • Awaiting Host Confirmation
                      </h4>
                      <p className="text-[11px] font-medium text-amber-800 leading-relaxed">
                        Your spot request is saved. Once the organizer confirms, your verified entry pass will unlock.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB: ITINERARY / SCHEDULE */}
          {activeTab === 'itinerary' && (
            <div className="space-y-4">
              {guide.assemblyPoint && (
                <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-900 block">
                        Assembly Point
                      </span>
                      <p className="text-xs font-medium text-zinc-700 leading-snug">
                        {guide.assemblyPoint}
                      </p>
                    </div>
                  </div>
                  {mapsLink && (
                    <a
                      href={mapsLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-black text-white text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 hover:bg-zinc-800 transition-colors"
                    >
                      <span>Maps</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}

              {guide.schedule && guide.schedule.length > 0 ? (
                <div className="bg-white p-5 rounded-3xl border border-black/5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
                    <h3 
                      className="text-xs font-black italic uppercase tracking-wider flex items-center gap-2"
                      style={{ color: categoryTextColor }}
                    >
                      <Clock className="h-4 w-4" />
                      <span>The Day&apos;s Itinerary</span>
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {guide.schedule.length} Milestones
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-zinc-200">
                    {guide.schedule.map((step, idx) => (
                      <div key={idx} className="relative group">
                        <div 
                          className="absolute -left-6 top-0.5 h-4 w-4 rounded-full bg-white border-2 flex items-center justify-center group-hover:scale-125 transition-transform shadow-xs"
                          style={{ borderColor: categoryTextColor }}
                        >
                          <div 
                            className="h-1.5 w-1.5 rounded-full" 
                            style={{ backgroundColor: categoryTextColor }}
                          />
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
              ) : (
                <div className="p-8 text-center bg-white rounded-3xl border border-black/5">
                  <Clock className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-zinc-500">No schedule milestones published yet.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: WHAT TO CARRY CHECKLIST */}
          {activeTab === 'checklist' && (
            <div className="space-y-4">
              {guide.whatToCarry && guide.whatToCarry.length > 0 ? (
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-black/5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-black/5 pb-3">
                    <div>
                      <h3 
                        className="text-xs sm:text-sm font-black italic uppercase tracking-wider flex items-center gap-2"
                        style={{ color: categoryTextColor }}
                      >
                        <Backpack className="h-4 w-4" />
                        <span>What to Carry Checklist</span>
                      </h3>
                      <p className="text-[10px] font-bold text-zinc-400 mt-0.5">
                        Tap items to check them off as you pack
                      </p>
                    </div>

                    {checkedCount > 0 && (
                      <button
                        type="button"
                        onClick={handleResetChecklist}
                        className="text-[10px] font-black uppercase tracking-wider text-zinc-400 hover:text-zinc-700 flex items-center gap-1 transition-colors cursor-pointer"
                        title="Clear checklist checkmarks"
                      >
                        <RotateCcw className="h-3 w-3" />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>

                  {/* Checklist Packing Progress Indicator */}
                  <div className="space-y-1.5 bg-zinc-50 p-3 rounded-2xl border border-black/5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-zinc-600 text-[11px]">Packing Progress</span>
                      <span className="text-black text-xs font-black">
                        {checkedCount} / {totalChecklistItems} packed ({totalChecklistItems > 0 ? Math.round((checkedCount / totalChecklistItems) * 100) : 0}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-zinc-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-300 rounded-full"
                        style={{ width: `${totalChecklistItems > 0 ? (checkedCount / totalChecklistItems) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {guide.whatToCarry.map((item, idx) => {
                      const isChecked = !!checkedItems[idx];
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleCheck(idx)}
                          className={`p-3 rounded-2xl border text-left cursor-pointer transition-all flex items-start gap-3 select-none active:scale-[0.99] ${
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
              ) : (
                <div className="p-8 text-center bg-white rounded-3xl border border-black/5">
                  <Backpack className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-zinc-500">No packing checklist required for this event.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: PROGRAM HIGHLIGHTS */}
          {activeTab === 'highlights' && (
            <div className="space-y-4">
              {guide.highlights && guide.highlights.length > 0 ? (
                <div className="bg-white p-5 sm:p-6 rounded-3xl border border-black/5 shadow-xs space-y-4">
                  <div className="flex items-center justify-between border-b border-black/5 pb-2.5">
                    <h3 
                      className="text-xs font-black italic uppercase tracking-wider flex items-center gap-2"
                      style={{ color: categoryTextColor }}
                    >
                      <Sparkles className="h-4 w-4" />
                      <span>Program Highlights</span>
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {guide.highlights.length} Perks
                    </span>
                  </div>

                  <ul className="space-y-2.5">
                    {guide.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start gap-3 p-3 rounded-2xl bg-zinc-50 border border-black/5 text-xs font-bold text-zinc-800">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                        <span className="leading-snug">{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-3xl border border-black/5">
                  <Sparkles className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-zinc-500">No highlights specified for this event.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: ATTENDEE COMMUNITY / TELEGRAM */}
          {activeTab === 'community' && (
            <div className="space-y-4">
              {event.whatsapp_group_link ? (
                <div className="bg-sky-50/70 border border-sky-200 p-5 sm:p-6 rounded-3xl space-y-4 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2.5 rounded-xl bg-sky-100 text-[#229ED9]">
                        <Send className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                          Official Attendee Community
                        </h4>
                        <span className="text-[10px] font-bold text-zinc-500">
                          Live announcements &amp; attendee coordination
                        </span>
                      </div>
                    </div>
                    {isConfirmedPass ? (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Pass Active
                      </span>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200">
                        Pass Required
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-medium text-zinc-700 leading-relaxed">
                    Connect with fellow confirmed attendees, ask questions directly to event coordinators, and receive live scheduling updates on event day.
                  </p>

                  {isConfirmedPass ? (
                    <a
                      href={formatTelegramLink(event.whatsapp_group_link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 px-4 bg-[#229ED9] hover:bg-[#1d8dc3] text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-[#229ED9]/20 active:scale-95 cursor-pointer"
                    >
                      <Send className="h-4 w-4 fill-white" />
                      <span>Join Official Telegram Group →</span>
                    </a>
                  ) : (
                    <div className="p-3 bg-amber-100/60 border border-amber-200/80 rounded-2xl text-[11px] font-bold text-amber-900">
                      🔒 The Telegram invite link unlocks automatically once your attendee pass is confirmed.
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center bg-white rounded-3xl border border-black/5">
                  <Send className="h-8 w-8 text-zinc-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-zinc-500">No community chat link published for this event.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: HELPLINE & EMERGENCY CONTACTS */}
          {activeTab === 'contacts' && (
            <div className="space-y-4">
              <div className="bg-white p-5 sm:p-6 rounded-3xl border border-black/5 shadow-xs space-y-4">
                <div className="flex items-center gap-2.5 border-b border-black/5 pb-3">
                  <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-wider text-zinc-900">
                      Queries &amp; Helpline
                    </h4>
                    <span className="text-[10px] font-bold text-zinc-400">
                      Direct contacts for event queries &amp; assistance
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {guide.contacts && guide.contacts.length > 0 ? (
                    guide.contacts.map((contact, idx) => (
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
                    ))
                  ) : organizerPhone ? (
                    <a
                      href={`tel:${organizerPhone}`}
                      className="flex items-center justify-between p-3 rounded-2xl bg-zinc-50 hover:bg-zinc-100 border border-black/5 transition-all text-xs group col-span-full"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-xl bg-white border border-black/5 flex items-center justify-center text-primary shrink-0 group-hover:scale-105 transition-transform shadow-2xs">
                          <Phone className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-black truncate text-xs">{organizerContactName}</div>
                          <div className="text-[10px] font-medium text-zinc-500 truncate">Event Organizer</div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-zinc-800 text-xs shrink-0 ml-2 group-hover:text-primary transition-colors">
                        {organizerPhone}
                      </span>
                    </a>
                  ) : (
                    <div className="p-4 text-center text-zinc-500 text-xs font-bold col-span-full">
                      No emergency phone numbers listed.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ─── 4. Modal Simple Footer ─── */}
        <div className="px-5 py-3 border-t border-black/5 bg-white flex items-center justify-end gap-2 shrink-0">
          {isPreRsvp && onRSVP && (
            <button
              onClick={() => {
                onClose();
                onRSVP();
              }}
              className="ringer-button bg-primary hover:bg-emerald-600 text-black text-xs font-black uppercase px-5 py-2 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer"
            >
              RSVP Now
            </button>
          )}

          <button
            onClick={onClose}
            className="ringer-button bg-zinc-900 hover:bg-black text-white text-xs font-black uppercase px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
