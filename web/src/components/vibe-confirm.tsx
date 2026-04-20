"use client";

import React, { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info } from "lucide-react";

// ---------- Types ----------
export type VibeConfirmVariant = "danger" | "info";

interface VibeConfirmOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: VibeConfirmVariant;
}

interface VibeConfirmState extends VibeConfirmOptions {
  open: boolean;
  resolve: (value: boolean) => void;
}

// ---------- Singleton promise-based API ----------
let _setConfirm: React.Dispatch<React.SetStateAction<VibeConfirmState>> | null = null;

export function vibeConfirm(options: VibeConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!_setConfirm) {
      // Fallback to native if provider not mounted
      resolve(window.confirm(options.message));
      return;
    }
    _setConfirm({
      open: true,
      resolve,
      ...options,
    });
  });
}

// ---------- Provider (mount once in layout) ----------
export function VibeConfirmProvider() {
  const [state, setState] = useState<VibeConfirmState>({
    open: false,
    title: "",
    message: "",
    resolve: () => {},
  });

  _setConfirm = setState as React.Dispatch<React.SetStateAction<VibeConfirmState>>;

  const handleClose = useCallback(
    (confirmed: boolean) => {
      state.resolve(confirmed);
      setState((s) => ({ ...s, open: false }));
    },
    [state]
  );

  if (!state.open) return null;

  const isDanger = state.variant === "danger";

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm animate-in fade-in-0 duration-200"
      onClick={() => handleClose(false)}
    >
      {/* Modal */}
      <div
        className="bg-white rounded-[32px] shadow-2xl max-w-sm w-full p-8 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div
          className={cn(
            "h-14 w-14 rounded-[18px] flex items-center justify-center mb-6",
            isDanger ? "bg-red-50" : "bg-primary/10"
          )}
        >
          {isDanger ? (
            <AlertTriangle className="h-7 w-7 text-red-500" />
          ) : (
            <Info className="h-7 w-7 text-primary" />
          )}
        </div>

        {/* Title */}
        <h2 className="text-2xl font-black italic tracking-tighter uppercase leading-tight mb-2">
          {state.title}
        </h2>

        {/* Message */}
        <p className="text-zinc-500 text-sm font-medium leading-relaxed mb-8">
          {state.message}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => handleClose(false)}
            className="flex-1 h-12 rounded-xl border border-black/10 text-xs font-black uppercase tracking-widest text-zinc-500 hover:bg-zinc-50 transition-all"
          >
            {state.cancelLabel ?? "Cancel"}
          </button>
          <button
            onClick={() => handleClose(true)}
            className={cn(
              "flex-1 h-12 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              isDanger
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-black text-white hover:bg-zinc-800"
            )}
          >
            {state.confirmLabel ?? "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
