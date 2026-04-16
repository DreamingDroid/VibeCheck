"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { VibeClock } from "./vibe-clock";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface VibeTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

export function VibeTimePicker({ value, onChange, label, className }: VibeTimePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("space-y-1 w-full", className)}>
      {label && (
        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button 
            type="button"
            className="flex h-12 w-full items-center justify-between rounded-xl border border-black/5 bg-zinc-50 px-4 py-2 text-xs font-black uppercase tracking-tight transition-all hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <span className={cn(value ? "text-black" : "text-zinc-400")}>
              {value || "Select Time"}
            </span>
            <Clock className="h-4 w-4 text-zinc-400" />
          </button>
        </PopoverTrigger>
        <PopoverContent 
          side="bottom" 
          align="start" 
          className="w-80 p-0 rounded-[40px] shadow-2xl border-none outline-none overflow-hidden bg-white"
        >
          <VibeClock 
            value={value} 
            onChange={(newTime) => {
              onChange(newTime);
              // We don't close on every click to allow AM/PM toggling
            }} 
            onClose={() => setOpen(false)}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
