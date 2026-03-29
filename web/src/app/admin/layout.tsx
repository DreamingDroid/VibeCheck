"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/"); return; }
    if (status === "authenticated" && session?.user?.email) {
      fetch(`http://localhost:4000/api/admin/check?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(data => {
          if (!data.isAdmin) router.push("/dashboard");
          else setChecking(false);
        })
        .catch(() => router.push("/dashboard"));
    }
  }, [status, session, router]);

  if (status === "loading" || checking) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-zinc-400 text-sm">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  const navItems = [
    { label: "📊 Overview", href: "/admin" },
    { label: "📝 Manage Events", href: "/admin/events" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex">
      {/* Sidebar */}
      <aside className="w-60 bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0">
        <div className="p-6 border-b border-zinc-800">
          <p className="text-xs text-indigo-400 font-semibold tracking-widest uppercase mb-1">Vizag Vibes</p>
          <h2 className="text-lg font-bold text-white">Admin Panel</h2>
          <p className="text-xs text-zinc-500 mt-1 truncate">{session?.user?.email}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => (
            <Link key={item.href} href={item.href}>
              <div className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer
                ${pathname === item.href
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
                }`}>
                {item.label}
              </div>
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-zinc-800">
          <Link href="/dashboard">
            <div className="px-4 py-2.5 rounded-lg text-sm font-medium text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300 transition-colors cursor-pointer">
              ← Back to Portal
            </div>
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
