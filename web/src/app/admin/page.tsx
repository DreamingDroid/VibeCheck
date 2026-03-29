"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#ec4899", "#14b8a6", "#f97316", "#84cc16"];

type Analytics = {
  totalEvents: number;
  totalWebUsers: number;
  totalWhatsappUsers: number;
  eventsByCategory: { category: string; count: string }[];
  topPreferences: { category: string; count: string }[];
};

export default function AdminPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:4000/api/admin/analytics")
      .then(r => r.json())
      .then(data => { if (data.success) setAnalytics(data.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-zinc-800 rounded" />
        <div className="grid grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-zinc-900 rounded-xl border border-zinc-800" />)}
        </div>
        <div className="h-72 bg-zinc-900 rounded-xl border border-zinc-800" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Events", value: analytics?.totalEvents ?? 0, icon: "🎉", color: "text-indigo-400" },
    { label: "Web Users", value: analytics?.totalWebUsers ?? 0, icon: "🌐", color: "text-cyan-400" },
    { label: "WhatsApp Users", value: analytics?.totalWhatsappUsers ?? 0, icon: "📱", color: "text-emerald-400" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
          Overview
        </h1>
        <p className="text-zinc-500 text-sm mt-1">Platform analytics at a glance.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map(s => (
          <Card key={s.label} className="bg-zinc-900 border-zinc-800">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-zinc-400 text-sm">{s.label}</p>
                  <p className={`text-4xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                </div>
                <span className="text-4xl">{s.icon}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Events by Category */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Events by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics?.eventsByCategory ?? []} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                <XAxis dataKey="category" tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#fff" }}
                  cursor={{ fill: "rgba(99,102,241,0.1)" }}
                />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {(analytics?.eventsByCategory ?? []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Preferred Categories */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-base">User Preferred Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {(analytics?.topPreferences ?? []).length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-zinc-600 text-sm">
                No preference data yet — users haven&apos;t saved their interests.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics?.topPreferences ?? []} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <XAxis type="number" tick={{ fill: "#71717a", fontSize: 11 }} allowDecimals={false} />
                  <YAxis dataKey="category" type="category" tick={{ fill: "#a1a1aa", fontSize: 12 }} width={70} />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: 8, color: "#fff" }}
                    cursor={{ fill: "rgba(99,102,241,0.1)" }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                    {(analytics?.topPreferences ?? []).map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
