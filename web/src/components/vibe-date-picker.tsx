"use client";

import React, { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { DayPicker } from "react-day-picker";
import { format, parseISO, isValid } from "date-fns";

interface VibeDatePickerProps {
  value: string; // YYYY-MM-DD string
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  error?: boolean;
}

export function VibeDatePicker({ value, onChange, label, className, error }: VibeDatePickerProps) {
  const [open, setOpen] = useState(false);

  let selectedDate: Date | undefined = undefined;
  if (value) {
    const parsed = parseISO(value);
    if (isValid(parsed)) {
      selectedDate = parsed;
    }
  }

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      onChange(`${yyyy}-${mm}-${dd}`);
      setOpen(false);
    } else {
      onChange("");
    }
  };

  return (
    <div className={cn("space-y-1 w-full", className)}>
      {label && (
        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-400 ml-1">
          {label}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-12 w-full items-center justify-between rounded-xl border border-black/5 bg-zinc-50 px-4 py-2 text-xs font-black uppercase tracking-tight transition-all hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary/20",
            error && "border-red-500 ring-2 ring-red-500/20 bg-red-50"
          )}
        >
          <span className={cn(value ? "text-black" : "text-zinc-400")}>
            {selectedDate ? format(selectedDate, "MMM dd, yyyy") : "Select Date"}
          </span>
          <CalendarIcon className="h-4 w-4 text-zinc-400 shrink-0" />
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          className="w-auto p-5 rounded-[32px] shadow-2xl border border-black/5 outline-none bg-white z-50"
        >
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            autoFocus
            showOutsideDays
            classNames={{
              root: "w-fit select-none",
              months: "flex flex-col",
              month: "flex flex-col gap-4",
              month_caption: "flex items-center justify-center h-10 px-10 relative",
              caption_label: "text-sm font-black uppercase tracking-widest text-black",
              nav: "absolute inset-x-0 top-0 flex items-center justify-between h-10 px-1",
              button_previous: "flex h-8 w-8 items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-500 hover:text-black",
              button_next: "flex h-8 w-8 items-center justify-center rounded-full hover:bg-zinc-100 transition-colors text-zinc-500 hover:text-black",
              weekdays: "flex",
              weekday: "w-10 h-10 flex items-center justify-center text-[10px] font-black uppercase tracking-wider text-zinc-400",
              weeks: "flex flex-col gap-1 mt-2",
              week: "flex",
              day: "w-10 h-10 flex items-center justify-center",
              day_button: cn(
                "w-9 h-9 rounded-full text-sm font-bold transition-all",
                "hover:bg-zinc-100 hover:text-black",
                "focus:outline-none focus:ring-2 focus:ring-primary/30",
              ),
              selected: "[&>button]:bg-black [&>button]:text-white [&>button]:hover:bg-zinc-800",
              today: "[&>button]:bg-primary/10 [&>button]:text-primary [&>button]:font-black",
              outside: "[&>button]:text-zinc-300",
              disabled: "[&>button]:text-zinc-200 [&>button]:cursor-not-allowed",
            }}
            components={{
              Chevron: ({ orientation }) =>
                orientation === "left" ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                ),
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
