"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Plus, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { vibeConfirm } from "@/components/vibe-confirm";

type City = {
  id: number;
  name: string;
  created_at: string;
};

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [newCityName, setNewCityName] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCities = () => {
    setLoading(true);
    fetch("http://localhost:4000/api/cities")
      .then(r => r.json())
      .then(data => { if (data.success) setCities(data.data); })
      .catch(err => console.error("Fetch cities error:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchCities(); }, []);

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim()) return;
    
    setSaving(true);
    try {
      const res = await fetch("http://localhost:4000/api/admin/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCityName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCityName("");
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
      const res = await fetch(`http://localhost:4000/api/admin/cities/${id}`, {
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
        <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-[0.9]">
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
                    onChange={e => setNewCityName(e.target.value)}
                    placeholder="e.g. TOKYO" 
                    required
                    className="bg-white border-black/5 rounded-xl h-12 text-sm font-bold uppercase tracking-widest focus:ring-primary focus:border-primary"
                  />
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
                {cities.map(city => (
                  <div key={city.id} className="ringer-card p-6 flex items-center justify-between hover:border-primary/30 transition-all group overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full blur-2xl -z-10 group-hover:bg-primary/10 transition-all"></div>
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-[15px] bg-zinc-50 border border-black/5 flex items-center justify-center group-hover:bg-white transition-all">
                        <MapPin className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-black font-black uppercase italic tracking-tighter text-xl">{city.name}</h3>
                        <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest mt-0.5">EST. {new Date(city.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteCity(city.id, city.name)}
                      className="h-10 w-10 rounded-full flex items-center justify-center text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all border border-transparent hover:border-red-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
