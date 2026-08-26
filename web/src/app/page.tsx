"use client"

import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { Sparkles, MapPin, Zap, Music, Heart, Star, Calendar, BookOpen, Compass, ArrowUpRight } from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { useCity } from "@/context/CityContext"



const calculateReadTime = (content: string) => {
  if (!content) return "1 min read";
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return `${minutes} min read`;
};

const getCategoryStyles = (category: string) => {
  const cat = (category || "").toLowerCase();
  switch (cat) {
    case "events":
      return {
        bg: "bg-white border-zinc-200/80 hover:bg-zinc-50/20 hover:border-pink-300 hover:shadow-lg hover:shadow-pink-500/5",
        iconContainer: "bg-white text-pink-500 border-zinc-200/80 group-hover:bg-pink-50/60 group-hover:border-pink-200",
        textColor: "text-pink-500",
        mutedTextColor: "text-zinc-400",
        titleColor: "text-zinc-900",
        hoverTitleColor: "group-hover:text-black",
        dot: "bg-pink-500",
        arrowColor: "text-zinc-300 group-hover:text-pink-500",
      };
    case "tech":
      return {
        bg: "bg-white border-zinc-200/80 hover:bg-zinc-50/20 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/5",
        iconContainer: "bg-white text-purple-600 border-zinc-200/80 group-hover:bg-purple-50/60 group-hover:border-purple-200",
        textColor: "text-purple-600",
        mutedTextColor: "text-zinc-400",
        titleColor: "text-zinc-900",
        hoverTitleColor: "group-hover:text-black",
        dot: "bg-purple-600",
        arrowColor: "text-zinc-300 group-hover:text-purple-600",
      };
    case "culture":
      return {
        bg: "bg-white border-zinc-200/80 hover:bg-zinc-50/20 hover:border-pink-300 hover:shadow-lg hover:shadow-pink-500/5",
        iconContainer: "bg-white text-pink-500 border-zinc-200/80 group-hover:bg-pink-50/60 group-hover:border-pink-200",
        textColor: "text-pink-500",
        mutedTextColor: "text-zinc-400",
        titleColor: "text-zinc-900",
        hoverTitleColor: "group-hover:text-black",
        dot: "bg-pink-500",
        arrowColor: "text-zinc-300 group-hover:text-pink-500",
      };
    case "music":
      return {
        bg: "bg-white border-zinc-200/80 hover:bg-zinc-50/20 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/5",
        iconContainer: "bg-white text-purple-600 border-zinc-200/80 group-hover:bg-purple-50/60 group-hover:border-purple-200",
        textColor: "text-purple-600",
        mutedTextColor: "text-zinc-400",
        titleColor: "text-zinc-900",
        hoverTitleColor: "group-hover:text-black",
        dot: "bg-purple-600",
        arrowColor: "text-zinc-300 group-hover:text-purple-600",
      };
    case "lifestyle":
      return {
        bg: "bg-white border-zinc-200/80 hover:bg-zinc-50/20 hover:border-amber-300 hover:shadow-lg hover:shadow-amber-500/5",
        iconContainer: "bg-white text-amber-500 border-zinc-200/80 group-hover:bg-amber-50/60 group-hover:border-amber-200",
        textColor: "text-amber-500",
        mutedTextColor: "text-zinc-400",
        titleColor: "text-zinc-900",
        hoverTitleColor: "group-hover:text-black",
        dot: "bg-amber-500",
        arrowColor: "text-zinc-300 group-hover:text-amber-500",
      };
    default:
      return {
        bg: "bg-white border-zinc-200/80 hover:bg-zinc-50/20 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-500/5",
        iconContainer: "bg-white text-purple-600 border-zinc-200/80 group-hover:bg-purple-50/60 group-hover:border-purple-200",
        textColor: "text-purple-600",
        mutedTextColor: "text-zinc-400",
        titleColor: "text-zinc-900",
        hoverTitleColor: "group-hover:text-black",
        dot: "bg-purple-600",
        arrowColor: "text-zinc-300 group-hover:text-purple-600",
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
  created_at?: string;
}

const ScrollingTitle = ({ 
  title, 
  enabled, 
  titleColor, 
  hoverTitleColor 
}: { 
  title: string; 
  enabled: boolean; 
  titleColor: string; 
  hoverTitleColor: string;
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [scrollWidth, setScrollWidth] = useState(0);

  useEffect(() => {
    if (containerRef.current && textRef.current) {
      const containerWidth = containerRef.current.offsetWidth;
      const textWidth = textRef.current.scrollWidth;
      if (textWidth > containerWidth) {
        setShouldScroll(true);
        setScrollWidth(textWidth - containerWidth);
      } else {
        setShouldScroll(false);
      }
    }
  }, [title, enabled]);

  if (!enabled || !shouldScroll) {
    return (
      <div ref={containerRef} className="w-full overflow-hidden min-w-0">
        <span ref={textRef} className={`block text-sm font-black italic uppercase tracking-tight leading-tight truncate transition-colors mt-1 ${titleColor} ${hoverTitleColor}`}>
          {title}
        </span>
      </div>
    );
  }

  // Safe animation identifier using a sanitized hash of the title string
  const cleanId = title.replace(/[^a-zA-Z0-9]/g, "");

  return (
    <div ref={containerRef} className="w-full overflow-hidden relative min-w-0">
      <span ref={textRef} className="invisible absolute whitespace-nowrap text-sm font-black italic uppercase tracking-tight mt-1">{title}</span>
      <div 
        className="whitespace-nowrap"
        style={{
          display: "inline-block",
          animation: `marquee-${cleanId} 8s linear infinite`,
        }}
      >
        <span className={`text-sm font-black italic uppercase tracking-tight leading-tight transition-colors mt-1 ${titleColor} ${hoverTitleColor}`}>
          {title}
        </span>
      </div>
      <style>{`
        @keyframes marquee-${cleanId} {
          0% { transform: translate3d(0, 0, 0); }
          15% { transform: translate3d(0, 0, 0); }
          80% { transform: translate3d(-${scrollWidth}px, 0, 0); }
          85% { transform: translate3d(-${scrollWidth}px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>
    </div>
  );
};

export default function Home() {
  const { status } = useSession()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)
  const { isVibrant } = useTheme()

  const { currentCity } = useCity()

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router])

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    fetch(`${baseUrl}/api/settings`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setAutoScrollEnabled(data.autoScrollEnabled);
        }
      })
      .catch((err) => {
        console.error("Error fetching settings:", err);
      });
  }, []);

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
            <div className="flex items-center justify-center gap-2 mt-2">
              <p className="text-[10px] font-black tracking-[0.2em] uppercase text-zinc-400 flex items-center justify-center gap-2">
                 <MapPin className="h-3.5 w-3.5 text-primary" /> Live from the coast
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 justify-items-center px-4">
            {articles.length > 0 ? (
              articles.map((item) => {
                const styles = getCategoryStyles(item.category);
                return (
                  <Link
                    key={item.id}
                    href={`/local-currents?id=${item.id}`}
                    className={`group relative flex items-center justify-between gap-4 px-6 py-5 border rounded-[24px] transition-all duration-300 shadow-sm hover:scale-[1.02] cursor-pointer select-none w-full max-w-sm md:w-[380px] shrink-0 ${styles.bg}`}
                  >
                    <div className="flex items-center gap-4 overflow-hidden min-w-0">
                      <div className={`p-3 rounded-2xl transition-colors flex items-center justify-center shrink-0 border ${styles.iconContainer}`}>
                        {getCategoryIcon(item.category)}
                      </div>
                      <div className="flex flex-col text-left overflow-hidden min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-[0.15em] flex items-center gap-1.5 shrink-0 ${styles.textColor}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
                            {item.category}
                          </span>
                          <span className={`text-[9px] font-black uppercase tracking-[0.15em] truncate ${styles.mutedTextColor}`}>
                            • {calculateReadTime(item.content)}
                            {item.created_at && ` • ${new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}`}
                          </span>
                        </div>
                        <ScrollingTitle 
                          title={item.title} 
                          enabled={autoScrollEnabled} 
                          titleColor={styles.titleColor} 
                          hoverTitleColor={styles.hoverTitleColor} 
                        />
                      </div>
                    </div>
                    <ArrowUpRight className={`h-5 w-5 group-hover:scale-110 shrink-0 transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 ${styles.arrowColor}`} />
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
