"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, FileText, MapPin, ArrowLeft, Users, Shield, Newspaper, Sliders, Radio, Search, Globe } from "lucide-react";
import { useLanguage, ALL_LANGUAGES, LanguageCode, LanguageOption } from "@/context/LanguageContext";
import { toast } from "sonner";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage, detectedCountryName } = useLanguage();
  const [checking, setChecking] = useState(true);
  const [pendingEventsCount, setPendingEventsCount] = useState(0);
  const [pendingOrganizersCount, setPendingOrganizersCount] = useState(0);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); return; }
    if (status === "authenticated" && session?.user?.email) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/admin/check?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(data => {
          if (!data.isAdmin) router.push("/dashboard");
          else setChecking(false);
        })
        .catch(() => router.push("/dashboard"));
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && !checking) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      // Fetch pending events count
      fetch(`${baseUrl}/api/admin/events/pending`)
        .then(r => r.json())
        .then(data => {
          if (data.success && Array.isArray(data.data)) {
            setPendingEventsCount(data.data.length);
          }
        })
        .catch(err => console.error(err));

      // Fetch pending organizers count
      fetch(`${baseUrl}/api/admin/organizers/pending`)
        .then(r => r.json())
        .then(data => {
          if (data.success && Array.isArray(data.data)) {
            setPendingOrganizersCount(data.data.length);
          }
        })
        .catch(err => console.error(err));
    }
  }, [status, checking, pathname]);

  if (status === "loading" || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-500 text-xs font-black uppercase tracking-widest">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "Overview", href: "/admin", icon: <LayoutDashboard className="h-4 w-4" /> },
    { label: "Database Search", href: "/admin/search", icon: <Search className="h-4 w-4 text-emerald-500" /> },
    { label: "Broadcasts", href: "/admin/broadcasts", icon: <Radio className="h-4 w-4 text-rose-500" /> },
    { label: "Pending Organizers", href: "/admin/organizers", icon: <Users className="h-4 w-4" />, badge: pendingOrganizersCount },
    { label: "Manage Events", href: "/admin/events", icon: <FileText className="h-4 w-4" />, badge: pendingEventsCount },
    { label: "Manage Cities", href: "/admin/cities", icon: <MapPin className="h-4 w-4" /> },
    { label: "Manage News", href: "/admin/news", icon: <Newspaper className="h-4 w-4" /> },
    { label: "Manage Admins", href: "/admin/admins", icon: <Shield className="h-4 w-4" /> },
    { label: "Command Control", href: "/admin/command-control", icon: <Sliders className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-background text-black flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-black/5 flex flex-col shrink-0 md:h-screen md:sticky md:top-0">
        <div className="p-4 md:p-8 border-b border-black/5 flex flex-row md:flex-col justify-between items-center md:items-start gap-4 shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="VibeCheck Logo" className="h-6 w-6 rounded-lg shrink-0 object-contain" />
            <div>
              <p className="text-[9px] text-primary font-black tracking-[0.2em] uppercase mb-0.5 leading-none">VIBECHECK</p>
              <h2 className="text-xs md:text-sm font-black italic tracking-tighter uppercase leading-none">Admin Panel</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 md:hidden">
            {/* Mobile Language Switcher */}
            <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-full border border-black/5">
              {(Object.values(ALL_LANGUAGES) as LanguageOption[]).map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => {
                    setLanguage(lang.code, true);
                    toast.success(`Switched language to ${lang.nativeName}`);
                  }}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                    language === lang.code
                      ? "bg-black text-white shadow-sm"
                      : "text-zinc-500 hover:text-black"
                  }`}
                  title={lang.name}
                >
                  {lang.flag} {lang.code.toUpperCase()}
                </button>
              ))}
            </div>
            <Link href="/dashboard">
              <div className="px-3 py-1.5 rounded-full border border-black/10 text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:bg-black/5 hover:text-black transition-all flex items-center gap-1.5">
                <ArrowLeft className="h-3 w-3" /> Exit
              </div>
            </Link>
          </div>
        </div>
        
        <nav className="flex-1 p-4 md:p-6 space-y-0 md:space-y-2 flex flex-row md:flex-col overflow-x-auto md:overflow-y-auto gap-2 md:gap-0 no-scrollbar">
          {navItems.map(item => (
            <Link key={item.href} href={item.href} className="w-auto md:w-full shrink-0">
              <div className={`px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-between transition-all cursor-pointer whitespace-nowrap gap-4 md:gap-0
                ${pathname === item.href
                  ? "bg-black text-white shadow-xl translate-x-1"
                  : "text-zinc-400 hover:bg-black/5 hover:text-black"
                }`}>
                <div className="flex items-center gap-3">
                  {item.icon}
                  {item.label}
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full shrink-0 transition-colors
                    ${pathname === item.href
                      ? "bg-primary text-black"
                      : "bg-red-500 text-white"
                    }`}>
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </nav>

        {/* SuperAdmin Manual Language Switcher Widget (Desktop) */}
        <div className="hidden md:block p-4 border-t border-black/5 bg-zinc-50/50 shrink-0">
          <div className="flex items-center justify-between mb-2 px-1">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-primary" />
              Language Switcher
            </span>
            <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-200/50 px-1.5 py-0.5 rounded">
              SuperAdmin
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-200/60 rounded-xl">
            {(Object.values(ALL_LANGUAGES) as LanguageOption[]).map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => {
                  setLanguage(lang.code, true);
                  toast.success(`SuperAdmin: Language switched to ${lang.nativeName} (${lang.name})`);
                }}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                  language === lang.code
                    ? "bg-black text-white shadow-sm"
                    : "text-zinc-600 hover:text-black hover:bg-white/50"
                }`}
                title={`Switch active platform language to ${lang.name}`}
              >
                <span>{lang.flag}</span>
                <span>{lang.code.toUpperCase()}</span>
              </button>
            ))}
          </div>
          {detectedCountryName && (
            <p className="text-[8px] text-zinc-400 font-medium tracking-wide mt-2 px-1 truncate">
              Detected Origin: <span className="text-zinc-600 font-bold">{detectedCountryName}</span>
            </p>
          )}
        </div>

        <div className="hidden md:block p-4 border-t border-black/5 shrink-0">
          <Link href="/dashboard">
            <div className="px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-black/5 hover:text-black transition-all cursor-pointer flex items-center gap-2">
              <ArrowLeft className="h-3 w-3" />
              Portal Home
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-y-auto bg-zinc-50/50">
        <div className="p-4 sm:p-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
           {children}
        </div>
      </main>
    </div>
  );
}
