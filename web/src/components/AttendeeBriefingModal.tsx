"use client";

import React, { useState } from "react";
import { 
  X, CheckCircle2, Calendar, MapPin, Phone, 
  ExternalLink, Sparkles, Clock, Check, 
  AlertCircle, Share2, CalendarPlus, Backpack,
  Compass, ShieldCheck, Ticket
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  onDownloadICS?: () => void;
  onShare?: () => void;
}

const DEFAULT_ATTENDEE_GUIDE: AttendeeGuideData = {
  schedule: [
    { time: "09:00 AM – 10:30 AM", title: "Assembly & Tree Climbing", description: "Build your own ladder and claim the prize on the tree." },
    { time: "10:30 AM – 11:00 AM", title: "Recess & Recharge", description: "Quick break, hydration, and group energizer." },
    { time: "11:00 AM – 12:30 PM", title: "Terrain Mapping & Compass Crafting", description: "Read real topographic maps, sculpt terrain in clay, and make a working compass." },
    { time: "12:30 PM – 01:15 PM", title: "Community Lunch & Games", description: "Outdoor picnic lunch, social bonding, and interactive games." },
    { time: "01:30 PM – 02:30 PM", title: "Secret Scroll Treasure Hunt", description: "Follow cryptic navigational clues across the campus grounds." },
    { time: "02:30 PM – 03:30 PM", title: "Catapult Engineering & Target Challenge", description: "Build a wooden catapult to take home and finish with the campus BINGO tour." }
  ],
  highlights: [
    "Full-day hands-on outdoor experiential program (Drop in morning, pick-up in evening)",
    "Designed to work with Hands, Head, and Heart in a safe, guided outdoor space",
    "Experiential nature education — build real tools, solve creative challenges"
  ],
  whatToCarry: [
    "Wear shoes and comfortable outdoor clothing",
    "1 Litre reusable water bottle (refill stations available)",
    "Hat / Cap & Sunscreen (sunny daytime weather)",
    "Backpack to keep your hands free",
    "Carry snacks and packed Lunch",
    "Carry a notebook and pen (all tools and materials will be provided)"
  ],
  assemblyPoint: "Eastern Ghats Biodiversity Center, Rushikonda, Madhurawada, Vizag",
  contacts: [
    { name: "Vimal", phone: "+91 7330880274", role: "Program Lead" },
    { name: "Event Desk", phone: "+91 9640856967", role: "Logistics & Enquiries" }
  ],
  feeNote: "₹800/- per participant | Pre-registration confirmed with RSVP."
};

