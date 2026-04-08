"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  // Load existing preferences
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
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    setSaving(false);
    setSaved(true);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isWhatsAppLinked = !!phoneNumber.trim();

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800 pb-6 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              My Preferences
            </h1>
            <p className="text-zinc-400 mt-1 text-sm">Personalise your Vizag Vibes experience.</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 w-full sm:w-auto mt-2 sm:mt-0">
              ← Back to Events
            </Button>
          </Link>
        </div>

        {/* Category Toggles */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg">Event Interests</CardTitle>
            <CardDescription className="text-zinc-400">
              Select the categories you care about. These will personalise your event feed and — if you link WhatsApp — trigger automatic notifications when new matching events drop.
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
                    className={`px-4 py-2 rounded-full text-sm font-semibold border transition-all duration-200 cursor-pointer
                      ${isActive
                        ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/40 scale-105"
                        : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-indigo-500/50 hover:text-zinc-200"
                      }`}
                  >
                    {isActive ? "✓ " : ""}{cat}
                  </button>
                );
              })}
            </div>
            {selected.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="text-xs text-zinc-500">Selected:</span>
                {selected.map((c) => (
                  <Badge key={c} variant="outline" className="border-indigo-500/40 text-indigo-300 bg-indigo-500/5 text-xs">
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Location Linking */}
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <span>🌎</span> Default Location
            </CardTitle>
            <CardDescription className="text-zinc-400">
              Set your city or neighborhood. The AI will use this to automatically filter events near you, so you don't have to constantly mention where you are!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="city" className="text-zinc-300 text-sm">City or Neighborhood</Label>
            <Input
              id="city"
              type="text"
              placeholder="e.g. Visakhapatnam, MVP Colony..."
              value={city}
              onChange={(e) => { setCity(e.target.value); setSaved(false); }}
              className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-indigo-500"
            />
          </CardContent>
        </Card>

        {/* WhatsApp Linking */}
        <Card className={`border transition-colors duration-300 ${isWhatsAppLinked ? "bg-emerald-950/30 border-emerald-800/50" : "bg-zinc-900 border-zinc-800"}`}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <span>📱</span> Link WhatsApp
                {isWhatsAppLinked && (
                  <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                    ✓ Linked
                  </span>
                )}
              </CardTitle>
            </div>
            <CardDescription className="text-zinc-400">
              <span className="font-medium text-zinc-300">Optional — unlocks Tier 2 features.</span> Providing your number lets you chat with the Vizag Vibes AI Agent on WhatsApp and receive push notifications for new matching events.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="phone" className="text-zinc-300 text-sm">WhatsApp Number (with country code)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="e.g. +919876543210"
              value={phoneNumber}
              onChange={(e) => { setPhoneNumber(e.target.value); setSaved(false); }}
              className="bg-zinc-950 border-zinc-700 text-white placeholder:text-zinc-600 focus-visible:ring-emerald-500"
            />
            {isWhatsAppLinked && (
              <p className="text-xs text-emerald-400/80">
                🤖 You can now message the Vizag Vibes bot on WhatsApp and receive event alerts based on your interests above.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-4">
          {saved && (
            <span className="text-emerald-400 text-sm font-medium animate-in fade-in">
              ✓ Preferences saved!
            </span>
          )}
          <Button
            onClick={handleSave}
            disabled={saving || selected.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 font-semibold shadow-lg shadow-indigo-900/30 disabled:opacity-50 transition-all"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </Button>
        </div>

      </div>
    </div>
  );
}
