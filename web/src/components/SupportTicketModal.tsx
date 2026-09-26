"use client";

import React, { useState } from "react";
import { 
  X, LifeBuoy, Send, Bot, CheckCircle2, AlertCircle, 
  Sparkles, Loader2, Search, ArrowRight, ShieldCheck 
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
}

export function SupportTicketModal({
  isOpen,
  onClose,
  defaultEmail = "",
}: SupportTicketModalProps) {
  const [activeTab, setActiveTab] = useState<"submit" | "track">("submit");
  
  // Submit Form State
  const [email, setEmail] = useState(defaultEmail);
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState("pass_booking");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [ticketResult, setTicketResult] = useState<any>(null);

  // Track Ticket State
  const [trackNumber, setTrackNumber] = useState("");
  const [tracking, setTracking] = useState(false);
  const [trackedTicket, setTrackedTicket] = useState<any>(null);
  const [trackError, setTrackError] = useState("");

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSubmitting(true);

    try {
      const res = await fetch(`${baseUrl}/api/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: email,
          phone_number: phone,
          category,
          subject,
          message,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "Failed to submit ticket.");
        setSubmitting(false);
        return;
      }

      setTicketResult(data.data);
      setSubject("");
      setMessage("");
    } catch (err: any) {
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackNumber.trim()) return;
    setTrackError("");
    setTracking(true);
    setTrackedTicket(null);

    try {
      const res = await fetch(`${baseUrl}/api/tickets/${encodeURIComponent(trackNumber.trim())}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setTrackError(data.error || "Ticket not found.");
      } else {
        setTrackedTicket(data.data);
      }
    } catch (err: any) {
      setTrackError("Network error while searching ticket.");
    } finally {
      setTracking(false);
    }
  };

  const resetState = () => {
    setTicketResult(null);
    setErrorMsg("");
    setTrackedTicket(null);
    setTrackError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-[550px] p-0 bg-[#0B0F17] border border-slate-800 text-slate-100 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-indigo-950 via-purple-950 to-slate-900 p-6 border-b border-slate-800/80 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                VibeCheck Help & Support
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <Bot className="w-3 h-3" /> AI Assistant
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Instant resolution powered by AI • 24/7 Assistance
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => { setActiveTab("submit"); resetState(); }}
              className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all ${
                activeTab === "submit"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              Submit Inquiry
            </button>
            <button
              onClick={() => { setActiveTab("track"); resetState(); }}
              className={`text-xs font-semibold px-4 py-1.5 rounded-lg transition-all ${
                activeTab === "track"
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/20"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              Track Ticket
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {activeTab === "submit" && (
            <>
              {ticketResult ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h3 className="font-bold text-white text-base">Ticket Submitted!</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Ticket ID: <strong className="text-indigo-400 font-mono text-sm">{ticketResult.ticket_number}</strong>
                    </p>
                  </div>

                  {ticketResult.ai_response && (
                    <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                      <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
                        <Sparkles className="w-4 h-4" /> Instant Solution from AI Agent:
                      </div>
                      <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {ticketResult.ai_response}
                      </p>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={resetState}
                      className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
                    >
                      Submit Another Issue
                    </button>
                    <button
                      onClick={onClose}
                      className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errorMsg && (
                    <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        WhatsApp / Phone (Optional)
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Issue Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="pass_booking">🎟️ Pass Booking / QR Code Issues</option>
                      <option value="event_issue">📍 Event Details & Location Inquiry</option>
                      <option value="organizer_inquiry">💼 Organizer Account & Hosting</option>
                      <option value="bug_report">🐛 Technical Bug or Content Report</option>
                      <option value="other">💬 General Inquiry / Feedback</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., Cannot find entry QR code for Saturday's Techno Night"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Description / Details
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Please explain the issue or question in detail..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-indigo-600/30"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Analyzing with AI Assistant...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Get Instant AI Assistance
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}

          {activeTab === "track" && (
            <div className="space-y-4">
              <form onSubmit={handleTrackTicket} className="flex gap-2">
                <input
                  type="text"
                  required
                  value={trackNumber}
                  onChange={(e) => setTrackNumber(e.target.value)}
                  placeholder="Enter Ticket ID (e.g., TC-123456)"
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors font-mono uppercase"
                />
                <button
                  type="submit"
                  disabled={tracking}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {tracking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Track
                </button>
              </form>

              {trackError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{trackError}</span>
                </div>
              )}

              {trackedTicket && (
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-indigo-400">
                        {trackedTicket.ticket_number}
                      </span>
                      <h4 className="text-sm font-semibold text-white mt-0.5">{trackedTicket.subject}</h4>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                        trackedTicket.status === "ai_resolved"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : trackedTicket.status === "escalated"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                      }`}
                    >
                      {trackedTicket.status.replace("_", " ")}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 italic bg-slate-950 p-2.5 rounded-lg border border-slate-800/50">
                    "{trackedTicket.message}"
                  </p>

                  {trackedTicket.ai_response && (
                    <div className="p-3 rounded-lg bg-indigo-950/40 border border-indigo-500/30 text-xs text-slate-200 space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-indigo-400 text-[11px]">
                        <Bot className="w-3.5 h-3.5" /> Resolution / Response:
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap">{trackedTicket.ai_response}</p>
                    </div>
                  )}

                  <div className="text-[10px] text-slate-500 text-right">
                    Submitted: {new Date(trackedTicket.created_at).toLocaleString()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
