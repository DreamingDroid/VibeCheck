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
  const [cronEnabled, setCronEnabled] = useState(false);
  const [updatingCron, setUpdatingCron] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [updatingWhatsapp, setUpdatingWhatsapp] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("http://localhost:4000/api/admin/analytics").then(r => r.json()),
      fetch("http://localhost:4000/api/admin/settings").then(r => r.json())
    ])
    .then(([analyticsRes, settingsRes]) => {
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
      if (settingsRes.success && settingsRes.data) {
        const cronVal = settingsRes.data.cron_enabled;
        setCronEnabled(cronVal === "true" || cronVal === true);
        const waVal = settingsRes.data.whatsapp_enabled;
        setWhatsappEnabled(waVal === undefined || waVal === "true" || waVal === true);
      }
    })
    .finally(() => setLoading(false));
  }, []);

  const toggleCron = async () => {
    setUpdatingCron(true);
    const newValue = !cronEnabled;
    try {
      const res = await fetch("http://localhost:4000/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "cron_enabled", value: newValue ? "true" : "false" })
      });
      const data = await res.json();
      if (data.success) {
        setCronEnabled(newValue);
      }
    } catch (e) {
      console.error("Failed to update setting", e);
    }
    setUpdatingCron(false);
  };

  const toggleWhatsapp = async () => {
    setUpdatingWhatsapp(true);
    const newValue = !whatsappEnabled;
    try {
      const res = await fetch("http://localhost:4000/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "whatsapp_enabled", value: newValue ? "true" : "false" })
      });
      const data = await res.json();
      if (data.success) {
        setWhatsappEnabled(newValue);
      }
    } catch (e) {
      console.error("Failed to update setting", e);
    }
    setUpdatingWhatsapp(false);
  };

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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
            Overview
          </h1>
          <p className="text-zinc-500 text-sm mt-1">Platform analytics at a glance.</p>
        </div>
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 px-5 py-3 rounded-xl shadow-lg min-w-[250px]">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white mb-0.5">Push Alerts (Cron Job)</span>
              <span className="text-xs text-zinc-500">Scheduled 9:00 AM IST</span>
            </div>
            <button
              onClick={toggleCron}
              disabled={updatingCron}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${cronEnabled ? 'bg-emerald-500' : 'bg-zinc-700'} ${updatingCron ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${cronEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between gap-4 bg-zinc-900 border border-zinc-800 px-5 py-3 rounded-xl shadow-lg min-w-[250px]">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-white mb-0.5">WhatsApp Notify</span>
              <span className="text-xs text-zinc-500">Show buttons on dashboard</span>
            </div>
            <button
              onClick={toggleWhatsapp}
              disabled={updatingWhatsapp}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${whatsappEnabled ? 'bg-emerald-500' : 'bg-zinc-700'} ${updatingWhatsapp ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${whatsappEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>
        </div>
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
