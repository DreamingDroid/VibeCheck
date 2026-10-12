"use client";

import React from "react";
import { WaveCategory } from "@/types/waves";
import { Coffee, Utensils, Sparkles, HeartHandshake, Cookie, Shirt, Music2, Compass } from "lucide-react";

interface CategoryOption {
  label: WaveCategory;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryOption[] = [
  { label: "All", icon: <Compass className="w-3.5 h-3.5" /> },
  { label: "Food & Drink", icon: <Utensils className="w-3.5 h-3.5" /> },
  { label: "Coffee & Tea", icon: <Coffee className="w-3.5 h-3.5" /> },
  { label: "Artisanal & Crafts", icon: <Sparkles className="w-3.5 h-3.5" /> },
  { label: "Wellness & Yoga", icon: <HeartHandshake className="w-3.5 h-3.5" /> },
  { label: "Snacks & Sweets", icon: <Cookie className="w-3.5 h-3.5" /> },
  { label: "Fashion & Vintage", icon: <Shirt className="w-3.5 h-3.5" /> },
  { label: "Music & Street Art", icon: <Music2 className="w-3.5 h-3.5" /> },
];

interface WavesCategoryFilterProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  categoryCounts?: Record<string, number>;
}

export function WavesCategoryFilter({
  selectedCategory,
  onSelectCategory,
  categoryCounts,
}: WavesCategoryFilterProps) {
  return (
    <div className="w-full overflow-x-auto no-scrollbar py-1.5 -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-max">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.label;
          const count = categoryCounts ? categoryCounts[cat.label] : undefined;

          return (
            <button
              key={cat.label}
              id={`waves-cat-${cat.label.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}
              onClick={() => onSelectCategory(cat.label)}
              className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 rounded-full text-[11px] sm:text-xs font-black italic uppercase tracking-wider transition-all duration-200 active:scale-95 shrink-0 ${
                isSelected
                  ? "bg-black text-white shadow-md shadow-black/15 ring-2 ring-primary ring-offset-1"
                  : "bg-white hover:bg-zinc-50 text-zinc-700 hover:text-black border border-black/10 shadow-sm"
              }`}
            >
              <span className={isSelected ? "text-primary" : "text-zinc-400"}>
                {cat.icon}
              </span>
              <span>{cat.label}</span>
              {typeof count === "number" && count > 0 && (
                <span
                  className={`text-[9px] font-mono font-black italic px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? "bg-white/20 text-white"
                      : "bg-zinc-100 text-zinc-600"
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
