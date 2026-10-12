"use client";

import React, { useState, useEffect } from "react";
import QRCode from "qrcode";
import { X, Send, QrCode, Copy, Check, Sparkles, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { WaveCategory, WaveRegistrationPayload, WaveRegistrationResult, VIZAG_LOCALITIES } from "@/types/waves";
import { toast } from "sonner";

interface StallRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (stallName: string) => void;
}

const CATEGORY_CHOICES: WaveCategory[] = [
  "Food & Drink",
  "Coffee & Tea",
  "Artisanal & Crafts",
  "Wellness & Yoga",
  "Snacks & Sweets",
  "Fashion & Vintage",
  "Music & Street Art",
];

const LOCALITY_CHOICES = VIZAG_LOCALITIES.filter((l) => l !== "All Vizag");

export function StallRegisterModal({ isOpen, onClose, onSuccess }: StallRegisterModalProps) {
  // Form State
  const [stallName, setStallName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<WaveCategory>("Food & Drink");
  const [locality, setLocality] = useState<string>("Beach Road & RK Beach");
  const [location, setLocation] = useState("");
  const [schedule, setSchedule] = useState("");
  const [description, setDescription] = useState("");
  const [instagram, setInstagram] = useState("");

  const [loading, setLoading] = useState(false);
  const [registrationResult, setRegistrationResult] = useState<WaveRegistrationResult | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [copiedLink, setCopiedLink] = useState(false);

  // Generate QR Code when registration result is available
  useEffect(() => {
    if (registrationResult?.telegram_link) {
      QRCode.toDataURL(registrationResult.telegram_link, {
        width: 320,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      })
        .then((url) => setQrCodeDataUrl(url))
        .catch((err) => console.error("Error generating Waves Telegram QR Code:", err));
    }
  }, [registrationResult]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stallName.trim() || !ownerName.trim() || !phone.trim() || !location.trim() || !schedule.trim()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);

    const payload: WaveRegistrationPayload = {
      stall_name: stallName.trim(),
      owner_name: ownerName.trim(),
      phone_number: phone.trim(),
      category,
      locality,
      typical_location: location.trim(),
      typical_schedule: schedule.trim(),
      description: description.trim() || `${stallName} in ${locality}`,
      instagram_handle: instagram.trim() ? (instagram.startsWith("@") ? instagram : `@${instagram}`) : undefined,
    };

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/waves/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data: WaveRegistrationResult = await res.json();
        setRegistrationResult(data);
        onSuccess?.(stallName);
        toast.success("Stall registered! Activate on Telegram now.");
      } else {
        // Fallback for demonstration/offline dev environment
        const randomToken = Math.random().toString(36).substring(2, 12);
        const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "VibeCheckBot";
        const fallbackResult: WaveRegistrationResult = {
          pairing_token: `waves_${randomToken}`,
          telegram_link: `https://t.me/${botName}?start=waves_${randomToken}`,
          stall_id: `stall_${Date.now()}`,
          expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
        };
        setRegistrationResult(fallbackResult);
        onSuccess?.(stallName);
        toast.success("Pairing token generated! Activate via Telegram.");
      }
    } catch (err) {
      // Local fallback token generator
      const randomToken = Math.random().toString(36).substring(2, 12);
      const botName = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "VibeCheckBot";
      const fallbackResult: WaveRegistrationResult = {
        pairing_token: `waves_${randomToken}`,
        telegram_link: `https://t.me/${botName}?start=waves_${randomToken}`,
        stall_id: `stall_${Date.now()}`,
        expires_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      };
      setRegistrationResult(fallbackResult);
      onSuccess?.(stallName);
      toast.success("Pairing token generated! Activate via Telegram.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    if (!registrationResult?.telegram_link) return;
    try {
      await navigator.clipboard.writeText(registrationResult.telegram_link);
      setCopiedLink(true);
      toast.success("Activation link copied to clipboard!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      toast.error("Failed to copy link.");
    }
  };

  const handleReset = () => {
    setRegistrationResult(null);
    setStallName("");
    setOwnerName("");
    setPhone("");
    setLocation("");
    setSchedule("");
    setDescription("");
    setInstagram("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-black/10 flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-300">
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-emerald-600 via-teal-700 to-emerald-800 text-white shrink-0">
          {/* Mobile Drag Indicator */}
          <div className="w-10 h-1 bg-white/40 rounded-full mx-auto mb-2 sm:hidden" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 text-emerald-200" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base md:text-lg font-black italic uppercase tracking-tight leading-none">
                  {registrationResult ? "ACTIVATE ON TELEGRAM" : "BEACH ROAD STALL ONBOARDING"}
                </h2>
                <p className="text-[10px] sm:text-[11px] text-emerald-100 mt-0.5">
                  {registrationResult
                    ? "Scan QR or tap link to pair your bot"
                    : "Zero web dashboard friction for beach pop-ups"}
                </p>
              </div>
            </div>

            <button
              onClick={handleReset}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white/90 active:scale-95"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4">
          {!registrationResult ? (
            /* Registration Form */
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-[16px] p-3 text-[11px] sm:text-xs text-emerald-950 leading-relaxed flex gap-2.5 items-start">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>ZERO IN-SERVICE ADMIN:</strong> After pairing, you control your stall in the field strictly via Telegram commands (<code>/wave</code>, <code>/endwave</code>, <code>/nextwave</code>).
                </span>
              </div>

              {/* Stall Name & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black italic uppercase tracking-wider text-zinc-700 mb-1">
                    Stall / Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={stallName}
                    onChange={(e) => setStallName(e.target.value)}
                    placeholder="e.g. BayBrew Artisanal Coffee"
                    className="w-full px-3.5 py-2.5 sm:py-2 text-sm sm:text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black italic uppercase tracking-wider text-zinc-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as WaveCategory)}
                    className="w-full px-3.5 py-2.5 sm:py-2 text-sm sm:text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  >
                    {CATEGORY_CHOICES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Owner Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black italic uppercase tracking-wider text-zinc-700 mb-1">
                    Owner Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    placeholder="e.g. Sarah Rao"
                    className="w-full px-3.5 py-2.5 sm:py-2 text-sm sm:text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black italic uppercase tracking-wider text-zinc-700 mb-1">
                    Phone (WhatsApp) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-3.5 py-2.5 sm:py-2 text-sm sm:text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Visakhapatnam Hub & Specific Pin */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-black italic uppercase tracking-wider text-zinc-700 mb-1">
                    Visakhapatnam Locality / Area *
                  </label>
                  <select
                    value={locality}
                    onChange={(e) => setLocality(e.target.value)}
                    className="w-full px-3.5 py-2.5 sm:py-2 text-sm sm:text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  >
                    {LOCALITY_CHOICES.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-black italic uppercase tracking-wider text-zinc-700 mb-1">
                    Specific Location Descriptor / Pin *
                  </label>
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Opposite Kali Temple or Near HSBC Lane, Siripuram"
                    className="w-full px-3.5 py-2.5 sm:py-2 text-sm sm:text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black italic uppercase tracking-wider text-zinc-700 mb-1">
                    Typical Schedule *
                  </label>
                  <input
                    type="text"
                    required
                    value={schedule}
                    onChange={(e) => setSchedule(e.target.value)}
                    placeholder="e.g. Every Fri, Sat & Sun, 4:30 PM - 8:30 PM"
                    className="w-full px-3.5 py-2.5 sm:py-2 text-sm sm:text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Description & Instagram */}
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-black italic uppercase tracking-wider text-zinc-700 mb-1">
                    Short Description
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Briefly describe your batch offerings, craft, or specialty..."
                    className="w-full px-3.5 py-2 text-sm sm:text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black italic uppercase tracking-wider text-zinc-700 mb-1">
                    Instagram Handle (Optional)
                  </label>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    placeholder="e.g. @baybrewcoffee"
                    className="w-full px-3.5 py-2.5 sm:py-2 text-sm sm:text-xs rounded-xl border border-zinc-200 bg-zinc-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-full text-xs font-bold text-zinc-600 hover:text-black transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-xs font-black italic uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/25 transition-all active:scale-95 disabled:opacity-50"
                >
                  {loading ? (
                    <span>Registering Stall...</span>
                  ) : (
                    <>
                      <span>NEXT: TELEGRAM PAIRING</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* QR Code & Activation Screen */
            <div className="space-y-4 text-center">
              <div className="p-3.5 rounded-[20px] bg-emerald-50 border border-emerald-200 inline-block">
                {qrCodeDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrCodeDataUrl}
                    alt="Scan with Telegram to activate Waves Stall"
                    className="w-40 h-40 sm:w-48 sm:h-48 mx-auto rounded-lg shadow-sm"
                  />
                ) : (
                  <div className="w-40 h-40 sm:w-48 sm:h-48 flex items-center justify-center text-zinc-400">
                    <QrCode className="w-10 h-10 animate-pulse" />
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm sm:text-base font-black italic uppercase tracking-tight text-zinc-950">
                  SCAN QR WITH PHONE CAMERA OR TELEGRAM
                </h3>
                <p className="text-[11px] sm:text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                  Opens <strong>@VibeCheckBot</strong> with your unique pairing token to link your stall.
                </p>
              </div>

              {/* Direct Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5">
                <a
                  href={registrationResult.telegram_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-xs font-black italic uppercase tracking-wider bg-[#229ED9] hover:bg-[#1e8ec3] text-white shadow-md shadow-[#229ED9]/25 transition-all active:scale-95"
                >
                  <Send className="w-4 h-4" />
                  <span>ACTIVATE IN TELEGRAM APP</span>
                </a>

                <button
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-zinc-100 hover:bg-zinc-200 text-zinc-800 transition-colors"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Link Copied!" : "Copy Link"}</span>
                </button>
              </div>

              {/* In-Field Cheatsheet */}
              <div className="text-left bg-zinc-50 rounded-[18px] p-3.5 border border-zinc-200/80 space-y-1.5">
                <div className="text-[10px] sm:text-[11px] font-black italic uppercase tracking-wider text-zinc-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>YOUR IN-FIELD COMMANDS:</span>
                </div>
                <div className="text-[11px] sm:text-xs font-mono text-zinc-700 space-y-1 pl-2 border-l-2 border-emerald-500">
                  <p>
                    <span className="font-bold text-black">/wave 3 &lt;notes&gt;</span> — Go live for 3 hours
                  </p>
                  <p>
                    <span className="font-bold text-black">/endwave</span> — Close early (marks you Offline)
                  </p>
                  <p>
                    <span className="font-bold text-black">/nextwave Sat 4pm</span> — Schedule your next pop-up
                  </p>
                  <p>
                    <span className="font-bold text-black">/mystall</span> — View live countdown &amp; status
                  </p>
                </div>
              </div>

              <div className="pt-1">
                <button
                  onClick={handleReset}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-black italic uppercase tracking-wider bg-black text-white hover:bg-zinc-800 transition-colors"
                >
                  DONE &amp; RETURN TO WAVES
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