export function AttendeeBriefingModal({
  isOpen,
  onClose,
  event,
  rsvpStatus = 'confirmed',
  passCode,
  onDownloadICS,
  onShare,
}: AttendeeBriefingModalProps) {
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  if (!event) return null;

  const guide: AttendeeGuideData = event.attendee_guide || DEFAULT_ATTENDEE_GUIDE;
  const isPaid = !!event.is_paid;
  const isPendingPayment = isPaid && rsvpStatus === 'pending';

  const toggleCheck = (index: number) => {
    setCheckedItems((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const mapsLink = event.google_maps_link || guide.assemblyMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.location || guide.assemblyPoint}, ${event.city || "Vizag"}`)}`;

  const eventDateStr = event.date_time 
    ? new Date(event.date_time).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" })
    : "Event Date";

  const eventTimeStr = event.date_time
    ? new Date(event.date_time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : "";

  const endTimeStr = event.end_time
    ? ` → ${new Date(event.end_time).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`
    : "";

  // Contact number for payment coordination
  const primaryContact = (guide.contacts && guide.contacts[0]) || { name: event.organizer_name || "Organizer", phone: "+91 7330880274" };
  const whatsappPayMsg = `Hi ${primaryContact.name || 'Organizer'}, I have registered for "${event.title}" on VibeCheck and would like to complete my payment for the Attendee Pass!`;
  const whatsappPayUrl = `https://wa.me/${primaryContact.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(whatsappPayMsg)}`;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl w-[95vw] rounded-[32px] p-0 border-none shadow-2xl overflow-hidden max-h-[90vh] flex flex-col bg-white text-black animate-in zoom-in-95 duration-200">
        
        {/* Pass Header Banner */}
        <div className={`p-6 sm:p-8 relative overflow-hidden shrink-0 text-white ${
          isPendingPayment 
            ? "bg-gradient-to-br from-amber-950 via-zinc-900 to-black" 
            : "bg-gradient-to-br from-zinc-900 via-black to-zinc-950"
        }`}>
          {/* Subtle glow effect */}
          <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20 ${
            isPendingPayment ? "bg-amber-500/20" : "bg-primary/20"
          }`} />
          
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                {isPendingPayment ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest shadow-sm">
                    <Clock className="h-3.5 w-3.5" />
                    <span>REGISTRATION RECEIVED • PASS PENDING PAYMENT</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-black text-[10px] font-black uppercase tracking-widest shadow-sm">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>CONFIRMED ATTENDEE PASS</span>
                  </div>
                )}

                {passCode && (
                  <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white font-mono text-[10px] font-black tracking-widest border border-white/10">
                    PASS #{passCode}
                  </span>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-black italic tracking-tight uppercase leading-tight">
                {event.title}
              </h2>
              <p className="text-xs font-bold text-zinc-400">
                Organized by <span className="text-white">{event.organizer_name || "VibeCheck Organizer"}</span> • {event.category}
              </p>
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
        <div className="overflow-y-auto p-6 sm:p-8 space-y-8 flex-1 custom-scrollbar bg-zinc-50/50">

          {/* Pending Payment Callout Box for Paid Events */}
          {isPendingPayment && (
            <div className="bg-amber-50 border-2 border-amber-200 p-5 sm:p-6 rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-wider text-amber-950">
                    Complete Payment with Organizer to Unlock Official Pass
                  </h3>
                  <p className="text-xs font-medium text-amber-800 leading-relaxed">
                    Your spot registration has been recorded! For paid events with limited slots, the organizer issues your verified pass once payment is received.
                  </p>
                  {guide.feeNote && (
                    <p className="text-xs font-black text-amber-900 pt-1">
                      Event Fee: {guide.feeNote}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href={whatsappPayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ringer-button bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase px-5 py-2.5 flex items-center gap-2 transition-transform active:scale-95 shadow-sm"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>Contact Organizer to Pay (WhatsApp) →</span>
                </a>
                <a
                  href={`tel:${primaryContact.phone.replace(/[^0-9+]/g, "")}`}
                  className="ringer-button bg-white hover:bg-zinc-100 text-black border border-black/10 text-xs font-black uppercase px-4 py-2.5 flex items-center gap-2"
                >
                  <Phone className="h-3.5 w-3.5 text-zinc-600" />
                  <span>Call {primaryContact.name} ({primaryContact.phone})</span>
                </a>
              </div>
            </div>
          )}
          
          {/* 1. Time, Location & Assembly Strip */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date & Time Card */}
            <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                <Calendar className="h-4 w-4" />
                <span>DATE & SCHEDULE</span>
              </div>
              <p className="text-base font-black text-black leading-snug">
                {eventDateStr}
              </p>
              <p className="text-xs font-bold text-zinc-500">
                {eventTimeStr} {endTimeStr}
                {event.timings && <span className="block mt-0.5 text-primary text-[11px] font-bold">{event.timings}</span>}
              </p>
              {onDownloadICS && (
                <button
                  onClick={onDownloadICS}
                  className="pt-2 text-[11px] font-black uppercase tracking-wider text-black hover:text-primary flex items-center gap-1.5 transition-colors"
                >
                  <CalendarPlus className="h-3.5 w-3.5 text-primary" />
                  <span>Add to Calendar</span>
                </button>
              )}
            </div>

            {/* Location & Assembly Point Card */}
            <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-xs space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary">
                <MapPin className="h-4 w-4" />
                <span>LOCATION & ASSEMBLY</span>
              </div>
              <p className="text-sm font-black text-black leading-snug">
                {event.location || guide.assemblyPoint}
              </p>
              <p className="text-xs text-zinc-500 font-medium line-clamp-2">
                {guide.assemblyPoint || event.location}
              </p>
              <a
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="pt-2 text-[11px] font-black uppercase tracking-wider text-black hover:text-primary flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="h-3.5 w-3.5 text-primary" />
                <span>Open in Google Maps →</span>
              </a>
            </div>
          </div>

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
                          : "bg-zinc-50/80 hover:bg-zinc-100/80 border-black/5 text-zinc-800"
                      }`}
                    >
                      <div className={`h-5 w-5 rounded-lg border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        isChecked ? "bg-primary border-primary text-white" : "border-zinc-300 bg-white"
                      }`}>
                        {isChecked && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                      </div>
                      <span className="text-xs font-bold leading-snug">
                        {item}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. Official Attendee WhatsApp Group */}
          {event.whatsapp_group_link && (
            <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-800 flex items-center gap-1.5">
                  <span>💬</span>
                  <span>Official Attendee WhatsApp Group</span>
                </h4>
                <span className="text-[9px] font-black uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">
                  Community Chat
                </span>
              </div>
              <p className="text-xs text-emerald-950 font-bold leading-snug">
                Join the official group chat to connect with the organizer, coordinate with other attendees, and get real-time announcements.
              </p>
              <a
                href={event.whatsapp_group_link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
              >
                <span>Join Official WhatsApp Group</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          )}

          {/* 6. Helpline & Queries Contact */}
          {guide.contacts && guide.contacts.length > 0 && (
            <div className="bg-white p-5 rounded-2xl border border-black/5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-primary" />
                  <span>Queries & Emergency Helpline</span>
                </h4>
                {guide.feeNote && (
                  <span className="text-[10px] font-black text-emerald-600 uppercase bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    {guide.feeNote}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                {guide.contacts.map((contact, idx) => (
                  <a
                    key={idx}
                    href={`tel:${contact.phone.replace(/[^0-9+]/g, "")}`}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-black hover:text-white transition-all text-xs font-bold group shrink-0"
                  >
                    <Phone className="h-3.5 w-3.5 text-primary group-hover:text-primary" />
                    <span>{contact.name}: <span className="font-mono text-zinc-600 group-hover:text-zinc-200">{contact.phone}</span></span>
                    {contact.role && <span className="text-[9px] text-zinc-400 group-hover:text-zinc-400">({contact.role})</span>}
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Modal Sticky Footer */}
        <div className="p-4 sm:px-8 border-t border-black/5 bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-500">
            {isPendingPayment ? (
              <>
                <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                <span>Registration saved. Pass unlocks upon payment confirmation.</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <span>Pass saved to your VibeCheck account</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {onShare && (
              <button
                onClick={onShare}
                className="ringer-button bg-zinc-100 hover:bg-zinc-200 text-black text-xs font-black uppercase px-5 py-2.5 flex items-center justify-center gap-1.5 transition-colors flex-1 sm:flex-none"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="ringer-button bg-black hover:bg-zinc-800 text-white text-xs font-black uppercase px-7 py-2.5 transition-colors flex-1 sm:flex-none"
            >
              Done
            </button>
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
