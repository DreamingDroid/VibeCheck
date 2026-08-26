"use client"

import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState, useEffect } from "react"
import { Sparkles, MapPin, Zap, Music, Heart, Star } from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { useCity } from "@/context/CityContext"



interface NewsArticle {
  id: string | number;
  title: string;
  content: string;
  category: string;
}

export default function Home() {
  const { status } = useSession()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const { isVibrant } = useTheme()

  const { currentCity } = useCity()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router])

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/news/latest?city=${encodeURIComponent(currentCity)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setArticles(data.data);
        } else {
          setArticles([]);
        }
      })
      .catch((err) => {
        console.error("Error fetching news:", err);
        setArticles([]);
      });
  }, [currentCity]);

  if (status === "loading" || status === "authenticated") {
    return (
      <main className="flex flex-1 items-center justify-center bg-background">
         <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  const handleSignIn = () => {
    setIsSigningIn(true)
    signIn("google", { callbackUrl: '/dashboard' })
  }

  return (
    <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-12 md:py-24 space-y-16 animate-in fade-in duration-700">
      
      {/* Hero Section */}
      <section className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto relative">
        {/* Vibrant theme floating decorations */}
        {isVibrant && (
          <div className="absolute inset-0 pointer-events-none hidden sm:block">
            <div className="vibe-float-icon animate-float-gentle" style={{ top: '5%', left: '2%', opacity: 0.07, color: '#A855F7' }}><Music className="h-6 w-6" /></div>
            <div className="vibe-float-icon animate-float-slow" style={{ top: '15%', right: '5%', opacity: 0.06, color: '#EC4899' }}><Heart className="h-5 w-5" /></div>
            <div className="vibe-float-icon animate-float-drift" style={{ bottom: '20%', left: '8%', opacity: 0.06, color: '#F59E0B' }}><Star className="h-5 w-5" /></div>
            <div className="vibe-float-icon animate-float-gentle" style={{ bottom: '10%', right: '3%', opacity: 0.05, color: '#06B6D4' }}><Zap className="h-6 w-6" /></div>
            <div className="vibe-float-icon animate-float-slow" style={{ top: '50%', left: '0%', opacity: 0.05, color: '#10B981' }}><Sparkles className="h-4 w-4" /></div>
          </div>
        )}
        <div className="flex items-center gap-2 sticker-badge bg-primary/10 text-primary border-none shadow-sm">
          <Zap className="h-3.5 w-3.5" />
          <span>vizag's exclusive network</span>
        </div>
        
        <h1 className="text-5xl sm:text-7xl md:text-8xl font-black italic tracking-tighter uppercase leading-[0.9] text-black drop-shadow-sm relative px-2">
          {isVibrant && (
            <span className="absolute inset-0 blur-3xl opacity-10 bg-gradient-to-r from-purple-400 via-pink-300 to-amber-300 rounded-full -z-10" />
          )}
          The City of Destiny, <br className="hidden md:block"/>
          <span className={isVibrant ? 'bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 bg-clip-text text-transparent' : 'text-primary'}>Reimagined.</span>
        </h1>
        
        <p className="text-sm sm:text-base md:text-lg font-helvetica text-zinc-600 max-w-xl leading-relaxed sm:leading-loose tracking-wide px-4 sm:px-0">
          VibeCheck is the ultimate insider's guide to networking, discovery, and culture in Visakhapatnam. Powered by coastal energy and community.
        </p>
        
        <div className="pt-4 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button 
            onClick={handleSignIn} 
            disabled={isSigningIn}
            className="ringer-button w-auto bg-gradient-to-br from-[#22C55E] to-[#16A34A] hover:from-[#16A34A] hover:to-[#15803D] text-white hover:scale-[1.02] h-12 sm:h-16 px-8 sm:px-10 text-xs sm:text-sm font-black flex items-center justify-center gap-3 shadow-lg shadow-green-500/20 transition-all"
          >
            {isSigningIn ? (
               <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>JOIN THE VIBE <Sparkles className="h-4 w-4" /></>
            )}
          </button>
          <Link href="/local-currents" className="text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors py-4 px-6">
            Read the Latest
          </Link>
        </div>
      </section>

      {/* Local Currents Section */}
      <section id="happenings" className="max-w-3xl mx-auto pt-12">
        <div className="border-t border-black/5 pt-12 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">Local Currents</h2>
            <p className="text-xs font-black tracking-widest uppercase text-zinc-400 flex items-center justify-center gap-2">
               <MapPin className="h-3 w-3" /> Live from the coast
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {articles.length > 0 ? (
              articles.map((item) => (
                <Link
                  key={item.id}
                  href={`/local-currents?id=${item.id}`}
                  className="sticker-badge bg-white hover:bg-zinc-50 border border-black/5 hover:border-primary/20 text-black px-4 py-3 text-xs sm:text-sm font-black flex items-center gap-2.5 transition-all shadow-sm hover:scale-[1.03] hover:shadow-md cursor-pointer select-none"
                >
                  <span className="bg-black text-white px-2 py-0.5 rounded text-[8px] sm:text-[9px] uppercase font-black shrink-0">
                    {item.category}
                  </span>
                  <span className="truncate max-w-[200px] sm:max-w-[400px]">
                    {item.title}
                  </span>
                </Link>
              ))
            ) : (
              <div className="text-center py-6 text-zinc-400 text-xs font-bold italic">
                No local currents reported for {currentCity} today. Check back later!
              </div>
            )}
          </div>
        </div>
      </section>

    </main>
  )
}
