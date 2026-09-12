"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Globe, Heart, MapPin, Phone, Sparkles } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCity } from "@/context/CityContext";
import { useLanguage, useTranslation, ALL_LANGUAGES, LanguageCode } from "@/context/LanguageContext";

const ALL_CATEGORIES = [
  "Sports", "Arts", "Education", "Spiritual",
  "Music", "Food", "Wellness", "Indie", "Techno", "General",
];

export default function PreferencesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { supportedCities } = useCity();
  const { language, setLanguage, detectedCountry, detectedCountryName, availableLanguages, hasMultipleLanguages, autoDetectEnabled, setAutoDetectEnabled } = useLanguage();
  const { t } = useTranslation();

  const [selected, setSelected] = useState<string[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [city, setCity] = useState("");
  const [profession, setProfession] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/");
  }, [status, router]);

  useEffect(() => {
    if (!session?.user?.email) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/user?email=${encodeURIComponent(session.user.email)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setSelected(data.data.categories || []);
          setPhoneNumber(data.data.phone_number || "");
          setCity(data.data.city || "");
          setProfession(data.data.profession || "");
          setAgeGroup(data.data.age_group || "");
          if (data.data.language && (data.data.language === "en" || data.data.language === "nl")) {
            setLanguage(data.data.language as LanguageCode, true);
          }
        }
      })
      .catch(err => console.error("Pref load error:", err))
      .finally(() => setLoading(false));
  }, [session?.user?.email, setLanguage]);

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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      await fetch(`${baseUrl}/api/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.user.email,
          name: session.user.name,
          categories: selected,
          phone_number: phoneNumber.trim() || null,
          city: city.trim() || null,
          profession: profession.trim() || null,
          age_group: ageGroup.trim() || null,
          language: language,
        }),
      });
      // Ensure manual preference is locked in localStorage so location never overrides it
      setLanguage(language, true);
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 lg:py-12 space-y-6 lg:space-y-12 animate-in fade-in duration-700 pb-28 lg:pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 lg:gap-6 border-b border-black/5 pb-6 lg:pb-12">
        <div>
          <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase leading-[0.9]">
            {t("pref.title")}
          </h1>
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2">{t("pref.subtitle")}</p>
        </div>
        <Link href="/dashboard">
          <button className="ringer-button border-2 border-black/5 hover:bg-black hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <ArrowLeft className="h-3 w-3" /> {t("pref.return")}
          </button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12">
        {/* Left Col: Selections */}
        <div className="lg:col-span-8 space-y-6 lg:space-y-8">
          <Card className="ringer-card">
            <CardHeader>
              <CardTitle className="text-black text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Heart className="h-4 w-4 text-primary fill-primary" />
                {t("pref.vibe_interests")}
              </CardTitle>
              <CardDescription className="text-zinc-400 text-[11px] font-bold">
                {t("pref.vibe_interests_desc")}
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
                      className={`px-4 py-2.5 lg:px-5 lg:py-3 rounded-full text-[10px] lg:text-xs font-black uppercase tracking-widest border transition-all duration-300
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-8">
             <Card className="ringer-card">
              <CardHeader>
                <CardTitle className="text-black text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  {t("pref.home_base")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label htmlFor="city" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{t("pref.preferred_territory")}</Label>
                <Select value={city || undefined} onValueChange={(val) => { setCity(val ?? ""); setSaved(false); }}>
                  <SelectTrigger className="bg-zinc-50 border-black/5 h-12 rounded-xl text-sm font-bold uppercase focus:ring-primary w-full">
                    <SelectValue placeholder="SELECT CITY" />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedCities.map(c => (
                      <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

             <Card className="ringer-card">
              <CardHeader>
                <CardTitle className="text-black text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {t("pref.demographics")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profession" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{t("pref.profession")}</Label>
                  <Select value={profession || undefined} onValueChange={(val) => { setProfession(val === "Skip" ? "" : (val ?? "")); setSaved(false); }}>
                    <SelectTrigger className="bg-zinc-50 border-black/5 h-12 rounded-xl text-sm font-bold uppercase focus:ring-primary w-full">
                      <SelectValue placeholder="SELECT PROFESSION" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Skip">Skip / Prefer not to say</SelectItem>
                      <SelectItem value="Software Engineer">Software Engineer</SelectItem>
                      <SelectItem value="Designer">Designer</SelectItem>
                      <SelectItem value="Product Manager">Product Manager</SelectItem>
                      <SelectItem value="Marketer">Marketer</SelectItem>
                      <SelectItem value="Founder / Entrepreneur">Founder / Entrepreneur</SelectItem>
                      <SelectItem value="Student">Student</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ageGroup" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{t("pref.age_group")}</Label>
                  <Select value={ageGroup || undefined} onValueChange={(val) => { setAgeGroup(val === "Skip" ? "" : (val ?? "")); setSaved(false); }}>
                    <SelectTrigger className="bg-zinc-50 border-black/5 h-12 rounded-xl text-sm font-bold uppercase focus:ring-primary w-full">
                      <SelectValue placeholder="SELECT AGE GROUP" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Skip">Skip / Prefer not to say</SelectItem>
                      <SelectItem value="18-24">18-24</SelectItem>
                      <SelectItem value="25-34">25-34</SelectItem>
                      <SelectItem value="35-44">35-44</SelectItem>
                      <SelectItem value="45-54">45-54</SelectItem>
                      <SelectItem value="55+">55+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Language & Regional Settings */}
            <Card className="ringer-card md:col-span-2">
              <CardHeader>
                <CardTitle className="text-black text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  {t("pref.language_settings")}
                </CardTitle>
                <CardDescription className="text-zinc-400 text-[11px] font-bold">
                  {t("pref.language_desc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-zinc-50 border border-black/5 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 block">{t("pref.detected_country")}</span>
                      <span className="text-sm font-bold text-black mt-0.5 block">{detectedCountryName} ({detectedCountry})</span>
                    </div>
                    <span className="text-2xl">{detectedCountry === "NL" ? "🇳🇱" : detectedCountry === "IN" ? "🇮🇳" : "🌐"}</span>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">
                      {t("pref.current_language")}
                    </Label>
                    <Select value={language} onValueChange={(val) => { setLanguage(val as LanguageCode, true); setSaved(false); }}>
                      <SelectTrigger className="bg-zinc-50 border-black/5 h-12 rounded-xl text-sm font-bold uppercase focus:ring-primary w-full">
                        <SelectValue placeholder="SELECT LANGUAGE" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(ALL_LANGUAGES).map((l) => (
                          <SelectItem key={l.code} value={l.code}>
                            {l.flag} {l.name} ({l.nativeName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`ringer-card transition-colors duration-300 md:col-span-2 ${isWhatsAppLinked ? "bg-primary/5 border-primary/20" : "bg-white"}`}>
              <CardHeader>
                <CardTitle className="text-black text-xs font-black uppercase tracking-widest flex items-center gap-2">
                  <Phone className="h-4 w-4 text-primary" />
                  Alert Frequency
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">{t("pref.whatsapp_hookup")}</Label>
                <Input
                  id="phone"
                  placeholder="E.G. +91 00000 00000"
                  value={phoneNumber}
                  onChange={(e) => { setPhoneNumber(e.target.value); setSaved(false); }}
                  className="bg-white border-black/5 h-12 rounded-xl text-sm font-bold uppercase focus:ring-primary"
                />
                {isWhatsAppLinked && (
                  <p className="text-[9px] font-black tracking-widest text-primary uppercase animate-in fade-in">
                    {t("pref.neural_link_active")}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right Col: Summary & Save */}
        <div className="fixed bottom-0 left-0 right-0 z-50 p-3 lg:p-0 lg:relative lg:col-span-4 lg:h-fit lg:sticky lg:top-32 lg:z-auto bg-black lg:bg-transparent shadow-[0_-20px_40px_rgba(0,0,0,0.4)] lg:shadow-none animate-in slide-in-from-bottom-full lg:slide-in-from-bottom-0">
           <Card className="ringer-card bg-black text-white p-0 lg:p-2 border-none lg:border-solid rounded-xl lg:rounded-2xl">
              <CardHeader className="hidden lg:block p-6 pb-4">
                 <h3 className="text-3xl font-black italic tracking-tight uppercase leading-tight text-white">{t("pref.identity_status")}</h3>
              </CardHeader>
              <CardContent className="p-3 lg:p-6 lg:pt-0 space-y-0 lg:space-y-8 flex flex-row lg:flex-col items-center lg:items-stretch justify-between gap-4 lg:gap-0">
                 <div className="space-y-0 lg:space-y-4 flex-1 lg:flex-none">
                    <div className="flex justify-between items-center text-[10px] lg:text-xs font-black uppercase tracking-widest">
                       <span className="text-zinc-400 hidden lg:inline">{t("pref.categories_linked")}</span>
                       <span className="text-zinc-300 lg:hidden leading-tight"><span className="text-white text-sm">{selected.length}</span><br/>Selected</span>
                       <span className="text-white hidden lg:inline text-sm">{selected.length}</span>
                    </div>
                    <div className="hidden lg:flex flex-wrap gap-2 mt-4 lg:mt-2">
                       {selected.map(c => <Badge key={c} className="bg-primary text-black font-black border-none text-[10px] px-2.5 py-1 rounded-md uppercase">{c}</Badge>)}
                    </div>
                 </div>

                 <div className="lg:pt-6 lg:border-t lg:border-white/20 space-y-0 lg:space-y-6 flex-[2] lg:flex-none flex items-center lg:block">
                    {saved && (
                      <div className="hidden lg:flex items-center gap-2 text-primary font-black uppercase tracking-widest text-[10px] animate-in bounce-in">
                        <CheckCircle2 className="h-4 w-4" /> {t("pref.synchronized")}
                      </div>
                    )}
                    <button
                      onClick={handleSave}
                      disabled={saving || selected.length === 0}
                      className="ringer-button w-full bg-primary text-black h-12 lg:h-16 px-2 lg:px-4 text-[10px] lg:text-xs font-black flex items-center justify-center gap-2 disabled:opacity-50 group hover:scale-[1.02] transition-all rounded-lg lg:rounded-xl whitespace-nowrap"
                    >
                      {saving ? t("pref.syncing") : (saved ? t("pref.synchronized") : t("pref.commit_changes"))}
                      <Sparkles className="h-3 w-3 lg:h-4 lg:w-4 shrink-0 group-hover:animate-spin" />
                    </button>
                 </div>
              </CardContent>
           </Card>
        </div>
      </div>
    </div>
  );
}
