"use client";

import React from "react";
import { X, Waves, Clock, Calendar, Moon, Send, ArrowRight } from "lucide-react";

interface WavesExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenRegisterModal: () => void;
}

export function WavesExplainerModal({
  isOpen,
  onClose,
  onOpenRegisterModal,
}: WavesExplainerModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl overflow-hidden border border-black/10 flex flex-col max-h-[92vh] animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="px-5 sm:px-6 py-4 bg-gradient-to-r from-zinc-950 via-zinc-900 to-black text-white shrink-0">
          {/* Mobile Drag Indicator */}
          <div className="w-10 h-1 bg-white/30 rounded-full mx-auto mb-2 sm:hidden" />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shrink-0">
                <Waves className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base md:text-lg font-black italic uppercase tracking-tight leading-none text-white">
                  HOW WAVES WORKS
                </h2>
                <p className="text-[10px] sm:text-[11px] text-zinc-400 mt-0.5">
                  Zero dead trips. 3-state Beach Road live radar.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-zinc-400 hover:text-white active:scale-95"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-zinc-800">
          <p className="text-xs sm:text-sm text-zinc-600 leading-relaxed">
            Pop-up coffee bars, churro carts, and sunset pottery kiosks along Beach Road move fast. Waves eliminates physical guesswork:
          </p>

          {/* 3 State Lifecycle cards */}
          <div className="space-y-2.5">
            {/* Live Wave */}
            <div className="p-3.5 rounded-[18px] bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Clock className="w-3.5 h-3.5" />
              </div>
              <div className="text-[11px] sm:text-xs space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black italic uppercase tracking-wider text-emerald-950">
                    🟢 LIVE WAVE (OPEN NOW)
                  </span>
                  <span className="text-[9px] bg-emerald-200/60 text-emerald-900 px-2 py-0.2 rounded-full font-black italic uppercase">
                    Real-time countdown
                  </span>
                </div>
                <p className="text-zinc-600 leading-relaxed">
                  The stall is physically open right now with live menu batch notes and exact GPS pins. Live drops count down in real-time and auto-expire when stock sells out.
                </p>
              </div>
            </div>

            {/* Scheduled Wave */}
            <div className="p-3.5 rounded-[18px] bg-amber-50/70 border border-amber-200/80 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-amber-500 text-black flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Calendar className="w-3.5 h-3.5" />
              </div>
              <div className="text-[11px] sm:text-xs space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black italic uppercase tracking-wider text-amber-950">
                    🟡 NEXT WAVE SCHEDULED
                  </span>
                  <span className="text-[9px] bg-amber-200/60 text-amber-900 px-2 py-0.2 rounded-full font-black italic uppercase">
                    Confirmed time
                  </span>
                </div>
                <p className="text-zinc-600 leading-relaxed">
                  Only appears when the vendor has explicitly locked in an upcoming date and time (e.g. <em>&quot;Saturday at 4:00 PM&quot;</em>). Never a guess.
                </p>
              </div>
            </div>

            {/* Offline Directory */}
            <div className="p-3.5 rounded-[18px] bg-zinc-100/90 border border-zinc-200 flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-zinc-400 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                <Moon className="w-3.5 h-3.5" />
              </div>
              <div className="text-[11px] sm:text-xs space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black italic uppercase tracking-wider text-zinc-900">
                    🔴 WAVE PASSED / OFFLINE
                  </span>
                  <span className="text-[9px] bg-zinc-200 text-zinc-700 px-2 py-0.2 rounded-full font-black italic uppercase">
                    Honest status
                  </span>
                </div>
                <p className="text-zinc-600 leading-relaxed">
                  Closed or packed up for the day. Explicitly tagged as Offline so you are never misled into making an empty trip.
                </p>
              </div>
            </div>
          </div>

          {/* Telegram Concierge Callout */}
          <div className="p-3.5 rounded-[18px] bg-gradient-to-r from-sky-50 to-indigo-50 border border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-[11px] sm:text-xs space-y-0.5">
              <div className="font-black italic uppercase tracking-wider text-sky-950 flex items-center gap-1.5">
                <Send className="w-3 h-3 text-sky-600" />
                <span>RESIDENT TELEGRAM CONCIERGE</span>
              </div>
              <p className="text-zinc-600">
                Ask <strong>@VibeCheckBot</strong>: <em>&quot;What cold brew stalls are open on Beach Road?&quot;</em> for instant answers.
              </p>
            </div>
            <a
              href="https://t.me/VibeCheckBot?start=waves"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-xs font-black italic uppercase tracking-wider bg-[#229ED9] hover:bg-[#1b8abf] text-white shrink-0 shadow-sm transition-all active:scale-95 self-start sm:self-auto"
            >
              <Send className="w-3 h-3" />
              <span>OPEN BOT</span>
            </a>
          </div>

          {/* Footer CTA */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5 border-t border-zinc-100">
            <button
              onClick={() => {
                onClose();
                onOpenRegisterModal();
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-black italic uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm active:scale-95"
            >
              <span>REGISTER BEACH STALL</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 rounded-full text-xs font-bold text-zinc-500 hover:text-black transition-colors"
            >
              GOT IT
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
