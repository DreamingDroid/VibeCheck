"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import { useSession, signOut, signIn } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useCity } from "@/context/CityContext"
import { 
  ChevronDown, MapPin, Search, Music, Mic2, Tv,
  Trophy, Palette, BookOpen, Compass, Heart,
  Activity, Wine, Smile, Briefcase, Sparkles, Bell,
  SunMoon, Menu, X
} from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import {
  UserNotification,
  BroadcastType,
  BROADCAST_TYPE_CONFIGS
} from "@/types/broadcast"
import { useRouter } from "next/navigation"
import { registerFcmForUser, onForegroundFcmMessage, isFirebaseConfigured } from "@/lib/firebase"
import { toast } from "sonner"

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "Music": <Music className="h-3 w-3" />,
  "Live Music": <Mic2 className="h-3 w-3" />,
  "Podcasts": <Tv className="h-3 w-3" />,
  "Sports": <Trophy className="h-3 w-3" />,
  "Arts": <Palette className="h-3 w-3" />,
  "Education": <BookOpen className="h-3 w-3" />,
  "Spiritual": <Compass className="h-3 w-3" />,
  "Wellness": <Heart className="h-3 w-3" />,
  "Indie": <Activity className="h-3 w-3" />,
  "Techno": <Music className="h-3 w-3" />,
  "Food": <Wine className="h-3 w-3" />,
  "Comedy": <Smile className="h-3 w-3" />,
  "Workshops": <Briefcase className="h-3 w-3" />,
  "Nightlife": <Wine className="h-3 w-3" />,
  "Night Life": <Wine className="h-3 w-3" />,
  "General": <Sparkles className="h-3 w-3" />,
};

// Category-specific active colors for vibrant theme
const VIBRANT_PILL_COLORS: Record<string, string> = {
  "Music": "bg-amber-400 text-black",
  "Live Music": "bg-amber-400 text-black",
  "Arts": "bg-purple-400 text-white",
  "Sports": "bg-orange-400 text-black",
  "Education": "bg-blue-400 text-white",
  "Spiritual": "bg-violet-400 text-white",
  "Wellness": "bg-teal-400 text-black",
  "Indie": "bg-pink-400 text-white",
  "Techno": "bg-cyan-400 text-black",
  "Food": "bg-emerald-400 text-black",
  "Comedy": "bg-yellow-400 text-black",
  "Workshops": "bg-indigo-400 text-white",
  "Nightlife": "bg-indigo-500 text-white",
  "Night Life": "bg-indigo-500 text-white",
  "General": "bg-zinc-400 text-white",
}

