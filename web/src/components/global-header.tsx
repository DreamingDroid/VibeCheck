"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession, signOut, signIn } from "next-auth/react"
import { usePathname } from "next/navigation"
import { useCity } from "@/context/CityContext"
import { 
  ChevronDown, MapPin, Search, Music, Mic2, Tv,
  Trophy, Palette, BookOpen, Compass, Heart,
  Activity, Wine, Smile, Briefcase, Sparkles, Bell,
  SunMoon, Menu, X, CheckCircle2, AlertCircle, Clock, ExternalLink
} from "lucide-react"
import { useTheme } from "@/context/ThemeContext"

interface AppNotification {
  id: string;
  type: 'pending' | 'rejected' | 'approved' | 'system' | 'global' | 'city' | 'event';
  badge: string;
  title: string;
  preview: string;
  fullContent: string;
  reason?: string | null;
  actionText?: string;
  actionHref?: string;
  time: string;
}

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
  const { data: session } = useSession()
  const { theme, toggleTheme, isVibrant } = useTheme()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const { 
    currentCity, setCity, supportedCities, isLoading,
    selectedCategory, setSelectedCategory, activeCategories
  } = useCity()
  const [showCityMenu, setShowCityMenu] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [isEditor, setIsEditor] = useState(false)
  const [organizerStatus, setOrganizerStatus] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null)
  const [adminBroadcasts, setAdminBroadcasts] = useState<any[]>([])

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
        })
    }
  }, [session])

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const cityParam = currentCity ? `?city=${encodeURIComponent(currentCity)}` : '';
    fetch(`${baseUrl}/api/notifications${cityParam}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          setAdminBroadcasts(res.data);
        }
      })
      .catch(err => console.error("Failed to load notifications:", err));
  }, [currentCity]);

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut({ callbackUrl: "/" })
  }

  // Build notifications list
  const notifications: AppNotification[] = [];

  // 1. Organizer status notices
  if (isOrganizer && organizerStatus === 'pending_approval') {
    notifications.push({
      id: 'org-pending',
      type: 'pending',
      badge: 'Under Review',
      title: 'Organizer Application Pending',
      preview: 'Your application is currently under review by our curation team.',
      fullContent: 'Thank you for applying to become an organizer on VibeCheck Space! Our editorial team is reviewing your brand information and event credentials. You will be notified as soon as verification is complete.',
      actionText: 'Understood',
      time: 'Pending'
    });
  } else if (isOrganizer && organizerStatus === 'rejected') {
    notifications.push({
      id: 'org-rejected',
      type: 'rejected',
      badge: 'Action Required',
      title: 'Organizer Application Rejected',
      preview: 'Your application requires revisions. Tap to see feedback.',
      fullContent: 'Unfortunately, your organizer application could not be approved based on our submission guidelines. Please review the team feedback below and submit an updated application.',
      reason: rejectionReason || 'Information provided did not meet organizer verification criteria.',
      actionText: 'Re-Apply as Organizer',
      actionHref: '/organizer/apply',
      time: 'Action Needed'
    });
  } else if (isOrganizer && organizerStatus === 'approved') {
    notifications.push({
      id: 'org-approved',
      type: 'approved',
      badge: 'Verified Organizer',
      title: 'Organizer Status Active',
      preview: 'Your organizer badge is active. You can now host events.',
      fullContent: 'Congratulations! You are officially verified as a VibeCheck Organizer. You have full access to create events, manage RSVPs, broadcast WhatsApp updates, and connect with followers.',
      actionText: 'Open Organizer Hub',
      actionHref: '/organizer',
      time: 'Verified'
    });
  }

  // 2. Admin Broadcast Notifications (Global, City, Event)
  adminBroadcasts.forEach((b) => {
    const bType = (b.type || 'global') as 'global' | 'city' | 'event';
    const badgeLabel = bType === 'city'
      ? `City Alert · ${b.target_city || currentCity}`
      : bType === 'event'
        ? `Event Spotlight`
        : 'Global Broadcast';

    notifications.push({
      id: b.id,
      type: bType,
      badge: badgeLabel,
      title: b.title,
      preview: b.message,
      fullContent: b.message,
      actionText: b.action_text || (bType === 'event' ? 'View Event' : 'Explore Vibes'),
      actionHref: b.action_href || (b.target_event_id ? `/event/${b.target_event_id}` : '/dashboard?view=calendar'),
      time: new Date(b.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    });
  });

  // 3. Fallback System welcome notification if empty
  if (notifications.length === 0) {
    notifications.push({
      id: 'system-welcome',
      type: 'system',
      badge: 'VibeCheck Space',
      title: 'Welcome to VibeCheck Space',
      preview: 'Personalize your vibes and discover what is happening next.',
      fullContent: 'Discover the most curated cultural and networking events in your city. Link your WhatsApp number to get instant 7-day event alerts whenever you ping "VibeCheck", or view the interactive VibeCalendar anytime.',
      actionText: 'View VibeCalendar',
      actionHref: '/dashboard?view=calendar',
      time: 'Broadcast'
    });
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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between py-3">
          {/* Logo & City */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-1.5 sm:gap-2">
              <img src="/logo.png" alt="VibeCheck Logo" className="h-5 w-5 sm:h-6 sm:w-6 rounded-lg shrink-0 object-contain" />
              <span className="text-lg sm:text-xl vibecheck_font_style">VIBECHECK</span>
            </Link>

            <div className="h-4 w-[1px] bg-black/10 mx-1 sm:mx-2" />

            <div className="relative">
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
                  <div className="fixed inset-0 z-10" onClick={() => setShowCityMenu(false)} />
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
                <div className="hidden lg:flex items-center gap-2 mr-2">
                  <Link href="/preferences">
                    <button className="ringer-button border border-black/5 bg-zinc-50 hover:bg-black hover:text-white text-[10px] py-2 px-4">
                      PREFERENCES
                    </button>
                  </Link>
                  {isOrganizer && organizerStatus === 'approved' ? (
                    <Link href="/organizer">
                      <button className="ringer-button bg-primary text-black hover:bg-black hover:text-white text-[10px] py-2 px-4 border-none transition-colors">
                        ORGANIZER HUB
                      </button>
                    </Link>
                  ) : (
                    !(organizerStatus === 'pending_approval' || organizerStatus === 'rejected') && (
                      <Link href="/organizer/apply">
                        <button className="ringer-button border border-black/5 bg-zinc-50 hover:bg-black hover:text-white text-[10px] py-2 px-4">
                          BECOME AN ORGANIZER
                        </button>
                      </Link>
                    )
                  )}
                  {isAdmin && (
                    <Link href="/admin">
                      <button className="ringer-button bg-black text-white hover:bg-zinc-800 text-[10px] py-2 px-4 border-none transition-colors">
                        ADMIN
                      </button>
                    </Link>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                  {/* Notifications Bell */}
                  <div className="relative mr-1">
                    <button 
                      onClick={() => setShowNotifications(!showNotifications)}
                      className="relative p-2 hover:bg-black/5 rounded-full transition-all text-zinc-600 hover:text-black flex items-center justify-center shrink-0"
                      title="Notifications"
                    >
                      <Bell className="h-4.5 w-4.5" />
                      {(organizerStatus === 'pending_approval' || organizerStatus === 'rejected') && (
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                      )}
                    </button>

                    {showNotifications && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-black/5 rounded-[24px] shadow-2xl z-20 p-5 animate-in fade-in zoom-in-95 duration-200">
                          <div className="flex items-center justify-between border-b border-black/5 pb-2.5 mb-3 text-left">
                            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400">Notifications</h4>
                            <span className="text-[10px] font-bold text-zinc-400">{notifications.length} alerts</span>
                          </div>
                          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                            {notifications.map((notif) => {
                              const isAmber = notif.type === 'pending';
                              const isRed = notif.type === 'rejected';
                              const isGreen = notif.type === 'approved';

                              return (
                                <div
                                  key={notif.id}
                                  onClick={() => {
                                    setSelectedNotification(notif);
                                    setShowNotifications(false);
                                  }}
                                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-left group hover:scale-[1.01] ${
                                    isAmber 
                                      ? 'bg-amber-50/50 hover:bg-amber-50 border-amber-200/60'
                                      : isRed
                                        ? 'bg-red-50/50 hover:bg-red-50 border-red-200/60'
                                        : isGreen
                                          ? 'bg-emerald-50/50 hover:bg-emerald-50 border-emerald-200/60'
                                          : 'bg-zinc-50/80 hover:bg-zinc-100 border-black/5'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
                                      isAmber ? 'bg-amber-500 text-black' : isRed ? 'bg-red-600 text-white' : isGreen ? 'bg-emerald-600 text-white' : 'bg-primary text-black'
                                    }`}>
                                      {notif.badge}
                                    </span>
                                    <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
                                      {notif.time}
                                    </span>
                                  </div>
                                  <h5 className="text-xs font-black text-black group-hover:underline line-clamp-1">
                                    {notif.title}
                                  </h5>
                                  <p className="text-[11px] font-medium text-zinc-600 line-clamp-2 mt-0.5 leading-snug">
                                    {notif.preview}
                                  </p>
                                  <div className="text-[9px] font-black uppercase tracking-widest text-primary mt-1.5 flex items-center gap-1">
                                    <span>Tap to view full details</span>
                                    <span>→</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="hidden sm:flex flex-col items-end mr-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none mb-1">Authenticated</span>
                    <span className="text-xs font-bold text-black leading-none truncate max-w-[80px] lg:max-w-[120px]">{session.user?.name}</span>
                  </div>
                  <button 
                    onClick={handleSignOut} 
                    disabled={isSigningOut}
                    className="ringer-button bg-black text-white text-[10px] sm:text-[11px] hover:bg-zinc-800 h-9 sm:h-10 px-3 sm:px-4 shrink-0"
                  >
                    {isSigningOut ? "..." : "DISCONNECT"}
                  </button>
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

            {/* Hamburger Button for Mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 hover:bg-black/5 rounded-full transition-all text-zinc-600 hover:text-black shrink-0"
              aria-label="Toggle Menu"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Category Pills Bar */}
        {pathname === "/dashboard" && (
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
          <div className={`fixed inset-0 ${pathname === "/dashboard" ? "top-[125px]" : "top-[77px]"} z-40 bg-black/40 backdrop-blur-sm lg:hidden`} onClick={() => setIsMobileMenuOpen(false)} />
          <div className={`fixed ${pathname === "/dashboard" ? "top-[125px]" : "top-[77px]"} left-0 right-0 z-50 bg-white border-b border-black/5 shadow-2xl p-6 flex flex-col gap-6 animate-in slide-in-from-top duration-300 lg:hidden overflow-y-auto ${pathname === "/dashboard" ? "max-h-[calc(100vh-125px)]" : "max-h-[calc(100vh-77px)]"} no-scrollbar`}>
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

      {/* Themed Notification Pop-up Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div 
            className="fixed inset-0" 
            onClick={() => setSelectedNotification(null)} 
          />
          <div 
            className={`relative z-10 w-full max-w-lg bg-white rounded-[32px] overflow-hidden shadow-2xl border-4 transition-all animate-in zoom-in-95 duration-200 ${
              selectedNotification.type === 'pending'
                ? 'border-amber-400'
                : selectedNotification.type === 'rejected'
                  ? 'border-red-500'
                  : selectedNotification.type === 'approved'
                    ? 'border-emerald-500'
                    : selectedNotification.type === 'global'
                      ? 'border-indigo-500'
                      : selectedNotification.type === 'city'
                        ? 'border-amber-500'
                        : selectedNotification.type === 'event'
                          ? 'border-pink-500'
                          : 'border-primary'
            }`}
          >
            {/* Modal Themed Header */}
            <div 
              className={`p-6 sm:p-8 flex items-start justify-between border-b ${
                selectedNotification.type === 'pending'
                  ? 'bg-gradient-to-br from-amber-500/20 via-amber-50 to-white border-amber-200 text-amber-950'
                  : selectedNotification.type === 'rejected'
                    ? 'bg-gradient-to-br from-red-500/20 via-red-50 to-white border-red-200 text-red-950'
                    : selectedNotification.type === 'approved'
                      ? 'bg-gradient-to-br from-emerald-500/20 via-emerald-50 to-white border-emerald-200 text-emerald-950'
                      : selectedNotification.type === 'global'
                        ? 'bg-gradient-to-br from-indigo-500/20 via-purple-50 to-white border-indigo-200 text-indigo-950'
                        : selectedNotification.type === 'city'
                          ? 'bg-gradient-to-br from-amber-500/20 via-orange-50 to-white border-amber-200 text-amber-950'
                          : selectedNotification.type === 'event'
                            ? 'bg-gradient-to-br from-pink-500/20 via-rose-50 to-white border-pink-200 text-pink-950'
                            : 'bg-gradient-to-br from-primary/20 via-zinc-50 to-white border-primary/20 text-black'
              }`}
            >
              <div className="flex items-center gap-3">
                <div 
                  className={`h-12 w-12 rounded-2xl flex items-center justify-center shadow-md ${
                    selectedNotification.type === 'pending'
                      ? 'bg-amber-500 text-white shadow-amber-500/20'
                      : selectedNotification.type === 'rejected'
                        ? 'bg-red-600 text-white shadow-red-500/20'
                        : selectedNotification.type === 'approved'
                          ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                          : selectedNotification.type === 'global'
                            ? 'bg-indigo-600 text-white shadow-indigo-500/20'
                            : selectedNotification.type === 'city'
                              ? 'bg-amber-500 text-black shadow-amber-500/20'
                              : selectedNotification.type === 'event'
                                ? 'bg-pink-600 text-white shadow-pink-500/20'
                                : 'bg-black text-white shadow-black/20'
                  }`}
                >
                  {selectedNotification.type === 'pending' && <Clock className="h-6 w-6" />}
                  {selectedNotification.type === 'rejected' && <AlertCircle className="h-6 w-6" />}
                  {selectedNotification.type === 'approved' && <CheckCircle2 className="h-6 w-6" />}
                  {selectedNotification.type === 'global' && <Sparkles className="h-6 w-6" />}
                  {selectedNotification.type === 'city' && <MapPin className="h-6 w-6" />}
                  {selectedNotification.type === 'event' && <Calendar className="h-6 w-6" />}
                  {selectedNotification.type === 'system' && <Sparkles className="h-6 w-6 text-primary" />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span 
                      className={`sticker-badge text-[9px] font-black uppercase py-0.5 px-2 border-none ${
                        selectedNotification.type === 'pending'
                          ? 'bg-amber-500 text-black'
                          : selectedNotification.type === 'rejected'
                            ? 'bg-red-600 text-white'
                            : selectedNotification.type === 'approved'
                              ? 'bg-emerald-600 text-white'
                              : selectedNotification.type === 'global'
                                ? 'bg-indigo-600 text-white'
                                : selectedNotification.type === 'city'
                                  ? 'bg-amber-500 text-black'
                                  : selectedNotification.type === 'event'
                                    ? 'bg-pink-600 text-white'
                                    : 'bg-primary text-black'
                      }`}
                    >
                      {selectedNotification.badge}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                      {selectedNotification.time}
                    </span>
                  </div>
                  <h3 className="text-xl font-black italic uppercase tracking-tight mt-1 leading-tight text-black">
                    {selectedNotification.title}
                  </h3>
                </div>
              </div>

              <button 
                onClick={() => setSelectedNotification(null)}
                className="p-1.5 rounded-full hover:bg-black/10 text-zinc-500 hover:text-black transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 space-y-6 text-left">
              <p className="text-sm font-medium text-zinc-700 leading-relaxed">
                {selectedNotification.fullContent}
              </p>

              {/* Reason Box for Rejection or Extra details */}
              {selectedNotification.reason && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200/80 space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-red-600 block">
                    Official Reason for Decision
                  </span>
                  <p className="text-xs font-bold text-red-950 italic leading-normal">
                    "{selectedNotification.reason}"
                  </p>
                </div>
              )}

              {/* Action Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="w-full sm:w-auto ringer-button border border-black/10 bg-zinc-100 hover:bg-zinc-200 text-black text-xs py-2.5 px-5"
                >
                  DISMISS
                </button>

                {selectedNotification.actionHref && selectedNotification.actionText && (
                  <Link 
                    href={selectedNotification.actionHref}
                    onClick={() => setSelectedNotification(null)}
                    className="w-full sm:w-auto"
                  >
                    <button
                      className={`w-full ringer-button text-xs py-2.5 px-6 font-black uppercase shadow-lg transition-all ${
                        selectedNotification.type === 'rejected'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : selectedNotification.type === 'approved'
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : selectedNotification.type === 'global'
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              : selectedNotification.type === 'city'
                                ? 'bg-amber-500 hover:bg-amber-600 text-black'
                                : selectedNotification.type === 'event'
                                  ? 'bg-pink-600 hover:bg-pink-700 text-white'
                                  : 'bg-primary text-black hover:bg-black hover:text-white'
                      }`}
                    >
                      {selectedNotification.actionText}
                    </button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
