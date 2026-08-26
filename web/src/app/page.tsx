"use client"

import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState, useEffect } from "react"
import { Sparkles, MapPin, Zap, Music, Heart, Star, Calendar, BookOpen, Compass, ArrowUpRight } from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { useCity } from "@/context/CityContext"



const getCategoryStyles = (category: string) => {
  const cat = (category || "").toLowerCase();
  switch (cat) {
    case "events":
      return {
        bg: "hover:bg-rose-50/50 hover:border-rose-200 hover:text-rose-700",
        badge: "bg-rose-500 text-white",
        dot: "bg-rose-500",
      };
    case "tech":
      return {
        bg: "hover:bg-indigo-50/50 hover:border-indigo-200 hover:text-indigo-700",
        badge: "bg-indigo-500 text-white",
        dot: "bg-indigo-500",
      };
    case "culture":
      return {
        bg: "hover:bg-emerald-50/50 hover:border-emerald-200 hover:text-emerald-700",
        badge: "bg-emerald-500 text-white",
        dot: "bg-emerald-500",
      };
    case "music":
      return {
        bg: "hover:bg-fuchsia-50/50 hover:border-fuchsia-200 hover:text-fuchsia-700",
        badge: "bg-fuchsia-500 text-white",
        dot: "bg-fuchsia-500",
      };
    case "lifestyle":
      return {
        bg: "hover:bg-amber-50/50 hover:border-amber-200 hover:text-amber-700",
        badge: "bg-amber-500 text-white",
        dot: "bg-amber-500",
      };
    default:
      return {
        bg: "hover:bg-zinc-100 hover:border-zinc-300 hover:text-zinc-900",
        badge: "bg-zinc-800 text-white",
        dot: "bg-zinc-500",
      };
  }
};

const getCategoryIcon = (category: string) => {
  const cat = (category || "").toLowerCase();
  switch (cat) {
    case "events":
      return <Calendar className="h-4 w-4" />;
    case "tech":
      return <Zap className="h-4 w-4" />;
    case "music":
      return <Music className="h-4 w-4" />;
    case "culture":
      return <Compass className="h-4 w-4" />;
    case "lifestyle":
      return <Heart className="h-4 w-4" />;
    default:
      return <BookOpen className="h-4 w-4" />;
  }
};

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
      <section id="happenings" className="max-w-4xl mx-auto pt-16 pb-12">
        <div className="border-t border-black/5 pt-12 space-y-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-5xl font-black italic tracking-tighter uppercase leading-none">Local Currents</h2>
            <p className="text-[10px] font-black tracking-[0.2em] uppercase text-zinc-400 flex items-center justify-center gap-2">
               <MapPin className="h-3.5 w-3.5 text-primary" /> Live from the coast
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center px-4">
            {articles.length > 0 ? (
              articles.map((item) => {
                const styles = getCategoryStyles(item.category);
                return (
                  <Link
                    key={item.id}
                    href={`/local-currents?id=${item.id}`}
                    className={`group relative flex items-center justify-between gap-4 px-6 py-5 bg-white border border-black/5 rounded-[24px] transition-all duration-300 shadow-sm hover:shadow-md hover:scale-[1.02] cursor-pointer select-none w-full max-w-md ${styles.bg}`}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="p-3 rounded-2xl bg-zinc-50 group-hover:bg-white transition-colors flex items-center justify-center shrink-0 border border-black/5 text-zinc-500 group-hover:text-inherit">
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="flex flex-col text-left overflow-hidden">
                        <span className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-400 group-hover:text-inherit transition-colors flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                          {item.category}
                        </span>
                        <span className="text-sm font-black uppercase tracking-tight text-black leading-tight truncate group-hover:text-inherit transition-colors mt-1">
                          {item.title}
                        </span>
                      </div>
                    </div>
                    <ArrowUpRight className="h-5 w-5 text-zinc-300 group-hover:text-inherit shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </Link>
                );
              })
            ) : (
              <div className="col-span-full text-center py-12 text-zinc-400 text-sm font-bold italic bg-zinc-50/50 rounded-3xl border border-dashed border-black/5 w-full max-w-2xl">
                No local currents reported for {currentCity} today. Check back later!
              </div>
            )}
          </div>
        </div>
      </section>

    </main>
  )
}
