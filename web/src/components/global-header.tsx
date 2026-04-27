"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useSession, signOut, signIn } from "next-auth/react"
import { useCity } from "@/context/CityContext"
import { ChevronDown, MapPin, Search, Music, Mic2, Tv } from "lucide-react"

export function GlobalHeader() {
  const { data: session } = useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)
  const { currentCity, setCity, supportedCities, isLoading } = useCity()
  const [showCityMenu, setShowCityMenu] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isOrganizer, setIsOrganizer] = useState(false)

  useEffect(() => {
    if (session?.user?.email) {
      fetch(`http://localhost:4000/api/admin/check?email=${encodeURIComponent(session.user.email)}`)
        .then(r => r.json())
        .then(data => {
          setIsAdmin(data.isAdmin)
          setIsOrganizer(data.isOrganizer)
        })
        .catch(() => {
          setIsAdmin(false)
          setIsOrganizer(false)
        })
    }
  }, [session])

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut({ callbackUrl: "/" })
  }

  const categories = [
    { name: "The Latest", icon: <Music className="h-3 w-3" /> },
    { name: "Live Music", icon: <Mic2 className="h-3 w-3" /> },
    { name: "Podcasts", icon: <Tv className="h-3 w-3" /> },
    { name: "Nightlife", icon: null },
    { name: "Comedy", icon: null },
    { name: "Workshops", icon: null },
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
                  {isOrganizer ? (
                    <Link href="/organizer">
                      <button className="ringer-button bg-primary text-black hover:bg-black hover:text-white text-[10px] py-2 px-4 border-none transition-colors">
                        ORGANIZER HUB
                      </button>
                    </Link>
                  ) : (
                    <Link href="/organizer/apply">
                      <button className="ringer-button border border-black/5 bg-zinc-50 hover:bg-black hover:text-white text-[10px] py-2 px-4">
                        BECOME AN ORGANIZER
                      </button>
                    </Link>
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
           {categories.map((cat, i) => (
             <button 
               key={i}
               className="sticker-badge bg-white hover:bg-zinc-100 flex items-center gap-1.5 whitespace-nowrap text-zinc-600 hover:text-black h-8 px-4"
             >
               {cat.icon}
               {cat.name}
             </button>
           ))}
        </div>
      </header>
    </div>
  )
}
