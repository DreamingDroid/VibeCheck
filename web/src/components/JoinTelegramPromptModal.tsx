"use client";

import { Send, X, Users, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { formatTelegramLink } from "@/lib/telegramGroup";

interface JoinTelegramPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  telegramGroupLink: string;
}

export function JoinTelegramPromptModal({
  isOpen,
  onClose,
  eventTitle,
  telegramGroupLink,
}: JoinTelegramPromptModalProps) {
  if (!isOpen) return null;

  const handleJoin = () => {
    const formattedUrl = formatTelegramLink(telegramGroupLink);
    window.open(formattedUrl, "_blank");
    toast.success("Opening official Attendee Telegram group...");
    onClose();
  };

  const handleDecline = () => {
    toast.info("No problem! You can join anytime later using the 'Join Telegram Group' button on this page.");
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleDecline}
    >
      <div
        className="bg-white rounded-[32px] p-6 sm:p-8 max-w-md w-full shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Glow */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-[#229ED9]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleDecline}
          className="absolute top-6 right-6 h-8 w-8 rounded-full bg-zinc-100 hover:bg-zinc-200 flex items-center justify-center text-zinc-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          {/* Telegram Badge Icon */}
          <div className="h-16 w-16 rounded-3xl bg-[#229ED9] text-white flex items-center justify-center shadow-xl shadow-[#229ED9]/30 mb-5 relative">
            <Send className="h-8 w-8 fill-white translate-x-[-1px] translate-y-[1px]" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-white"></span>
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200/60 text-[#229ED9] text-[10px] font-black uppercase tracking-wider mb-2">
            <Users className="h-3 w-3" />
            <span>Attendee Community</span>
          </div>

          <h3 className="text-2xl font-black italic tracking-tighter uppercase text-black mb-2">
            Join the Telegram Group?
          </h3>

          <p className="text-xs text-zinc-600 font-medium leading-relaxed mb-6 max-w-xs">
            Connect with the organizer and fellow guests for <span className="text-black font-bold">"{eventTitle}"</span>. Get real-time updates and vibe before the event!
          </p>

          <div className="w-full space-y-2.5">
            <button
              onClick={handleJoin}
              className="w-full py-3.5 px-5 bg-[#229ED9] hover:bg-[#1d8dc3] text-white rounded-2xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#229ED9]/25 active:scale-[0.98] cursor-pointer"
            >
              <Send className="h-4 w-4 fill-white" />
              <span>Yes, Join Telegram Group</span>
            </button>

            <button
              onClick={handleDecline}
              className="w-full py-3 px-5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            >
              Maybe Later
            </button>
          </div>

          <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mt-4">
            You can always join later from the event page
          </p>
        </div>
      </div>
    </div>
  );
}
