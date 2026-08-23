"use client"

import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { ChevronDown, Sparkles, MapPin, Zap, Music, Heart, Star } from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { useCity } from "@/context/CityContext"

const NEWS_ITEMS = [
  {
    id: 1,
    title: "Rushikonda Beach Festival Announced",
    content: "Get ready for a three-day musical extravaganza featuring national bands and local talent right on the golden sands of Rushikonda.",
    category: "Events"
  },
  {
    id: 2,
    title: "New Tech Hub Opens in Madhurawada",
    content: "A state-of-the-art collaborative space just opened its doors, aiming to foster Vizag's rapidly growing design and tech community.",
    category: "Tech"
  },
  {
    id: 3,
    title: "Street Food Carnival at RK Beach",
    content: "Experience the best of coastal flavors at this weekend's massive culinary block party along the iconic Beach Road.",
    category: "Culture"
  }
];

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
  const [openAccordion, setOpenAccordion] = useState<string | number | null>(null)
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
        if (data.success && Array.isArray(data.data) && data.data.length > 0) {
          setArticles(data.data);
          setOpenAccordion(data.data[0].id);
        } else {
          setArticles(NEWS_ITEMS);
          setOpenAccordion(1);
        }
      })
      .catch((err) => {
        console.error("Error fetching news:", err);
        setArticles(NEWS_ITEMS);
        setOpenAccordion(1);
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
          <a href="#happenings" className="text-xs font-black uppercase tracking-widest text-zinc-400 hover:text-black transition-colors py-4 px-6">
            Read the Latest
          </a>
        </div>
      </section>

      {/* Happenings Accordion */}
      <section id="happenings" className="max-w-3xl mx-auto pt-12">
        <div className="border-t border-black/5 pt-12 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase">Local Currents</h2>
            <p className="text-xs font-black tracking-widest uppercase text-zinc-400 flex items-center justify-center gap-2">
               <MapPin className="h-3 w-3" /> Live from the coast
            </p>
          </div>

          <div className="space-y-4">
            {articles.map((item) => {
              const isOpen = openAccordion === item.id;
              
              return (
                <div 
                  key={item.id} 
                  className={`ringer-card overflow-hidden transition-all duration-300 border-2 ${isOpen ? 'border-primary ring-4 ring-primary/10' : 'border-black/5 hover:border-black/20 text-cursor-pointer'}`}
                >
                  <button 
                    onClick={() => setOpenAccordion(isOpen ? null : item.id)}
                    className="w-full text-left px-8 py-6 flex items-center justify-between bg-white"
                  >
                    <div className="flex items-center gap-4">
                      <span className="sticker-badge bg-black text-white shrink-0">
                        {item.category}
                      </span>
                      <span className="text-lg md:text-xl font-black tracking-tight leading-tight uppercase pr-4">
                        {item.title}
                      </span>
                    </div>
                    <ChevronDown className={`h-5 w-5 text-black shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <div 
                    className={`grid transition-all duration-300 ease-in-out bg-zinc-50 ${isOpen ? 'grid-rows-[1fr] border-t border-black/5' : 'grid-rows-[0fr]'}`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-8 py-6 text-zinc-600 font-bold leading-relaxed text-sm md:text-base">
                        {item.content}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

    </main>
  )
}
