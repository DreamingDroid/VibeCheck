"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldCheck, AlertTriangle, CheckCircle2, XCircle, Building2, UserCheck, Calendar, Clock, MapPin, Users, IndianRupee, Loader2 } from "lucide-react";

interface EventDetails {
  id: string;
  title: string;
  description: string;
  category: string;
  dateTime: string;
  endTime?: string;
  timings?: string;
  location: string;
  city: string;
  sectionHall?: string;
  participantLimit?: number;
  isPaid: boolean;
  ticketPrice?: number;
  venueEmail: string;
  verificationStatus: string;
  expiresAt: string;
  isExpired: boolean;
}

interface OrganizerDetails {
  brandName: string;
  email: string;
  phone: string;
}

function VenueVerifyContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const actionParam = searchParams.get("action");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventData, setEventData] = useState<EventDetails | null>(null);
  const [organizerData, setOrganizerData] = useState<OrganizerDetails | null>(null);

  // Form states for approval
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState("Manager / Owner");
  const [termsAccepted, setTermsAccepted] = useState(actionParam === "approve");
  const [submitting, setSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<"authorized" | "rejected" | null>(null);
  const [auditRef, setAuditRef] = useState<string | null>(null);

  // Rejection modal/state
  const [isRejecting, setIsRejecting] = useState(actionParam === "reject");
  const [rejectionReason, setRejectionReason] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  useEffect(() => {
    if (!token) {
      setError("No verification token provided in URL.");
      setLoading(false);
      return;
    }

    fetch(`${apiUrl}/api/venue-auth/details?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Verification link is invalid or has already been used.");
        }
        return res.json();
      })
      .then((data) => {
        setEventData(data.event);
        setOrganizerData(data.organizer);
        if (data.event.isExpired) {
          setError("This verification link has expired (48-hour limit). Please ask the organizer to resend authorization.");
        }
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, apiUrl]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted) {
      alert("Please confirm the legal declaration checkboxes before authorizing.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/venue-auth/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          signerName,
          signerRole,
          termsAccepted: true
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to confirm authorization.");
      }

      setSubmittedStatus("authorized");
      setAuditRef(resData.auditReferenceId);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${apiUrl}/api/venue-auth/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          reason: rejectionReason || "Venue reported booking is unauthorized."
        })
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to record rejection.");
      }

      setSubmittedStatus("rejected");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-zinc-400 font-bold text-sm tracking-wide">Validating secure legal verification link...</p>
      </div>
    );
  }

  if (error && !submittedStatus) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-red-500/20 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="h-16 w-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <XCircle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-white">Verification Unavailable</h2>
          <p className="text-zinc-400 text-sm leading-relaxed">{error}</p>
          <div className="pt-2">
            <a href="/" className="inline-block px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition-all">
              Return to VibeCheck Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (submittedStatus === "authorized") {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-lg w-full bg-zinc-900 border border-emerald-500/30 rounded-3xl p-8 text-center space-y-5 shadow-2xl animate-in zoom-in-95 duration-200">
          <div className="h-20 w-20 bg-emerald-500/15 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Authorization Recorded</span>
            </div>
            <h2 className="text-2xl font-black text-white">Event Successfully Authorized!</h2>
            <p className="text-zinc-400 text-sm">
              Thank you! Your official confirmation has been recorded as a legally binding electronic authorization for <strong>{eventData?.title}</strong>.
            </p>
          </div>

          <div className="bg-black/40 border border-white/5 p-4 rounded-2xl text-left space-y-2 text-xs">
            <div className="flex justify-between text-zinc-400">
              <span>Legal Audit Ref:</span>
              <strong className="text-emerald-400 font-mono">{auditRef}</strong>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Venue:</span>
              <strong className="text-white">{eventData?.location}</strong>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Organizer:</span>
              <strong className="text-white">{organizerData?.brandName}</strong>
            </div>
          </div>

          <p className="text-[11px] text-zinc-500">
            A confirmation receipt certificate has been emailed to <strong>{eventData?.venueEmail}</strong> and the organizer.
          </p>
        </div>
      </div>
    );
  }

  if (submittedStatus === "rejected") {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-red-500/30 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <div className="h-16 w-16 bg-red-500/15 text-red-500 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-black text-white">Event Authorization Declined</h2>
          <p className="text-zinc-400 text-sm">
            You have reported this event as unauthorized. The listing for <strong>{eventData?.title}</strong> has been immediately blocked and flagged to our Trust &amp; Safety team.
          </p>
        </div>
      </div>
    );
  }

  const dateStr = eventData?.dateTime ? new Date(eventData.dateTime).toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric"
  }) : "";

  const timeStr = eventData?.dateTime ? new Date(eventData.dateTime).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  }) : "";

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-4 sm:p-6 py-12">
      <div className="max-w-2xl w-full bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
        
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-zinc-950 via-slate-900 to-zinc-950 p-6 sm:p-8 border-b border-white/10 relative">
          <div className="flex items-center gap-2 text-primary font-black uppercase text-[11px] tracking-widest mb-2">
            <ShieldCheck className="h-4 w-4" />
            <span>Official Legal Verification Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight">
            Authorize Event at Your Venue
          </h1>
          <p className="text-zinc-400 text-xs sm:text-sm mt-1.5">
            Please review the organizer identity and proposed booking details below before providing legal consent.
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">

          {/* Section 1: Organizer Card */}
          <div className="bg-black/50 border border-white/5 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-emerald-400">
              <UserCheck className="h-4 w-4" />
              <span>1. Verified Organizer Identity</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-zinc-800/40 p-3 rounded-xl">
                <span className="text-zinc-500 block text-[10px] font-bold uppercase">Brand / Host</span>
                <strong className="text-white text-sm">{organizerData?.brandName}</strong>
              </div>
              <div className="bg-zinc-800/40 p-3 rounded-xl">
                <span className="text-zinc-500 block text-[10px] font-bold uppercase">Verified Phone</span>
                <strong className="text-white text-sm">{organizerData?.phone}</strong>
              </div>
              <div className="bg-zinc-800/40 p-3 rounded-xl sm:col-span-2">
                <span className="text-zinc-500 block text-[10px] font-bold uppercase">Organizer Email</span>
                <strong className="text-zinc-300 font-mono text-xs">{organizerData?.email}</strong>
              </div>
            </div>
          </div>

          {/* Section 2: Event Details Card */}
          <div className="bg-black/50 border border-white/5 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-primary">
              <Building2 className="h-4 w-4" />
              <span>2. Proposed Event Details</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{eventData?.category} Event</span>
              <h3 className="text-lg font-black text-white">{eventData?.title}</h3>
              {eventData?.description && (
                <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed pt-1">
                  {eventData.description}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-2">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-800/40">
                <Calendar className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-500 block text-[10px] font-bold uppercase">Date</span>
                  <span className="font-bold text-white">{dateStr}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-800/40">
                <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-500 block text-[10px] font-bold uppercase">Time / Schedule</span>
                  <span className="font-bold text-white">{timeStr} {eventData?.timings ? `(${eventData.timings})` : ""}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-800/40">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-500 block text-[10px] font-bold uppercase">Venue Area / Hall</span>
                  <span className="font-bold text-white">{eventData?.sectionHall || eventData?.location}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-800/40">
                <Users className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-500 block text-[10px] font-bold uppercase">Max Capacity Limit</span>
                  <span className="font-bold text-white">{eventData?.participantLimit ? `${eventData.participantLimit} Attendees` : "Open Limit"}</span>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-zinc-800/40 sm:col-span-2">
                <IndianRupee className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-zinc-500 block text-[10px] font-bold uppercase">Commercial Ticket Sales</span>
                  <span className="font-bold text-amber-400">
                    {eventData?.isPaid ? `PAID EVENT (₹${eventData.ticketPrice || 0} per attendee)` : "FREE COMMUNITY EVENT"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {!isRejecting ? (
            /* Approval Form */
            <form onSubmit={handleConfirm} className="space-y-5">
              
              {/* Signer Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Your Name (Authorized Manager)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suresh Kumar"
                    value={signerName}
                    onChange={(e) => setSignerName(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                    Designation / Role
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. General Manager / Owner"
                    value={signerRole}
                    onChange={(e) => setSignerRole(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              {/* Legal Checkbox */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded bg-zinc-950 border-white/20 text-primary focus:ring-0"
                  />
                  <span className="text-xs text-zinc-300 leading-relaxed font-medium">
                    I confirm that <strong>{organizerData?.brandName}</strong> ({organizerData?.phone}) has a valid booking/reservation at our venue for this date and time slot, and we authorize them to host up to {eventData?.participantLimit || "specified"} guests and sell tickets on our premises.
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="submit"
                  disabled={submitting || !termsAccepted || !signerName}
                  className="w-full sm:flex-1 py-3.5 px-6 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-600/20 active:scale-98 cursor-pointer"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span>Authorize &amp; Confirm Event</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsRejecting(true)}
                  className="w-full sm:w-auto py-3.5 px-6 bg-zinc-800 hover:bg-red-500/20 hover:text-red-400 text-zinc-400 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  Decline / Report
                </button>
              </div>
            </form>
          ) : (
            /* Rejection Form */
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-red-400">
                <XCircle className="h-4 w-4" />
                <span>Decline or Report Unauthorized Booking</span>
              </div>
              <p className="text-xs text-zinc-400">
                If no such booking was made by this organizer, or if commercial ticket sales are not permitted at your venue, please specify the reason below.
              </p>
              <textarea
                rows={3}
                placeholder="e.g. No booking found under this organizer name / We do not allow commercial ticket sales."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-zinc-950 border border-red-500/20 rounded-xl p-3 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-red-500"
              />

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleReject}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                  <span>Submit Rejection &amp; Block Event</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsRejecting(false)}
                  className="py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function VenueVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
    }>
      <VenueVerifyContent />
    </Suspense>
  );
}
