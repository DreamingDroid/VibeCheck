"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession, signOut, signIn } from "next-auth/react"
import { useCity } from "@/context/CityContext"
import { 
  ChevronDown, MapPin, Search, Music, Mic2, Tv,
  Trophy, Palette, BookOpen, Compass, Heart,
  Activity, Wine, Smile, Briefcase, Sparkles, Bell
} from "lucide-react"

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

export function GlobalHeader() {
  const { data: session } = useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { 
    currentCity, setCity, supportedCities, isLoading,
    selectedCategory, setSelectedCategory, activeCategories
  } = useCity()
  const [showCityMenu, setShowCityMenu] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOrganizer, setIsOrganizer] = useState(false)
  const [organizerStatus, setOrganizerStatus] = useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = useState<string | null>(null)
  const [showNotifications, setShowNotifications] = useState(false)

  useEffect(() => {
    if (session?.user?.email) {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      fetch(`${baseUrl}/api/admin/check?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(data => {
          setIsAdmin(data.isAdmin)
          setIsOrganizer(data.isOrganizer)
          setOrganizerStatus(data.status || null)
          setRejectionReason(data.rejectionReason || null)
        })
        .catch(() => {
          setIsAdmin(false)
          setIsOrganizer(false)
          setOrganizerStatus(null)
          setRejectionReason(null)
        })
    }
  }, [session])

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
    <div className="sticky top-0 z-50">
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-black/5 text-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between py-3">
          {/* Logo & City */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <Link href={session ? "/dashboard" : "/"} className="flex items-center gap-1.5 sm:gap-2">
              <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 rounded-full bg-primary shrink-0" />
              <span className="text-lg sm:text-xl font-black tracking-tighter uppercase italic">VIBECHECK</span>
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
          <div className="hidden md:flex flex-1 max-w-sm mx-8">
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
                  {isOrganizer && (organizerStatus === 'pending_approval' || organizerStatus === 'rejected') && (
                    <div className="relative mr-1">
                      <button 
                        onClick={() => setShowNotifications(!showNotifications)}
                        className="relative p-2 hover:bg-black/5 rounded-full transition-all text-zinc-600 hover:text-black flex items-center justify-center shrink-0"
                      >
                        <Bell className="h-4.5 w-4.5" />
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                      </button>

                      {showNotifications && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-black/5 rounded-[24px] shadow-2xl z-20 p-5 animate-in fade-in zoom-in-95 duration-200">
                            <h4 className="text-xs font-black uppercase tracking-widest text-zinc-400 mb-3 border-b border-black/5 pb-2 text-left">Notifications</h4>
                            <div className="space-y-3">
                              {organizerStatus === 'pending_approval' ? (
                                <div className="flex flex-col gap-1 bg-amber-50/50 p-3 rounded-2xl border border-amber-100/50 text-left">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Application Pending</span>
                                  <p className="text-xs font-bold text-zinc-700 leading-tight">Your organizer application is currently under review by our team.</p>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-2 bg-red-50/50 p-3 rounded-2xl border border-red-100/50 text-left">
                                  <span className="text-[10px] font-black uppercase tracking-widest text-red-600">Application Rejected</span>
                                  <p className="text-xs font-bold text-zinc-700 leading-tight">Unfortunately, your organizer application was rejected.</p>
                                  {rejectionReason && (
                                    <div className="bg-white/80 p-2 rounded-xl border border-red-100/30 mt-1">
                                      <span className="text-[8px] font-black uppercase tracking-widest text-zinc-400 block mb-1">Reason for Rejection</span>
                                      <p className="text-[11px] font-bold text-zinc-800 leading-normal italic">"{rejectionReason}"</p>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="hidden sm:flex flex-col items-end mr-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400 leading-none mb-1">Authenticated</span>
                    <span className="text-xs font-bold text-black leading-none">{session.user?.name}</span>
                  </div>
                  <button 
                    onClick={handleSignOut} 
                    disabled={isSigningOut}
                    className="ringer-button bg-black text-white text-[10px] sm:text-[11px] hover:bg-zinc-800 h-9 sm:h-10 px-4 sm:px-6 shrink-0"
                  >
                    {isSigningOut ? "..." : "DISCONNECT"}
                  </button>
                </div>
              </>
            ) : (
              <button 
                onClick={() => signIn("google")}
                className="hidden md:flex ringer-button bg-primary text-white text-[11px] h-10 px-8 items-center shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                JOIN THE VIBE
              </button>
            )}
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-12 flex items-center border-t border-black/5 overflow-x-auto no-scrollbar gap-2 py-1">
           {categories.map((cat, i) => {
             const isActive = selectedCategory === cat.name;
             return (
               <button 
                 key={i}
                 onClick={() => setSelectedCategory(cat.name)}
                 className={`sticker-badge flex items-center gap-1.5 whitespace-nowrap h-8 px-4 transition-all ${
                   isActive 
                     ? 'bg-black text-white border-transparent' 
                     : 'bg-white hover:bg-zinc-100 text-zinc-600 hover:text-black border-black/10'
                 }`}
               >
                 {cat.icon}
                 {cat.name}
               </button>
             );
           })}
        </div>
      </header>
    </div>
  )
}
