"use client";

import React, { useEffect, useState } from "react";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from "recharts";
import { toast } from "sonner";

interface Aggregates {
  totalRsvps: number;
  totalFollowers: number;
  superfans: number;
  avgVelocity: number;
}

interface VenueInsight {
  name: string;
  value: number;
}

interface ScheduleInsight {
  dayOfWeek: number;
  timeOfDay: "Morning" | "Afternoon" | "Evening" | "Night";
  rsvps: number;
}

interface FreshnessInsight {
  name: string;
  value: number;
}

interface BroadcastStats {
  sentCount: number;
  conversions: number;
  conversionRate: number;
  costEstimate: number;
}

interface AnalyticsData {
  aggregates: Aggregates;
  venueInsights: VenueInsight[];
  scheduleInsights: ScheduleInsight[];
  freshnessInsights: FreshnessInsight[];
  broadcastStats: BroadcastStats;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_SLOTS = ["Morning", "Afternoon", "Evening", "Night"];

// Theme colors
const COLORS = ["#C1FF00", "#18181B", "#71717A", "#A1A1AA", "#E4E4E7"];

export default function OrganizerInsightsDashboard({ organizerEmail }: { organizerEmail: string }) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizerEmail) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/organizer/analytics/dashboard?email=${encodeURIComponent(organizerEmail)}`)
      .then(res => res.json())
      .then(resData => {
        if (resData.success) {
          setData(resData.data);
        } else {
          toast.error(resData.error || "Failed to load dashboard insights");
        }
      })
      .catch(err => {
        console.error("Error loading insights:", err);
        toast.error("Failed to load dashboard insights");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [organizerEmail]);

  if (loading) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-zinc-100 rounded-[24px]" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-80 bg-zinc-100 rounded-[24px]" />
          <div className="h-80 bg-zinc-100 rounded-[24px]" />
        </div>
        <div className="h-96 bg-zinc-100 rounded-[24px]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-zinc-300 ringer-card border-dashed">
        <p className="text-[10px] font-black uppercase tracking-widest">No active analytics found.</p>
      </div>
    );
  }

  const { aggregates, venueInsights, scheduleInsights, freshnessInsights, broadcastStats } = data;

  // Build scheduling density matrix
  const maxRsvps = Math.max(...scheduleInsights.map(s => s.rsvps), 1);
  const getCellRsvps = (dayIdx: number, slotName: string) => {
    const match = scheduleInsights.find(s => s.dayOfWeek === dayIdx && s.timeOfDay === slotName);
    return match ? match.rsvps : 0;
  };

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-500">
      
      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <div className="bg-zinc-50 p-3.5 sm:p-4 rounded-2xl border border-black/5 hover:border-black/10 transition-colors shadow-xs">
          <p className="text-[9px] sm:text-[10px] text-zinc-400 font-black uppercase tracking-wider mb-1">Total RSVP volume</p>
          <p className="text-2xl sm:text-3xl font-black italic text-black leading-none">{aggregates.totalRsvps}</p>
          <p className="text-[8px] sm:text-[9px] text-zinc-400 mt-1 font-semibold">Across all your events</p>
        </div>

        <div className="bg-zinc-50 p-3.5 sm:p-4 rounded-2xl border border-black/5 hover:border-black/10 transition-colors shadow-xs">
          <p className="text-[9px] sm:text-[10px] text-zinc-400 font-black uppercase tracking-wider mb-1">Active Followers</p>
          <p className="text-2xl sm:text-3xl font-black italic text-primary leading-none">{aggregates.totalFollowers}</p>
          <p className="text-[8px] sm:text-[9px] text-zinc-400 mt-1 font-semibold">Direct community reach</p>
        </div>

        <div className="bg-zinc-50 p-3.5 sm:p-4 rounded-2xl border border-black/5 hover:border-black/10 transition-colors shadow-xs">
          <p className="text-[9px] sm:text-[10px] text-zinc-400 font-black uppercase tracking-wider mb-1">Super Fan Count</p>
          <p className="text-2xl sm:text-3xl font-black italic text-[#EAB308] leading-none">{aggregates.superfans}</p>
          <p className="text-[8px] sm:text-[9px] text-zinc-400 mt-1 font-semibold">Attendees with 2+ RSVPs</p>
        </div>

        <div className="bg-zinc-50 p-3.5 sm:p-4 rounded-2xl border border-black/5 hover:border-black/10 transition-colors shadow-xs">
          <p className="text-[9px] sm:text-[10px] text-zinc-400 font-black uppercase tracking-wider mb-1">Outreach Conversion</p>
          <p className="text-2xl sm:text-3xl font-black italic text-[#22C55E] leading-none">{broadcastStats.conversionRate}%</p>
          <p className="text-[8px] sm:text-[9px] text-zinc-400 mt-1 font-semibold">{broadcastStats.conversions} conversions from blasts</p>
        </div>
      </div>

      {/* Primary Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 sm:gap-5">
        
        {/* Venue insights */}
        <div className="ringer-card p-4 sm:p-5 rounded-2xl">
          <h3 className="text-sm sm:text-base font-black uppercase tracking-wider mb-0.5">Venue & Locality Popularity</h3>
          <p className="text-[10px] sm:text-xs text-zinc-400 mb-3 font-semibold">Which venues attract the highest density of RSVPs?</p>
          
          <div className="h-48 sm:h-52">
            {venueInsights.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-300 text-xs uppercase tracking-wider font-bold">
                No venue records detected
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={venueInsights}
                  layout="vertical"
                  margin={{ top: 0, right: 15, left: 10, bottom: 0 }}
                >
                  <XAxis type="number" stroke="#888888" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    stroke="#888888" 
                    fontSize={9} 
                    tickLine={false} 
                    axisLine={false}
                    width={90}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#18181B", borderRadius: "10px", border: "none", padding: "6px 10px" }}
                    labelStyle={{ color: "#FFFFFF", fontWeight: "bold", fontSize: "10px" }}
                    itemStyle={{ color: "#C1FF00", fontSize: "10px" }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {venueInsights.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? "#C1FF00" : "#18181B"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Audience Cohort Freshness */}
        <div className="ringer-card p-4 sm:p-5 rounded-2xl">
          <h3 className="text-sm sm:text-base font-black uppercase tracking-wider mb-0.5">Audience Retention & Freshness</h3>
          <p className="text-[10px] sm:text-xs text-zinc-400 mb-3 font-semibold">Breakdown of first-time attendees versus repeating superfans.</p>

          <div className="h-48 sm:h-52 flex flex-col sm:flex-row items-center justify-center">
            {freshnessInsights.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-300 text-xs uppercase tracking-wider font-bold">
                No attendee cohorts found
              </div>
            ) : (
              <>
                <div className="w-full sm:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={freshnessInsights}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={68}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {freshnessInsights.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#18181B", borderRadius: "10px", border: "none", padding: "6px 10px" }}
                        itemStyle={{ color: "#FFFFFF", fontSize: "10px" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 flex flex-col gap-2.5 justify-center pl-2 sm:pl-4 mt-2 sm:mt-0">
                  {freshnessInsights.map((item, index) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                      />
                      <div className="flex justify-between w-full text-xs font-semibold">
                        <span className="text-zinc-600 text-[11px]">{item.name}</span>
                        <span className="text-black font-black font-mono text-xs">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

      </div>

      {/* Scheduling Heat Grid */}
      <div className="ringer-card p-4 sm:p-5 rounded-2xl">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-2">
          <div>
            <h3 className="text-sm sm:text-base font-black uppercase tracking-wider">Event Scheduling Heat Grid</h3>
            <p className="text-[10px] sm:text-xs text-zinc-400 font-semibold">Identify which days of the week and times of day drive optimal RSVP density.</p>
          </div>
          {/* Legend */}
          <div className="flex gap-2 sm:gap-3 items-center text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-400 shrink-0">
            <span>Low</span>
            <div className="flex gap-1">
              <div className="w-3.5 h-3.5 rounded bg-zinc-50 border border-black/5" />
              <div className="w-3.5 h-3.5 rounded bg-[#C1FF00]/30" />
              <div className="w-3.5 h-3.5 rounded bg-[#C1FF00]/60" />
              <div className="w-3.5 h-3.5 rounded bg-[#C1FF00]" />
            </div>
            <span>Peak</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <div className="w-full min-w-[440px] sm:min-w-full space-y-1.5 sm:space-y-2 pt-2">
            
            {/* Grid Header Days */}
            <div className="grid grid-cols-8 gap-1.5 sm:gap-2 text-center text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-400">
              <div>Slot / Day</div>
              {DAYS.map(day => (
                <div key={day}>{day.substring(0, 3)}</div>
              ))}
            </div>

            {/* Time Slot Rows */}
            {TIME_SLOTS.map(slot => (
              <div key={slot} className="grid grid-cols-8 gap-1.5 sm:gap-2 items-center">
                
                {/* Y-Axis Label */}
                <div className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-zinc-500 text-left pl-1 sm:pl-2">
                  {slot}
                </div>

                {/* Heat Cells */}
                {DAYS.map((day, dayIdx) => {
                  const rsvpsCount = getCellRsvps(dayIdx, slot);
                  const intensity = rsvpsCount > 0 ? rsvpsCount / maxRsvps : 0;
                  
                  // Use intensity to scale color opacity
                  return (
                    <div
                      key={`${dayIdx}-${slot}`}
                      className="group relative h-9 sm:h-11 rounded-lg flex flex-col items-center justify-center border transition-all duration-300"
                      style={{
                        backgroundColor: rsvpsCount > 0 
                          ? `rgba(193, 255, 0, ${0.15 + intensity * 0.85})` 
                          : "#FAF9F6",
                        borderColor: rsvpsCount > 0 
                          ? `rgba(193, 255, 0, ${0.3 + intensity * 0.7})` 
                          : "rgba(0, 0, 0, 0.03)"
                      }}
                    >
                      <span className={`text-[11px] sm:text-xs font-mono font-black ${rsvpsCount > 0 ? "text-black" : "text-zinc-300"}`}>
                        {rsvpsCount}
                      </span>
                      
                      {/* Tooltip on hover */}
                      <div className={`pointer-events-none absolute -top-8 bg-black text-white text-[9px] py-1 px-2 rounded-md font-bold whitespace-nowrap shadow-md z-10 hidden group-hover:block ${
                        dayIdx >= 5 
                          ? "right-0" 
                          : dayIdx <= 1 
                            ? "left-0" 
                            : "left-1/2 -translate-x-1/2"
                      }`}>
                        {rsvpsCount} RSVPs on {day} {slot}s
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            
          </div>
        </div>

      </div>

    </div>
  );
}
