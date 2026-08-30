"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, FileText, MapPin, ArrowLeft, Users, Shield, Newspaper, Sliders } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
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
    { label: "Broadcasts", href: "/admin/notifications", icon: <Bell className="h-4 w-4" /> },
    { label: "Pending Organizers", href: "/admin/organizers", icon: <Users className="h-4 w-4" />, badge: pendingOrganizersCount },
    { label: "Manage Events", href: "/admin/events", icon: <FileText className="h-4 w-4" />, badge: pendingEventsCount },
    { label: "Manage Cities", href: "/admin/cities", icon: <MapPin className="h-4 w-4" /> },
    { label: "Manage News", href: "/admin/news", icon: <Newspaper className="h-4 w-4" /> },
    { label: "Manage Admins", href: "/admin/admins", icon: <Shield className="h-4 w-4" /> },
    { label: "Command Control", href: "/admin/command-control", icon: <Sliders className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background text-black flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-black/5 flex flex-col shrink-0">
        <div className="p-4 md:p-8 border-b border-black/5 flex flex-row md:flex-col justify-between items-center md:items-start">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="VibeCheck Logo" className="h-6 w-6 rounded-lg shrink-0 object-contain" />
            <div>
              <p className="text-[9px] text-primary font-black tracking-[0.2em] uppercase mb-0.5 leading-none">VIBECHECK</p>
              <h2 className="text-xs md:text-sm font-black italic tracking-tighter uppercase leading-none">Admin Panel</h2>
            </div>
          </div>
          <Link href="/dashboard" className="md:hidden">
            <div className="px-3 py-1.5 rounded-full border border-black/10 text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:bg-black/5 hover:text-black transition-all flex items-center gap-1.5">
              <ArrowLeft className="h-3 w-3" /> Exit
            </div>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 md:p-6 space-y-0 md:space-y-2 flex flex-row md:flex-col overflow-x-auto md:overflow-visible gap-2 md:gap-0 no-scrollbar">
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

        <div className="hidden md:block p-6 border-t border-black/5">
          <Link href="/dashboard">
            <div className="px-4 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:bg-black/5 hover:text-black transition-all cursor-pointer flex items-center gap-2">
              <ArrowLeft className="h-3 w-3" />
              Portal Home
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-zinc-50/50">
        <div className="p-4 sm:p-12 animate-in fade-in slide-in-from-bottom-2 duration-700">
           {children}
        </div>
      </main>
    </div>
  );
}
