import React, { useState, useEffect } from "react";
import { 
  X, Calendar, MapPin, Phone, 
  ExternalLink, Sparkles, Clock, Check,
  AlertCircle, ShieldCheck, Globe, Users,
  Backpack, Info, Ticket, ChevronRight, UserCheck, Flame
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { formatEventTimeWithTimezone } from "@/lib/timezone";

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

interface EventFullDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: any;
  onRSVP?: () => void;
  isRegistered?: boolean;
}

export function EventFullDetailsModal({
  isOpen,
  onClose,
  event,
  onRSVP,
  isRegistered = false,
}: EventFullDetailsModalProps) {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

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

  if (!event) return null;

  const guide: AttendeeGuideData = event.attendee_guide || {};
  const isPaid = !!event.is_paid;
  const tzInfo = formatEventTimeWithTimezone(
    event.date_time, 
    event.end_time, 
    event.timezone || 'Asia/Kolkata'
  );

  const eventDateStr = event.date_time 
    ? new Date(event.date_time).toLocaleDateString(undefined, { 
        weekday: "long", 
        month: "short", 
        day: "numeric", 
        year: "numeric", 
        timeZone: event.timezone || 'Asia/Kolkata' 
      })
    : "Event Date";

  const eventTimeStr = tzInfo.timeRangeDisplay ? `${tzInfo.timeRangeDisplay} ${tzInfo.tzAbbr}` : "";
  const mapsLink = event.google_maps_link || guide.assemblyMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.location || ""}, ${event.city || ""}`)}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        showCloseButton={false}
        className="max-w-2xl w-[95vw] rounded-[32px] p-0 border border-black/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col bg-white text-black animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="p-6 sm:p-7 relative overflow-hidden shrink-0 bg-gradient-to-br from-zinc-900 via-black to-zinc-950 text-white">
          {/* Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-primary/20 blur-3xl pointer-events-none -mr-20 -mt-20" />

          <div className="flex items-start justify-between relative z-10 gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-black text-[10px] font-black uppercase tracking-widest shadow-sm">
                  <Sparkles className="h-3 w-3" />
                  <span>{event.category}</span>
                </span>

                {event.event_type === 'online' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider border border-white/10">
                    <Globe className="h-3 w-3 text-cyan-400" />
                    <span>Virtual / Online</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/10 text-white text-[10px] font-bold uppercase tracking-wider border border-white/10">
                    <MapPin className="h-3 w-3 text-primary" />
                    <span>In-Person</span>
                  </span>
                )}

                {isPaid ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-400/30">
                    <Ticket className="h-3 w-3" />
                    <span>{event.ticket_price > 0 ? `₹${event.ticket_price}` : 'Paid Event'}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                    <span>Free Entry</span>
                  </span>
                )}
              </div>

              <h2 className="text-xl sm:text-2xl md:text-3xl font-black italic tracking-tight uppercase leading-tight text-white break-words">
                {event.title}
              </h2>

              <p className="text-xs font-semibold text-zinc-400 flex items-center gap-1.5 flex-wrap">
                <span>Hosted by</span>
                <strong className="text-white font-black">{event.organizer_name || "VibeCheck Organizer"}</strong>
                {event.organizer_rating && Number(event.organizer_rating) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-amber-400 text-[10px] font-bold ml-1">
                    ★ {Number(event.organizer_rating).toFixed(1)}
                  </span>
                )}
                {event.organizer_instagram_verified && (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                )}
              </p>
            </div>

            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white/70 hover:text-white transition-all shrink-0 cursor-pointer -mt-1 -mr-1"
              title="Close details"
              aria-label="Close details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="overflow-y-auto p-5 sm:p-7 space-y-6 flex-1 custom-scrollbar bg-zinc-50/50">
          
          {/* Key Quick Info Strip */}
          <div className="p-4 bg-white rounded-2xl border border-black/5 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                <Calendar className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Date & Time</span>
                <span className="font-bold text-zinc-900 block text-xs">{eventDateStr}</span>
                <span className="text-[11px] text-zinc-500 font-medium">{eventTimeStr || event.timings}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0 mt-0.5">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Location / Venue</span>
                <span className="font-bold text-zinc-900 block text-xs truncate">{event.location || event.city}</span>
                <a
                  href={mapsLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline mt-0.5"
                >
                  <span>Open in Maps</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Capacity / Age Restrictions */}
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-zinc-100 text-zinc-700 shrink-0 mt-0.5">
                <Users className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Participant Capacity</span>
                <span className="font-bold text-zinc-900 block text-xs">
                  {event.participant_limit ? `${event.participant_limit} Spots Total` : "Open Community Event"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-zinc-100 text-zinc-700 shrink-0 mt-0.5">
                <UserCheck className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Age Eligibility</span>
                <span className="font-bold text-zinc-900 block text-xs">
                  {event.suitable_age 
                    ? event.suitable_age 
                    : event.min_age 
                      ? `${event.min_age}+ Years` 
                      : "All Age Groups Welcome"}
                </span>
              </div>
            </div>
          </div>

          {/* Full Detailed Description Section */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary" />
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900">
                Complete Vibe Details &amp; Overview
              </h3>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-black/5 shadow-xs">
              <div className="text-zinc-800 text-xs sm:text-sm font-medium leading-relaxed whitespace-pre-line">
                {event.description}
              </div>
            </div>
          </div>

          {/* Schedule / Agenda Breakdown (if present) */}
          {guide.schedule && guide.schedule.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-primary" />
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900">
                  Program Itinerary &amp; Timeline
                </h3>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/5 shadow-xs space-y-3">
                {guide.schedule.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative pb-3 last:pb-0">
                    <div className="text-[11px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg shrink-0">
                      {item.time}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-black text-zinc-900 leading-tight">
                        {item.title}
                      </h5>
                      {item.description && (
                        <p className="text-[11px] text-zinc-600 font-medium mt-0.5 leading-snug">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Highlights & Perks (if present) */}
          {guide.highlights && guide.highlights.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Flame className="h-3.5 w-3.5 text-amber-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900">
                  Event Highlights &amp; Inclusions
                </h3>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/5 shadow-xs">
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {guide.highlights.map((highlight, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-zinc-700">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                      <span className="font-semibold">{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* What to Bring / Carry (if present) */}
          {guide.whatToCarry && guide.whatToCarry.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Backpack className="h-3.5 w-3.5 text-indigo-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900">
                  What to Bring &amp; Preparation
                </h3>
              </div>

              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/5 shadow-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {guide.whatToCarry.map((item, idx) => {
                    const isChecked = !!checkedItems[idx];
                    return (
                      <div
                        key={idx}
                        onClick={() => toggleCheck(idx)}
                        className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 select-none ${
                          isChecked 
                            ? "bg-zinc-100/60 border-black/5 line-through text-zinc-400" 
                            : "bg-zinc-50 hover:bg-zinc-100/80 border-black/5 text-black"
                        }`}
                      >
                        <div className={`mt-0.5 h-3.5 w-3.5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? "bg-primary border-primary text-black" : "border-zinc-300 bg-white"
                        }`}>
                          {isChecked && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                        </div>
                        <span className="font-semibold leading-snug">{item}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Assembly Point & Important Notes */}
          {(guide.assemblyPoint || (guide.importantNotes && guide.importantNotes.length > 0)) && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2">
                <Info className="h-3.5 w-3.5 text-zinc-500" />
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900">
                  Assembly &amp; Guidelines
                </h3>
              </div>

              <div className="bg-amber-50/70 p-4 sm:p-5 rounded-2xl border border-amber-200/60 space-y-2 text-xs">
                {guide.assemblyPoint && (
                  <div>
                    <span className="font-black text-amber-950 uppercase text-[10px] tracking-wider block">
                      Meeting / Assembly Spot:
                    </span>
                    <p className="font-semibold text-amber-900 mt-0.5">{guide.assemblyPoint}</p>
                  </div>
                )}
                {guide.importantNotes && guide.importantNotes.map((note, idx) => (
                  <p key={idx} className="text-amber-800 font-medium flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{note}</span>
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Host & Emergency Contacts */}
          {((guide.contacts && guide.contacts.length > 0) || event.contact_info) && (
            <div className="p-4 bg-white rounded-2xl border border-black/5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">Host Contact &amp; Coordination</span>
                <span className="font-bold text-zinc-900 block">
                  {(guide.contacts && guide.contacts[0]?.name) || event.organizer_name || "Event Team"}
                </span>
                <span className="text-zinc-500 font-medium">
                  {(guide.contacts && guide.contacts[0]?.phone) || event.contact_info}
                </span>
              </div>
              {((guide.contacts && guide.contacts[0]?.phone) || event.contact_info) && (
                <a
                  href={`tel:${((guide.contacts && guide.contacts[0]?.phone) || event.contact_info).replace(/[^0-9+]/g, '')}`}
                  className="ringer-button bg-zinc-100 hover:bg-zinc-200 text-black text-[11px] font-black py-2 px-3.5 rounded-xl inline-flex items-center gap-1.5 transition-colors"
                >
                  <Phone className="h-3 w-3" />
                  <span>Call Organizer</span>
                </a>
              )}
            </div>
          )}

        </div>

        {/* Modal Action Footer */}
        <div className="p-4 sm:px-7 border-t border-black/5 bg-white flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="ringer-button bg-zinc-100 hover:bg-zinc-200 text-black text-xs font-black uppercase py-2.5 px-5 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
          {onRSVP && !isRegistered && (
            <button
              onClick={() => {
                onClose();
                onRSVP();
              }}
              className="ringer-button bg-primary hover:bg-emerald-500 text-black text-xs font-black uppercase py-2.5 px-6 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
            >
              {isPaid ? "Proceed to Book" : "RSVP for Vibe"}
            </button>
          )}
        </div>

      </DialogContent>
    </Dialog>
  );
}
