"use client";

import { useEffect, useState } from "react";
import { Sliders, Sparkles, Zap, MessageSquare, Globe, Check, MapPin, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage, ALL_LANGUAGES, LanguageOption, LanguageCode } from "@/context/LanguageContext";

export default function CommandControlPage() {
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<Record<string, boolean>>({});
  const {
    language,
    setLanguage,
    detectedCountry,
    detectedCountryName,
    isDetectingLocation,
    autoDetectEnabled,
    setAutoDetectEnabled,
  } = useLanguage();

  // Configuration States
  const [autoScroll, setAutoScroll] = useState(true);
  const [cronEnabled, setCronEnabled] = useState(false);
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/admin/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const autoVal = data.data.auto_scroll_enabled;
          setAutoScroll(autoVal === undefined || autoVal === "true" || autoVal === true);
          
          const cronVal = data.data.cron_enabled;
          setCronEnabled(cronVal === "true" || cronVal === true);
          
          const waVal = data.data.whatsapp_enabled;
          setWhatsappEnabled(waVal === undefined || waVal === "true" || waVal === true);
        }
      })
      .catch((err) => {
        console.error("Failed to load settings:", err);
        toast.error("Failed to load platform settings");
      })
      .finally(() => setLoading(false));
  }, []);

  const updateSetting = async (key: string, value: boolean, setter: (val: boolean) => void) => {
    setUpdating((prev) => ({ ...prev, [key]: true }));
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/admin/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: value ? "true" : "false" }),
      });
      const data = await res.json();
      if (data.success) {
        setter(value);
        toast.success(`Setting '${key}' updated successfully`);
      } else {
        toast.error(data.error || "Failed to update setting");
      }
    } catch (err) {
      console.error(err);
      toast.error("Network error while saving setting");
    } finally {
      setUpdating((prev) => ({ ...prev, [key]: false }));
    }
  };

  if (loading) {
    return (
      <div className="space-y-12 max-w-4xl mx-auto">
        <div className="h-10 w-64 bg-zinc-100 animate-pulse rounded-full" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-zinc-100 rounded-[24px] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-4xl mx-auto">
      {/* Editorial Header */}
      <div className="border-b border-black/5 pb-12">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 text-purple-600">
            <Sliders className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase leading-[0.9]">
              Command Control
            </h1>
            <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
              Super Admin Platform Engine Configuration
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* SuperAdmin Manual Language Switcher & Localization Override */}
        <Card className="ringer-card overflow-hidden bg-white border border-black/5">
          <CardContent className="p-8 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100 text-blue-600 shrink-0">
                  <Globe className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-black font-black uppercase tracking-[0.05em] text-sm leading-none">
                      Platform Language & Localization Override
                    </h3>
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      SuperAdmin Access
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-medium">
                    SuperAdmin can switch the platform language to any supported language manually on demand, bypassing geographic/network restrictions.
                  </p>
                </div>
              </div>

              {/* Active Language Badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto bg-zinc-100 px-3 py-1.5 rounded-xl border border-black/5">
                <span className="text-xs">{ALL_LANGUAGES[language]?.flag}</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-black">
                  Active: {ALL_LANGUAGES[language]?.nativeName} ({ALL_LANGUAGES[language]?.code.toUpperCase()})
                </span>
              </div>
            </div>

            {/* Language Selector Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {(Object.values(ALL_LANGUAGES) as LanguageOption[]).map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setLanguage(lang.code, true);
                      toast.success(`Platform language manually switched to ${lang.nativeName} (${lang.name})`);
                    }}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all text-left ${
                      isSelected
                        ? "bg-black text-white border-black shadow-lg scale-[1.01]"
                        : "bg-zinc-50/70 hover:bg-zinc-100/80 text-black border-black/5 hover:border-black/15"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{lang.flag}</span>
                      <div>
                        <p className={`text-xs font-black uppercase tracking-wider ${isSelected ? "text-white" : "text-black"}`}>
                          {lang.name}
                        </p>
                        <p className={`text-[10px] font-semibold ${isSelected ? "text-zinc-300" : "text-zinc-500"}`}>
                          {lang.nativeName} ({lang.code.toUpperCase()})
                        </p>
                      </div>
                    </div>
                    {isSelected ? (
                      <div className="h-6 w-6 rounded-full bg-primary text-black flex items-center justify-center font-bold text-xs">
                        <Check className="h-3.5 w-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400 bg-white/80 border border-black/5 px-2.5 py-1 rounded-lg">
                        Switch
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Location & Network Telemetry details */}
            <div className="pt-2 border-t border-black/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-[11px] text-zinc-500">
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                <span>
                  Detected Network Origin:{" "}
                  <strong className="text-zinc-700 font-bold">
                    {detectedCountryName} ({detectedCountry})
                  </strong>
                </span>
                {isDetectingLocation && (
                  <span className="text-[9px] text-primary animate-pulse">(Detecting...)</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setAutoDetectEnabled(true);
                  localStorage.removeItem("vibecheck_language_manual");
                  toast.success("Auto-detection reset. Language will adapt to network location.");
                }}
                className="text-[10px] font-bold text-zinc-500 hover:text-black hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" />
                Reset to Location Auto-Detection
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Toggle 1: Auto Scroll */}
        <Card className="ringer-card overflow-hidden bg-white border border-black/5">
          <CardContent className="p-8 flex items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-pink-50 rounded-2xl border border-pink-100 text-pink-500 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-black font-black uppercase tracking-[0.05em] text-sm leading-none">
                  Article Auto-Scroll Marquee
                </h3>
                <p className="text-xs text-zinc-400 font-medium">
                  When enabled, long event titles in the landing page badges scroll slowly. Otherwise, they are cropped.
                </p>
              </div>
            </div>
            <button
              onClick={() => updateSetting("auto_scroll_enabled", !autoScroll, setAutoScroll)}
              disabled={updating["auto_scroll_enabled"]}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoScroll ? "bg-purple-600" : "bg-zinc-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  autoScroll ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </CardContent>
        </Card>

        {/* Toggle 2: AI Matchmaker */}
        <Card className="ringer-card overflow-hidden bg-white border border-black/5">
          <CardContent className="p-8 flex items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-amber-500 shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-black font-black uppercase tracking-[0.05em] text-sm leading-none">
                  A.I. Matchmaker Engine
                </h3>
                <p className="text-xs text-zinc-400 font-medium">
                  Enable automated CRON task scheduling to match target audiences with relevant events.
                </p>
              </div>
            </div>
            <button
              onClick={() => updateSetting("cron_enabled", !cronEnabled, setCronEnabled)}
              disabled={updating["cron_enabled"]}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                cronEnabled ? "bg-purple-600" : "bg-zinc-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  cronEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </CardContent>
        </Card>

        {/* Toggle 3: WhatsApp Visibility */}
        <Card className="ringer-card overflow-hidden bg-white border border-black/5">
          <CardContent className="p-8 flex items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-green-50 rounded-2xl border border-green-100 text-green-600 shrink-0">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-black font-black uppercase tracking-[0.05em] text-sm leading-none">
                  WhatsApp Visibility Control
                </h3>
                <p className="text-xs text-zinc-400 font-medium">
                  Configure real-time notifications status and integration indicators across the organizer control room.
                </p>
              </div>
            </div>
            <button
              onClick={() => updateSetting("whatsapp_enabled", !whatsappEnabled, setWhatsappEnabled)}
              disabled={updating["whatsapp_enabled"]}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                whatsappEnabled ? "bg-purple-600" : "bg-zinc-200"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  whatsappEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
