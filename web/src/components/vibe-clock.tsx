/**
 * VibeClock - A premium radial time picker component.
 * 
 * Features:
 * - Radial SVG interface with interactive "Vibe Needle"
 * - 15-minute intervals for clean, guided scheduling
 * - Modular design for easy library extraction
 */

import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface VibeClockProps {
  value: string; // "HH:MM AM/PM"
  onChange: (value: string) => void;
  onClose?: () => void;
}

export function VibeClock({ value, onChange, onClose }: VibeClockProps) {
  // Parse initial value
  const [timeStr, ampm] = value.split(" ");
  const [h, m] = timeStr.split(":").map(Number);
  
  const [mode, setMode] = useState<"hours" | "minutes">("hours");
  const [hour, setHour] = useState(h === 0 ? 12 : h > 12 ? h - 12 : h);
  const [minute, setMinute] = useState(m);
  const [period, setPeriod] = useState(ampm);
  
  const svgRef = useRef<SVGSVGElement>(null);

  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = [0, 15, 30, 45];

  const handleSelect = (e: React.MouseEvent | React.TouchEvent) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    let clientX, clientY;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;

    if (mode === "hours") {
      const selectedHour = hours[Math.round(angle / 30) % 12];
      setHour(selectedHour);
      setMode("minutes");
    } else {
      // Minute snaps (0, 15, 30, 45) -> 90 degrees each
      const selectedMinute = Math.round(angle / 90) % 4 * 15;
      setMinute(selectedMinute);
      
      const finalHour = hour.toString().padStart(2, "0");
      const finalMin = (Math.round(angle / 90) % 4 * 15).toString().padStart(2, "0");
      onChange(`${finalHour}:${finalMin} ${period}`);
    }
  };

  const getRotation = () => {
    if (mode === "hours") return (hour % 12) * 30;
    return minute * 6;
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 select-none animate-in fade-in zoom-in-95 duration-200">
      {/* Header / Mode Toggle */}
      <div className="flex items-center gap-4 bg-zinc-100 p-1 rounded-2xl border border-black/5">
        <button 
          onClick={() => setMode("hours")}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            mode === "hours" ? "bg-black text-white shadow-lg" : "text-zinc-400 hover:text-black"
          )}
        >
          {hour.toString().padStart(2, "0")}
        </button>
        <span className="text-zinc-300 font-black">:</span>
        <button 
          onClick={() => setMode("minutes")}
          className={cn(
            "px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            mode === "minutes" ? "bg-black text-white shadow-lg" : "text-zinc-400 hover:text-black"
          )}
        >
          {minute.toString().padStart(2, "0")}
        </button>
        
        <div className="flex flex-col gap-1 ml-2">
          <button 
            onClick={() => {
              setPeriod("AM");
              onChange(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} AM`);
            }}
            className={cn("text-[9px] font-black tracking-widest px-2 py-1 rounded-md", period === "AM" ? "bg-primary text-white" : "text-zinc-400")}
          >
            AM
          </button>
          <button 
            onClick={() => {
              setPeriod("PM");
              onChange(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} PM`);
            }}
            className={cn("text-[9px] font-black tracking-widest px-2 py-1 rounded-md", period === "PM" ? "bg-primary text-white" : "text-zinc-400")}
          >
            PM
          </button>
        </div>
      </div>

      {/* Clock Face SVG */}
      <div className="relative w-64 h-64">
        <svg 
          ref={svgRef}
          viewBox="0 0 200 200" 
          className="w-full h-full cursor-pointer touch-none"
          onClick={handleSelect}
        >
          {/* Background Circle */}
          <circle cx="100" cy="100" r="95" className="fill-zinc-50 stroke-zinc-200 stroke-1" />
          <circle cx="100" cy="100" r="4" className="fill-black" />
          
          {/* Numbers */}
          {mode === "hours" ? (
            hours.map((h, i) => {
              const angle = ((i * 30) - 90) * (Math.PI / 180);
              const x = 100 + 75 * Math.cos(angle);
              const y = 100 + 75 * Math.sin(angle);
              return (
                <text 
                  key={h} 
                  x={x} y={y} 
                  textAnchor="middle" 
                  dominantBaseline="middle"
                  className={cn(
                    "text-[10px] font-black transition-colors pointer-events-none",
                    hour === h ? "fill-primary" : "fill-zinc-400"
                  )}
                >
                  {h}
                </text>
              );
            })
          ) : (
            minutes.map((m, i) => {
              const angle = ((i * 90) - 90) * (Math.PI / 180);
              const x = 100 + 75 * Math.cos(angle);
              const y = 100 + 75 * Math.sin(angle);
              return (
                <text 
                  key={m} 
                  x={x} y={y} 
                  textAnchor="middle" 
                  dominantBaseline="middle"
                  className={cn(
                    "text-[10px] font-black transition-colors pointer-events-none",
                    minute === m ? "fill-primary" : "fill-zinc-400"
                  )}
                >
                  {m.toString().padStart(2, "0")}
                </text>
              );
            })
          )}

          {/* Needle / Hand */}
          <line 
            x1="100" y1="100" 
            x2={100 + 70 * Math.sin(getRotation() * Math.PI / 180)}
            y2={100 - 70 * Math.cos(getRotation() * Math.PI / 180)}
            className="stroke-primary stroke-2 transition-all duration-300 ease-out"
          />
          <circle 
            cx={100 + 70 * Math.sin(getRotation() * Math.PI / 180)}
            cy={100 - 70 * Math.cos(getRotation() * Math.PI / 180)}
            r="12"
            className="fill-primary/10 stroke-primary stroke-1 transition-all duration-300 ease-out"
          />
        </svg>
      </div>

      <button 
        onClick={onClose}
        className="w-full h-10 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-zinc-800 transition-colors"
      >
        SET TIME
      </button>
    </div>
  );
}
