"use client"

import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useState, useEffect, useRef } from "react"
import { Sparkles, MapPin, Zap, Music, Heart, Star, Calendar, BookOpen, Compass, ArrowUpRight } from "lucide-react"
import { useTheme } from "@/context/ThemeContext"
import { useCity } from "@/context/CityContext"
import { useTranslation } from "@/context/LanguageContext"

const calculateReadTime = (content: string, t?: (key: string, vars?: any) => string) => {
  if (!content) return t ? t("landing.read_time", { min: 1 }) : "1 min read";
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 200));
  return t ? t("landing.read_time", { min: minutes }) : `${minutes} min read`;
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

const HERO_HEADLINES = [
  {
    line1: "The City of Destiny,",
    line2: "Reimagined.",
  },
  {
    line1: "Stop Scrolling,",
    line2: "Start Rolling.",
  },
  {
    line1: "Beat The Algorithm,",
    line2: "Own The Vibe.",
  },
  {
    line1: "Curated Events,",
    line2: "Instant Passes.",
  },
  {
    line1: "Less Screen Time,",
    line2: "More Scene Time.",
  },
  {
    line1: "Live Concerts,",
    line2: "Creator Meetups.",
  },
  {
    line1: "Real People,",
    line2: "Real City Energy.",
  },
  {
    line1: "Live Channels,",
    line2: "Instant Updates.",
  },
];

export default function Home() {
  const { status } = useSession()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [articles, setArticles] = useState<NewsArticle[]>([])
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true)
  const [headlineIndex, setHeadlineIndex] = useState(0)
  const [animState, setAnimState] = useState<"visible" | "exiting" | "entering">("visible")
  const { isVibrant } = useTheme()

  const { currentCity } = useCity()
  const { t } = useTranslation()

  useEffect(() => {
    const timer = setInterval(() => {
      // Step 1: Smoothly float up and blur dissolve outgoing text
      setAnimState("exiting")

      setTimeout(() => {
        // Step 2: Swap content and stage incoming text below
        setHeadlineIndex((prev) => (prev + 1) % HERO_HEADLINES.length)
        setAnimState("entering")

        // Step 3: Trigger fluid de-blur and slide into place
        requestAnimationFrame(() => {
          setTimeout(() => {
            setAnimState("visible")
          }, 40)
        })
      }, 420)
    }, 5000)

    return () => clearInterval(timer)
  }, [])

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
      <main className="flex flex-1 items-center justify-center bg-transparent">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </main>
    )
  }

  const handleSignIn = () => {
    setIsSigningIn(true)
    signIn("google", { callbackUrl: '/dashboard' })
  }

  return (
    <div className="relative flex-1 flex flex-col w-full bg-background overflow-x-hidden">
      {/* Vizag Landmarks Wall Art Mural Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-[72px] inset-x-0 bottom-0 z-0 overflow-hidden select-none"
      >
        {/* Soft center focus gradient protecting typography while revealing perimeter landmarks */}
        <div
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            background:
              "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(242, 242, 242, 0.78) 0%, rgba(242, 242, 242, 0.35) 55%, rgba(242, 242, 242, 0) 100%)",
          }}
        />

        {/* Framing Wall Art of Vizag Landmarks with breathing room to prevent cropping */}
        <div className="w-full h-full p-3 sm:p-6 md:p-8 flex items-center justify-center">
          <div
            className="w-full h-full bg-no-repeat bg-center bg-contain transition-opacity duration-1000"
            style={{
              backgroundImage: "url('/vizag-wallart.png?v=7')",
              opacity: 0.28,
            }}
          />
        </div>
      </div>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-16 w-full animate-in fade-in duration-700">

      {/* Hero Section */}
      <section className="flex flex-col items-center text-center space-y-6 sm:space-y-8 max-w-4xl mx-auto relative w-full my-auto">
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
        <div className="flex items-center gap-2 sticker-badge bg-primary/10 text-primary border-none shadow-sm mb-1">
          <Zap className="h-3.5 w-3.5" />
          <span>{currentCity.toLowerCase()}&apos;s {t("landing.badge")}</span>
        </div>

        <div className="h-[140px] sm:h-[200px] md:h-[270px] w-full flex items-center justify-center relative">
          {isVibrant && (
            <span className="absolute inset-0 blur-3xl opacity-10 bg-gradient-to-r from-purple-400 via-pink-300 to-amber-300 rounded-full -z-10 pointer-events-none" />
          )}
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-[4.75rem] xl:text-[5.5rem] font-black italic tracking-tighter uppercase leading-[0.88] text-black drop-shadow-sm px-2 text-center flex flex-col items-center justify-center">
            <div
              className={`flex flex-col items-center justify-center will-change-transform ${
                animState === "exiting"
                  ? "opacity-0 -translate-y-5 blur-[6px] scale-[0.98] transition-all duration-400 ease-in"
                  : animState === "entering"
                  ? "opacity-0 translate-y-6 blur-[6px] scale-[0.98] transition-none"
                  : "opacity-100 translate-y-0 blur-0 scale-100 transition-all duration-600 ease-[cubic-bezier(0.16,1,0.3,1)]"
              }`}
            >
              <span>{HERO_HEADLINES[headlineIndex].line1}</span>
              <span
                className={
                  isVibrant
                    ? "bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500 bg-clip-text text-transparent inline-block pb-1"
                    : "text-primary inline-block pb-1"
                }
              >
                {HERO_HEADLINES[headlineIndex].line2}
              </span>
            </div>
          </h1>
        </div>

        <p className="text-base sm:text-lg md:text-xl font-sans font-medium text-zinc-600 dark:text-zinc-300 max-w-2xl leading-relaxed tracking-tight text-balance px-4 sm:px-0 pt-4 sm:pt-6">
          {t("landing.hero_desc")}
        </p>

        <div className="pt-10 sm:pt-3 flex justify-center items-center w-full">
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="ringer-button join-vibe-glaze-btn w-auto text-white hover:scale-[1.02] active:scale-[0.98] h-12 sm:h-16 px-8 sm:px-10 text-xs sm:text-sm font-black flex items-center justify-center gap-3 transition-all cursor-pointer select-none"
          >
            {isSigningIn ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>{t("landing.join_cta")} <Sparkles className="h-4 w-4 drop-shadow-xs" /></>
            )}
          </button>
        </div>
      </section>

    </main>
    </div>
  )
}