export function GlobalHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = useSession()
  const { theme, toggleTheme, isVibrant } = useTheme()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { 
    currentCity, setCity, supportedCities, isLoading,
    selectedCategory, setSelectedCategory, activeCategories, events
  } = useCity()
  const [showCityMenu, setShowCityMenu] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [isEditor, setIsEditor] = useState(false)
  const [organizerStatus, setOrganizerStatus] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)

  // In-App Notification Center States
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)
  const [notificationFilter, setNotificationFilter] = useState<"all" | "unread" | "alerts">("all")
  const [loadingNotifications, setLoadingNotifications] = useState<boolean>(false)

  const notificationsRef = useRef<HTMLDivElement>(null)
  const cityMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (cityMenuRef.current && !cityMenuRef.current.contains(event.target as Node)) {
        setShowCityMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden"
      document.documentElement.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
    }
    return () => {
      document.body.style.overflow = ""
      document.documentElement.style.overflow = ""
    }
  }, [isMobileMenuOpen])

  const fetchUnreadCount = () => {
    if (!session?.user?.email) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/notifications/unread-count?email=${encodeURIComponent(session.user.email)}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setUnreadCount(data.count || 0);
        }
      })
      .catch(() => {});
  };

  const fetchNotificationsList = (filter = notificationFilter) => {
    if (!session?.user?.email) return;
    setLoadingNotifications(true);
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/notifications?email=${encodeURIComponent(session.user.email)}&filter=${filter}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.data) {
          setNotifications(data.data.notifications || []);
          setUnreadCount(data.data.unreadCount || 0);
        }
      })
      .catch(err => console.error("Failed to load notifications:", err))
      .finally(() => setLoadingNotifications(false));
  };

  useEffect(() => {
    if (session?.user?.email) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/admin/check?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(data => {
          setIsAdmin(data.isAdmin)
          setIsOrganizer(data.isOrganizer)
          setIsEditor(data.isEditor || false)
          setOrganizerStatus(data.status || null)
          setRejectionReason(data.rejectionReason || null)
        })
        .catch(() => {
          setIsAdmin(false)
          setIsOrganizer(false)
          setIsEditor(false)
          setOrganizerStatus(null)
          setRejectionReason(null)
        });

      fetchUnreadCount();

      // If Firebase is configured, disable background interval polling completely to conserve battery!
      if (!isFirebaseConfigured()) {
        const interval = setInterval(fetchUnreadCount, 30000);
        return () => clearInterval(interval);
      }
    }
  }, [session]);

  // Firebase Cloud Messaging Real-Time Registration & Foreground Listener
  useEffect(() => {
    const userEmail = session?.user?.email;
    if (userEmail) {
      // 1. Register Service Worker and FCM Token
      if (typeof window !== "undefined" && "serviceWorker" in navigator) {
        navigator.serviceWorker
          .register("/firebase-messaging-sw.js")
          .then(() => {
            return registerFcmForUser({
              email: userEmail,
              city: currentCity,
              categories: activeCategories,
            });
          })
          .catch((err) => console.log("[FCM Registration Log]:", err));
      }

      // 2. Subscribe to instant real-time foreground broadcasts
      const unsubscribeFcm = onForegroundFcmMessage((payload) => {
        const title = payload.notification?.title || payload.data?.title || "New Broadcast Alert";
        const body = payload.notification?.body || payload.data?.message || "";
        const type = (payload.data?.type as BroadcastType) || "general_update";
        const link = payload.data?.link;
        const typeConfig = BROADCAST_TYPE_CONFIGS[type] || BROADCAST_TYPE_CONFIGS.general_update;

        // Increment unread count badge
        setUnreadCount((c) => c + 1);

        // Render instant toast alert
        toast(
          `${typeConfig.icon} ${title}: ${body}`,
          {
            duration: type === "emergency_alert" ? 10000 : 6000,
            action: link
              ? {
                  label: "View",
                  onClick: () => router.push(link),
                }
              : undefined,
          }
        );

        // Refresh active list if notification center is open
        fetchNotificationsList();
      });

      return () => {
        unsubscribeFcm();
      };
    }
  }, [session, currentCity]);

  useEffect(() => {
    if (showNotifications && session?.user?.email) {
      fetchNotificationsList(notificationFilter);
    }
  }, [showNotifications, notificationFilter, session]);

  const handleMarkNotificationRead = async (notif: UserNotification) => {
    if (!session?.user?.email) return;
    if (!notif.is_read) {
      // Optimistic update
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/notifications/mark-read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: notif.id, email: session.user.email })
      }).catch(err => console.error("Error marking notification read:", err));
    }

    if (notif.link) {
      setShowNotifications(false);
      router.push(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    if (!session?.user?.email || unreadCount === 0) return;
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/notifications/mark-all-read`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: session.user.email })
    }).catch(err => console.error("Error marking all notifications read:", err));
  };

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut({ callbackUrl: "/" })
  }

  const categories = [
    { name: "The Latest", icon: <Sparkles className="h-3 w-3" /> },
    ...activeCategories.map(cat => ({
      name: cat,
      icon: CATEGORY_ICONS[cat] || null
    }))
  ];

  return (
    <div className="sticky top-0 z-[110]">
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-black/5 text-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between py-3">
          {/* Logo & City */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-1.5 sm:gap-2">
              <img src="/logo.png" alt="VibeCheck Logo" className="h-5 w-5 sm:h-6 sm:w-6 rounded-lg shrink-0 object-contain" />
              <span className="text-lg sm:text-xl vibecheck_font_style">VIBECHECK</span>
            </Link>

            <div className="h-4 w-[1px] bg-black/10 mx-1 sm:mx-2" />

            <div className="relative" ref={cityMenuRef}>
              <button 
                onClick={() => setShowCityMenu(!showCityMenu)}
                disabled={isLoading}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 hover:bg-black/5 rounded-full transition-all text-[10px] sm:text-[11px] font-bold tracking-tight text-zinc-600 hover:text-black disabled:opacity-50 uppercase"
              >
                <MapPin className="h-3 w-3 text-primary" />
                {isLoading ? "..." : currentCity}
                <ChevronDown className={`h-3 w-3 transition-transform ${showCityMenu ? 'rotate-180' : ''}`} />
              </button>

              {showCityMenu && (
                <>
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-black/5 rounded-[20px] shadow-2xl z-20 overflow-hidden p-2 animate-in fade-in zoom-in-95 duration-200">
                    <div className="grid gap-1">
                      {supportedCities.map((cityObj) => (
                        <button
                          key={cityObj.id}
                          onClick={() => {
                            setCity(cityObj.name);
                            setShowCityMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                            cityObj.name === currentCity 
                              ? 'bg-primary/10 text-primary' 
                              : 'text-zinc-500 hover:bg-black/5 hover:text-black'
                          }`}
                        >
                          {cityObj.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-sm mx-2 lg:mx-4">
            <div className="relative w-full group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-400 group-focus-within:text-primary transition-colors" />
              </div>
              <input 
                type="text"
                placeholder="Discover your next vibe"
                className="block w-full pl-11 pr-4 py-2 bg-zinc-100/50 border-none rounded-full text-xs font-medium focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-zinc-500"
              />
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {/* Local Currents always visible on Desktop */}
            <div className="hidden lg:flex items-center gap-2 mr-1">
              <Link href="/local-currents">
                <button className="ringer-button border border-black/5 bg-zinc-50 hover:bg-black hover:text-white text-[10px] py-2 px-4">
                  LOCAL CURRENTS
                </button>
              </Link>
            </div>

            {session ? (
              <>


                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  {/* Notification Center Bell */}
                  <div className="relative mr-1" ref={notificationsRef}>
                    <button 
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="relative p-2 hover:bg-black/5 rounded-full transition-all text-zinc-600 hover:text-black flex items-center justify-center shrink-0"
                      title="Notifications"
                    >
                      <Bell className="h-4.5 w-4.5" />
                      {unreadCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center ring-2 ring-white animate-pulse">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                      )}
                    </button>

                    {showNotifications && (
                      <>
                        <div className="absolute right-0 top-full mt-2 w-84 sm:w-96 bg-white border border-black/10 rounded-[28px] shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-200 text-black max-h-[80vh] flex flex-col">
                          {/* Header */}
                          <div className="flex items-center justify-between border-b border-black/5 pb-3 mb-3">
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-900">Notifications</h4>
                              {unreadCount > 0 && (
                                <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-rose-500/10 text-rose-600 border border-rose-200">
                                  {unreadCount} new
                                </span>
                              )}
                            </div>
                            {unreadCount > 0 && (
                              <button
                                onClick={handleMarkAllRead}
                                className="text-[10px] font-bold text-zinc-400 hover:text-black uppercase tracking-wider transition-colors"
                              >
                                Mark all as read
                              </button>
                            )}
                          </div>

                          {/* Filter Tabs */}
                          <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl mb-3 text-[10px] font-bold">
                            {(["all", "unread", "alerts"] as const).map((tab) => (
                              <button
                                key={tab}
                                onClick={() => setNotificationFilter(tab)}
                                className={`flex-1 py-1 rounded-lg uppercase tracking-wider transition-all ${
                                  notificationFilter === tab
                                    ? "bg-white text-black shadow-xs font-black"
                                    : "text-zinc-500 hover:text-black"
                                }`}
                              >
                                {tab}
                              </button>
                            ))}
                          </div>

                          {/* Notification List Container */}
                          <div className="overflow-y-auto space-y-2.5 flex-1 pr-1 custom-scrollbar max-h-[50vh]">
                            {/* Organizer Application Status Notice (if pending/rejected) */}
                            {isOrganizer && (organizerStatus === 'pending_approval' || organizerStatus === 'rejected') && (
                              <div className="mb-2">
                                {organizerStatus === 'pending_approval' ? (
                                  <div className="flex flex-col gap-1 bg-amber-50/70 p-3 rounded-2xl border border-amber-200 text-left">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-600">Application Pending</span>
                                    <p className="text-xs font-bold text-zinc-700 leading-tight">Your organizer application is currently under review by our team.</p>
                                  </div>
                                ) : (
                                  <div className="flex flex-col gap-1.5 bg-red-50/70 p-3 rounded-2xl border border-red-200 text-left">
                                    <span className="text-[9px] font-black uppercase tracking-widest text-red-600">Application Rejected</span>
                                    <p className="text-xs font-bold text-zinc-700 leading-tight">Unfortunately, your organizer application was rejected.</p>
                                    {rejectionReason && (
                                      <div className="bg-white/80 p-2 rounded-xl border border-red-100/50 mt-0.5">
                                        <p className="text-[11px] font-bold text-zinc-800 italic">"{rejectionReason}"</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            {loadingNotifications ? (
                              <div className="space-y-2 py-4">
                                {[1, 2, 3].map((i) => (
                                  <div key={i} className="h-16 bg-zinc-100 rounded-2xl animate-pulse" />
                                ))}
                              </div>
                            ) : notifications.length === 0 ? (
                              <div className="py-12 text-center text-zinc-400">
                                <Sparkles className="h-8 w-8 mx-auto mb-2 text-zinc-300" />
                                <p className="text-xs font-black uppercase tracking-wider text-zinc-600">All Caught Up!</p>
                                <p className="text-[10px] font-medium text-zinc-400 mt-0.5">No notifications matching this filter.</p>
                              </div>
                            ) : (
                              notifications.map((notif) => {
                                const typeCfg = BROADCAST_TYPE_CONFIGS[notif.type] || BROADCAST_TYPE_CONFIGS.general_update;
                                const timeStr = new Date(notif.created_at).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                });

                                return (
                                  <div
                                    key={notif.id}
                                    onClick={() => handleMarkNotificationRead(notif)}
                                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex items-start gap-3 ${
                                      notif.is_read
                                        ? "bg-zinc-50/50 border-black/5 hover:bg-zinc-100/60 opacity-80"
                                        : `${typeCfg.cardBg} border-black/10 hover:border-black/20 shadow-xs`
                                    } ${
                                      notif.type === "emergency_alert" && !notif.is_read
                                        ? "border-red-300 ring-1 ring-red-400/30"
                                        : ""
                                    }`}
                                  >
                                    <span className="text-xl shrink-0 p-1 bg-white rounded-xl shadow-xs border border-black/5">
                                      {typeCfg.icon}
                                    </span>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-1 mb-0.5">
                                        <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${typeCfg.badgeBg}`}>
                                          {typeCfg.label}
                                        </span>
                                        <span className="text-[9px] font-medium text-zinc-400 shrink-0">
                                          {timeStr}
                                        </span>
                                      </div>
                                      <h5 className={`text-xs leading-snug truncate ${notif.is_read ? 'font-bold text-zinc-700' : 'font-black text-black'}`}>
                                        {notif.title}
                                      </h5>
                                      <p className="text-[11px] text-zinc-500 font-medium leading-tight line-clamp-2 mt-0.5">
                                        {notif.message}
                                      </p>
                                    </div>
                                    {!notif.is_read && (
                                      <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 mt-1" />
                                    )}
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                </div>
              </>
            ) : (
              pathname !== "/" && (
                <button 
                  onClick={() => signIn("google")}
                  className="hidden md:flex ringer-button bg-primary text-white text-[11px] h-10 px-8 items-center shadow-lg hover:scale-105 active:scale-95 transition-all"
                >
                  JOIN THE VIBE
                </button>
              )
            )}

            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 hover:bg-black/5 rounded-full transition-all text-zinc-600 hover:text-black shrink-0"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        {pathname === "/dashboard" && events.length > 0 && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center border-t border-black/5 overflow-x-auto no-scrollbar gap-2 py-1">
             {categories.map((cat, i) => {
               const isActive = selectedCategory === cat.name;
               const vibrantActiveClass = isVibrant && isActive
                 ? (VIBRANT_PILL_COLORS[cat.name] || 'bg-black text-white') + ' border-transparent'
                 : '';
               return (
                 <button 
                   key={i}
                   onClick={() => setSelectedCategory(cat.name)}
                   className={`sticker-badge flex items-center gap-1.5 whitespace-nowrap h-8 px-4 transition-all ${
                     isActive 
                       ? (isVibrant ? vibrantActiveClass : 'bg-black text-white border-transparent')
                       : 'bg-white hover:bg-zinc-100 text-zinc-600 hover:text-black border-black/10'
                   }`}
                 >
                   {cat.icon}
                   {cat.name}
                 </button>
               );
             })}
          </div>
        )}
      </header>

      {/* Mobile Menu Drawer */}
      {isMobileMenuOpen && (
        <>
          <div className={`fixed inset-0 ${pathname === "/dashboard" && events.length > 0 ? "top-[121px]" : "top-[73px]"} z-40 bg-black/40 backdrop-blur-sm`} onClick={() => setIsMobileMenuOpen(false)} />
          <div className={`fixed ${pathname === "/dashboard" && events.length > 0 ? "top-[121px]" : "top-[73px]"} left-0 right-0 z-50 bg-white border-b border-black/5 shadow-2xl p-6 flex flex-col gap-6 animate-in slide-in-from-top duration-300 overflow-y-auto ${pathname === "/dashboard" && events.length > 0 ? "max-h-[calc(100vh-121px)]" : "max-h-[calc(100vh-73px)]"} no-scrollbar`}>
            {/* Search Bar in Mobile Menu */}
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-400" />
              </div>
              <input 
                type="text"
                placeholder="Discover your next vibe"
                className="block w-full pl-11 pr-4 py-3 bg-zinc-100/50 border-none rounded-full text-xs font-bold focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all placeholder:text-zinc-500 text-black"
              />
            </div>

            {/* Navigation links */}
            <nav className="flex flex-col gap-3">
              {/* Local Currents always visible on Mobile */}
              <Link href="/local-currents" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="w-full text-left px-5 py-4 rounded-2xl bg-zinc-50 hover:bg-black hover:text-white transition-all text-xs font-black uppercase tracking-widest">
                  LOCAL CURRENTS
                </div>
              </Link>

              {session ? (
                <>
                  <Link href="/preferences" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="w-full text-left px-5 py-4 rounded-2xl bg-zinc-50 hover:bg-black hover:text-white transition-all text-xs font-black uppercase tracking-widest">
                      PREFERENCES
                    </div>
                  </Link>

                  {isOrganizer && organizerStatus === 'approved' ? (
                    <Link href="/organizer" onClick={() => setIsMobileMenuOpen(false)}>
                      <div className="w-full text-left px-5 py-4 rounded-2xl bg-primary/10 text-primary hover:bg-primary hover:text-black transition-all text-xs font-black uppercase tracking-widest">
                        ORGANIZER HUB
                      </div>
                    </Link>
                  ) : (
                    !(organizerStatus === 'pending_approval' || organizerStatus === 'rejected') && (
                      <Link href="/organizer/apply" onClick={() => setIsMobileMenuOpen(false)}>
                        <div className="w-full text-left px-5 py-4 rounded-2xl bg-zinc-50 hover:bg-black hover:text-white transition-all text-xs font-black uppercase tracking-widest">
                          BECOME AN ORGANIZER
                        </div>
                      </Link>
                    )
                  )}

                  {isAdmin && (
                    <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                      <div className="w-full text-left px-5 py-4 rounded-2xl bg-black text-white hover:bg-zinc-800 transition-all text-xs font-black uppercase tracking-widest">
                        ADMIN PANEL
                      </div>
                    </Link>
                  )}

                  <div className="w-full h-[1px] bg-black/5 my-2"></div>

                  <div className="flex items-center justify-between bg-zinc-100 p-4 rounded-2xl mt-2">
                    <div className="flex flex-col min-w-0 pr-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Signed in as</p>
                      <p className="text-xs font-bold text-black mt-0.5 truncate">{session.user?.name}</p>
                    </div>
                    
                    <button
                      onClick={() => { handleSignOut(); setIsMobileMenuOpen(false); }}
                      disabled={isSigningOut}
                      className="shrink-0 px-4 py-2.5 rounded-xl bg-black text-white hover:bg-zinc-800 transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                      {isSigningOut ? "..." : "DISCONNECT"}
                    </button>
                  </div>
                </>
              ) : (
                <button
                  onClick={() => { signIn("google"); setIsMobileMenuOpen(false); }}
                  className="w-full text-center py-4 rounded-2xl bg-primary text-black font-black uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-md"
                >
                  JOIN THE VIBE
                </button>
              )}
            </nav>
          </div>
        </>
      )}
    </div>
  )
}
