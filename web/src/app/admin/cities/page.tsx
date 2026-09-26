"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, MapPin, Sparkles, Clock, Globe } from "lucide-react";
import { toast } from "sonner";
import { vibeConfirm } from "@/components/vibe-confirm";
import { getAllWorldTimezones, getTimezoneAbbr } from "@/lib/timezone";
import { WorldTimezoneSelector } from "@/components/WorldTimezoneSelector";

type City = {
  id: number;
  name: string;
  timezone?: string;
  created_at: string;
};

// Common alias map for cities whose canonical IANA timezone differs in city name
const CITY_TIMEZONE_ALIASES: Record<string, string> = {
  "hyderabad": "Asia/Kolkata",
  "visakhapatnam": "Asia/Kolkata",
  "vizag": "Asia/Kolkata",
  "bengaluru": "Asia/Kolkata",
  "bangalore": "Asia/Kolkata",
  "mumbai": "Asia/Kolkata",
  "bombay": "Asia/Kolkata",
  "delhi": "Asia/Kolkata",
  "new delhi": "Asia/Kolkata",
  "chennai": "Asia/Kolkata",
  "madras": "Asia/Kolkata",
  "pune": "Asia/Kolkata",
  "san francisco": "America/Los_Angeles",
  "sf": "America/Los_Angeles",
  "seattle": "America/Los_Angeles",
  "boston": "America/New_York",
  "miami": "America/New_York",
  "dallas": "America/Chicago",
  "houston": "America/Chicago",
  "austin": "America/Chicago",
};

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCityName, setNewCityName] = useState("");
  const [newCityTimezone, setNewCityTimezone] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCities = () => {
    setLoading(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/cities`)
      .then(r => r.json())
      .then(data => { if (data.success) setCities(data.data); })
      .catch(err => console.error("Fetch cities error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCities(); }, []);

  const handleCityNameChange = (name: string) => {
    setNewCityName(name);
    const cleaned = name.trim().toLowerCase();
    if (!cleaned) return;

    // 1. Check alias dictionary
    if (CITY_TIMEZONE_ALIASES[cleaned]) {
      setNewCityTimezone(CITY_TIMEZONE_ALIASES[cleaned]);
      return;
    }

    // 2. Search against all 400+ world timezones by city/location name
    const normalized = cleaned.replace(/[^a-z0-9]/g, "");
    const match = getAllWorldTimezones().find(tz => {
      const tzCity = tz.city.toLowerCase().replace(/[^a-z0-9]/g, "");
      const tzVal = tz.value.toLowerCase().replace(/[^a-z0-9]/g, "");
      return tzCity === normalized || tzVal.includes(normalized);
    });

    if (match) {
      setNewCityTimezone(match.value);
    }
  };

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim()) return;
    if (!newCityTimezone) {
      toast.error("Please select a valid timezone for this city.");
      return;
    }
    
    setSaving(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/admin/cities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newCityName.trim(),
          timezone: newCityTimezone
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCityName("");
        setNewCityTimezone("");
        toast.success(`City "${newCityName.trim()}" established with timezone (${newCityTimezone}).`);
        fetchCities();
      } else {
        toast.error(data.error || "Failed to add city.");
      }
    } catch (err) {
      console.error("Failed to add city:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCity = async (id: number, name: string) => {
    const confirmed = await vibeConfirm({
      title: `Delete "${name}"?`,
      message: "This may cause issues for events currently assigned to this city. This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/admin/cities/${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`"${name}" removed.`);
        fetchCities();
      } else {
        toast.error(data.error || "Failed to delete city.");
      }
    } catch (err) {
      console.error("Failed to delete city:", err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in duration-700">
      
      {/* Page Header */}
      <div className="border-b border-black/5 pb-12">
        <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase leading-[0.9]">
          Territory Control
        </h1>
        <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Managing the Global Reach of VibeCheck</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Add City Column */}
        <div className="lg:col-span-4 space-y-8">
          <Card className="ringer-card bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Establish New Vibe
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddCity} className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase ml-1">City Identity</Label>
                  <Input 
                    value={newCityName} 
                    onChange={e => handleCityNameChange(e.target.value)}
                    placeholder="e.g. TOKYO" 
                    required
                    className="bg-white border-black/5 rounded-xl h-12 text-sm font-bold uppercase tracking-widest focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-zinc-400 uppercase ml-1 flex items-center gap-1">
                    <Clock className="h-3 w-3 text-primary" /> City Timezone
                  </Label>
                  <WorldTimezoneSelector
                    value={newCityTimezone}
                    onChange={tz => setNewCityTimezone(tz)}
                  />
                  <p className="text-[9px] text-zinc-400 font-bold ml-1">In-person events in this city will automatically use this timezone.</p>
                </div>

                <button 
                  type="submit" 
                  disabled={saving}
                  className="ringer-button w-full bg-black text-white h-12 text-[10px] flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4 text-primary" />
                  {saving ? "ESTABLISHING..." : "EXPAND REACH"}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Cities List Column */}
        <div className="lg:col-span-8 space-y-8">
          <div className="flex justify-between items-center px-2">
            <h2 className="text-black text-xs font-black uppercase tracking-[0.2em]">Current Jurisdictions ({cities.length})</h2>
          </div>

          <div className="space-y-4">
            {loading ? (
              <div className="p-12 text-center text-zinc-400 text-xs font-black uppercase tracking-widest animate-pulse">Scanning frequencies...</div>
            ) : cities.length === 0 ? (
              <div className="ringer-card p-12 text-center text-zinc-400 text-xs font-bold italic">No territories established yet.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {cities.map(city => {
                  const tz = city.timezone || "Asia/Kolkata";
                  const tzAbbr = getTimezoneAbbr(tz);
                  return (
                    <div key={city.id} className="ringer-card p-6 flex items-center justify-between hover:border-primary/30 transition-all group overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-2xl -z-10 group-hover:bg-primary/10 transition-all"></div>
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-[15px] bg-zinc-50 border border-black/5 flex items-center justify-center group-hover:bg-white transition-all shrink-0">
                          <MapPin className="h-5 w-5 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="text-black font-black uppercase italic tracking-tighter text-xl">{city.name}</h3>
                            <span className="sticker-badge bg-zinc-100 border-zinc-200 text-zinc-700 text-[8px] font-black uppercase py-0.5 px-2">
                              {tzAbbr}
                            </span>
                          </div>
                          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                            {tz} • EST. {new Date(city.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteCity(city.id, city.name)}
                        className="h-10 w-10 rounded-full flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100 shrink-0"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
