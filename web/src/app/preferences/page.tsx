"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Heart, MapPin, Phone, Sparkles } from "lucide-react";

const ALL_CATEGORIES = [
  "Sports", "Arts", "Education", "Spiritual",
  "Music", "Food", "Wellness", "Indie", "Techno", "General",
];

export default function PreferencesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [selected, setSelected] = useState<string[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [city, setCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch(`http://localhost:4000/api/user?email=${encodeURIComponent(session.user.email)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setSelected(data.data.categories || []);
          setPhoneNumber(data.data.phone_number || "");
          setCity(data.data.city || "");
        }
      })
      .catch(err => console.error("Pref load error:", err))
      .finally(() => setLoading(false));
  }, [session?.user?.email]);

  const toggleCategory = (cat: string) => {
    setSelected((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
    setSaved(false);
  };

  const handleSave = async () => {
    if (!session?.user?.email) return;
    setSaving(true);
    setSaved(false);
    try {
      await fetch("http://localhost:4000/api/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          name: session.user.name,
          categories: selected,
          phone_number: phoneNumber.trim() || null,
          city: city.trim() || null,
        }),
      });
      setSaved(true);
    } catch (err) {
      console.error("Save pref error:", err);
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isWhatsAppLinked = !!phoneNumber.trim();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-12 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-black/5 pb-12">
        <div>
          <h1 className="text-5xl font-black italic tracking-tighter uppercase leading-[0.9]">
            Identity Matrix
          </h1>
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Configuring Your Personal Vibe Frequency</p>
        </div>
        <Link href="/dashboard">
          <button className="ringer-button border-2 border-black/5 hover:bg-black hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <ArrowLeft className="h-3 w-3" /> RETURN TO PORTAL
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Col: Selections */}
        <div className="lg:col-span-8 space-y-8">
          <Card className="ringer-card">
            <CardHeader>
              <CardTitle className="text-black text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary fill-primary" />
                Vibe Interests
              </CardTitle>
              <CardDescription className="text-zinc-400 text-[11px] font-bold">
                Synchronize your feed with specific frequencies. These tags define what vibes find you first.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                {ALL_CATEGORIES.map((cat) => {
                  const isActive = selected.includes(cat);
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      className={`px-5 py-3 rounded-full text-xs font-black uppercase tracking-widest border transition-all duration-300
                        ${isActive
                          ? "bg-black border-black text-white shadow-xl scale-105"
                          : "bg-zinc-50 border-black/5 text-zinc-400 hover:border-black hover:text-black hover:bg-white"
                        }`}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
             <Card className="ringer-card">
              <CardHeader>
                <CardTitle className="text-black text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Home Base
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label htmlFor="city" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Preferred Territory</Label>
                <Input
                  id="city"
                  placeholder="CITY OR NEIGHBORHOOD"
                  value={city}
                  onChange={(e) => { setCity(e.target.value); setSaved(false); }}
                  className="bg-zinc-50 border-black/5 h-12 rounded-xl text-sm font-bold uppercase focus:ring-primary"
                />
              </CardContent>
            </Card>

            <Card className={`ringer-card transition-colors duration-300 ${isWhatsAppLinked ? "bg-primary/5 border-primary/20" : "bg-white"}`}>
              <CardHeader>
                <CardTitle className="text-black text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  Alert Frequency
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">WhatsApp Hookup</Label>
                <Input
                  id="phone"
                  placeholder="E.G. +91 00000 00000"
                  value={phoneNumber}
                  onChange={(e) => { setPhoneNumber(e.target.value); setSaved(false); }}
                  className="bg-white border-black/5 h-12 rounded-xl text-sm font-bold uppercase focus:ring-primary"
                />
                {isWhatsAppLinked && (
                  <p className="text-[9px] font-black tracking-widest text-primary uppercase animate-in fade-in">
                    ✓ NEURAL LINK ACTIVE
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Col: Summary & Save */}
        <div className="lg:col-span-4 h-fit sticky top-32">
           <Card className="ringer-card bg-black text-white p-2">
              <CardHeader className="p-8 pb-4">
                 <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none text-white">Identity Status</h3>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-8">
                 <div className="space-y-4">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                       <span className="text-zinc-500">Categories Linked</span>
                       <span className="text-white">{selected.length}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                       {selected.map(c => <Badge key={c} className="bg-primary text-black font-black border-none text-[8px] uppercase">{c}</Badge>)}
                    </div>
                 </div>

                 <div className="pt-4 border-t border-white/10 space-y-6">
                    {saved && (
                      <div className="flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] animate-in bounce-in">
                        <CheckCircle2 className="h-4 w-4" /> CONFIGS SYNCHRONIZED
                      </div>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={saving || selected.length === 0}
                      className="ringer-button w-full bg-primary text-black h-16 text-xs font-black flex items-center justify-center gap-3 disabled:opacity-50 group hover:scale-[1.02] transition-all"
                    >
                      {saving ? "SYNCING..." : "COMMIT CHANGES"}
                      <Sparkles className="h-4 w-4 group-hover:animate-spin" />
                    </button>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
