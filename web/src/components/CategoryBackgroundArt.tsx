"use client"

import React from "react"

interface CategoryBackgroundArtProps {
  category: string
  className?: string
}

/**
 * Normalizes category string to identify the appropriate artistic landscape.
 */
function normalizeCategory(category: string): string {
  const norm = (category || "").trim().toLowerCase()
  if (norm.includes("adventure") || norm.includes("trek") || norm.includes("camp") || norm.includes("nature") || norm.includes("hike") || norm.includes("outdoor")) {
    return "adventure"
  }
  if (norm.includes("music") || norm.includes("gig") || norm.includes("concert") || (norm.includes("acoustic") && !norm.includes("indie"))) {
    return "music"
  }
  if (norm.includes("nightlife") || norm.includes("club") || norm.includes("party") || norm.includes("dj") || norm.includes("rave")) {
    return "nightlife"
  }
  if (norm.includes("art") || norm.includes("craft") || norm.includes("paint") || norm.includes("culture") || norm.includes("museum") || norm.includes("pottery")) {
    return "arts"
  }
  if (norm.includes("sport") || norm.includes("fitness") || norm.includes("run") || norm.includes("athletics") || norm.includes("marathon") || norm.includes("gym")) {
    return "sports"
  }
  if (norm.includes("food") || norm.includes("drink") || norm.includes("dining") || norm.includes("culinary") || norm.includes("coffee") || norm.includes("brunch")) {
    return "food"
  }
  if (norm.includes("wellness") || norm.includes("health") || norm.includes("yoga") || norm.includes("mind-body") || norm.includes("spa")) {
    return "wellness"
  }
  if (norm.includes("workshop") || norm.includes("education") || norm.includes("learn") || norm.includes("bootcamp") || norm.includes("course")) {
    return "workshops"
  }
  if (norm.includes("spiritual") || norm.includes("meditat") || norm.includes("mindful") || norm.includes("kirtan") || norm.includes("satsang")) {
    return "spiritual"
  }
  if (norm.includes("comedy") || norm.includes("standup") || norm.includes("humor") || norm.includes("improv")) {
    return "comedy"
  }
  if (norm.includes("techno") || norm.includes("tech") || norm.includes("cyber") || norm.includes("electronic") || norm.includes("code")) {
    return "techno"
  }
  if (norm.includes("indie")) {
    return "indie"
  }
  return "general"
}

export function CategoryBackgroundArt({ category, className = "" }: CategoryBackgroundArtProps) {
  const cat = normalizeCategory(category)

  return (
    <div className={`absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden rounded-[inherit] z-0 ${className}`}>
      {/* Layer 1: Full-Bleed Dunes & Sky Gradient (100% width & height with no gaps at bottom) */}
      <div className="absolute inset-0 w-full h-full opacity-[0.33] transition-all duration-700 ease-out group-hover:opacity-[0.45]">
        {cat === "adventure" && <AdventureDunes />}
        {cat === "music" && <MusicDunes />}
        {cat === "arts" && <ArtsDunes />}
        {cat === "nightlife" && <NightlifeDunes />}
        {cat === "sports" && <SportsDunes />}
        {cat === "food" && <FoodDunes />}
        {cat === "wellness" && <WellnessDunes />}
        {cat === "workshops" && <WorkshopsDunes />}
        {cat === "spiritual" && <SpiritualDunes />}
        {cat === "comedy" && <ComedyDunes />}
        {cat === "techno" && <TechnoDunes />}
        {cat === "indie" && <IndieDunes />}
        {cat === "general" && <GeneralDunes />}
      </div>

      {/* Layer 2: True Aspect-Ratio Thematic Accent Art (Top-right positioned, true circles/shapes) */}
      <div className="absolute top-0 right-0 w-3/4 max-w-[320px] h-[190px] sm:h-[220px] opacity-[0.22] transition-all duration-700 ease-out group-hover:opacity-[0.30] pointer-events-none">
        {cat === "adventure" && <AdventureAccents />}
        {cat === "music" && <MusicAccents />}
        {cat === "arts" && <ArtsAccents />}
        {cat === "nightlife" && <NightlifeAccents />}
        {cat === "sports" && <SportsAccents />}
        {cat === "food" && <FoodAccents />}
        {cat === "wellness" && <WellnessAccents />}
        {cat === "workshops" && <WorkshopsAccents />}
        {cat === "spiritual" && <SpiritualAccents />}
        {cat === "comedy" && <ComedyAccents />}
        {cat === "techno" && <TechnoAccents />}
        {cat === "indie" && <IndieAccents />}
        {cat === "general" && <GeneralAccents />}
      </div>

      {/* Layer 3: Softening & legibility white overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/88 via-white/60 to-white/15 sm:from-white/85 sm:via-white/50 sm:to-white/10 pointer-events-none z-[1]" />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   1. ADVENTURE: Mountain ridges, winding trail, pines & soaring birds
   ───────────────────────────────────────────────────────────── */
function AdventureDunes() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="advSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E0F2E9" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#F2FBF6" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#advSky)" />
      
      {/* Distant Peaks */}
      <polygon points="180,180 290,90 380,180" fill="#F2B7A5" opacity="0.5" />
      <polygon points="340,190 440,80 540,190" fill="#F2B7A5" opacity="0.45" />

      {/* Mid Range Slopes */}
      <path d="M0,170 Q140,110 300,165 T600,120 L600,360 L0,360 Z" fill="#E48E70" opacity="0.55" />

      {/* Switchback Hiking Trail Ribbon */}
      <path d="M80,360 C150,290 260,280 340,240 C410,205 480,225 530,205 L555,218 C495,240 430,225 360,260 C280,300 180,310 120,360 Z" fill="#8DD3C7" opacity="0.8" />

      {/* Sage Green Rolling Foothills */}
      <path d="M0,230 Q160,170 350,235 T600,190 L600,360 L0,360 Z" fill="#5C9B88" opacity="0.6" />

      {/* Deep Forest Alpine Slopes */}
      <path d="M0,280 Q150,220 330,285 T600,240 L600,360 L0,360 Z" fill="#235E54" opacity="0.5" />

      {/* Pine Trees */}
      <polygon points="75,235 65,260 85,260" fill="#1B443B" opacity="0.8" />
      <polygon points="75,225 68,245 82,245" fill="#1B443B" opacity="0.85" />
      <rect x="73" y="260" width="4" height="8" fill="#1B443B" opacity="0.8" />

      <polygon points="120,205 110,232 130,232" fill="#235E54" opacity="0.85" />
      <polygon points="120,192 113,215 127,215" fill="#235E54" opacity="0.9" />
      <rect x="118" y="232" width="4" height="8" fill="#1B443B" opacity="0.85" />
    </svg>
  )
}

function AdventureAccents() {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMaxYMin meet" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Soft Mountain Clouds */}
      <path d="M20,45 Q40,25 65,35 Q85,22 108,35 Q128,30 138,48 Q125,62 20,62 Z" fill="#FFFFFF" opacity="0.8" />
      {/* Rising Mountain Sun (True Circle) */}
      <circle cx="230" cy="55" r="28" fill="#E89B58" opacity="0.85" />
      {/* Soaring Eagles / Birds */}
      <path d="M140,40 Q150,32 160,40 Q170,32 180,40 Q170,37 160,43 Q150,37 140,40 Z" fill="#2A5C50" opacity="0.6" />
      <path d="M110,55 Q118,48 126,55 Q134,48 142,55 Q134,52 126,57 Q118,52 110,55 Z" fill="#2A5C50" opacity="0.5" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   2. MUSIC: Vinyl record disc, acoustic soundwaves & equalizer
   ───────────────────────────────────────────────────────────── */
function MusicDunes() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="musSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFBEB" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#musSky)" />

      {/* Resonant Harmonic Acoustic Wave Ribbons */}
      <path d="M-20,160 C120,110 240,190 380,140 C480,105 540,150 620,125 L620,360 L-20,360 Z" fill="#FDE68A" opacity="0.6" />
      <path d="M-20,210 C140,155 270,230 410,180 C510,140 560,195 620,165 L620,360 L-20,360 Z" fill="#FCA5A5" opacity="0.5" />

      {/* Melodic Staff Flowing Curves */}
      <path d="M0,235 C180,185 320,255 480,210 T620,195" stroke="#D97706" strokeWidth="2.5" fill="none" opacity="0.6" />
      <path d="M0,248 C180,198 320,268 480,223 T620,208" stroke="#D97706" strokeWidth="1.5" strokeDasharray="6 4" fill="none" opacity="0.5" />

      {/* Golden Base Resonance Dunes */}
      <path d="M0,270 C160,215 340,280 480,235 T600,220 L600,360 L0,360 Z" fill="#F59E0B" opacity="0.45" />
      <path d="M0,310 C180,260 360,320 500,275 T600,255 L600,360 L0,360 Z" fill="#B45309" opacity="0.35" />
    </svg>
  )
}

function MusicAccents() {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMaxYMin meet" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* True-Circle Vinyl Record Cutting in from Top Right */}
      <g transform="translate(235, 65)">
        <circle cx="0" cy="0" r="75" fill="#78350F" opacity="0.12" />
        <circle cx="0" cy="0" r="62" stroke="#92400E" strokeWidth="1.5" fill="none" opacity="0.25" />
        <circle cx="0" cy="0" r="48" stroke="#B45309" strokeWidth="1.5" fill="none" opacity="0.35" />
        <circle cx="0" cy="0" r="34" stroke="#D97706" strokeWidth="2" fill="none" opacity="0.45" />
        <circle cx="0" cy="0" r="22" fill="#F59E0B" opacity="0.85" />
        <circle cx="0" cy="0" r="8" fill="#FEF3C7" opacity="0.95" />
        <circle cx="0" cy="0" r="3" fill="#78350F" opacity="0.9" />
      </g>

      {/* Floating Melody Notes */}
      <circle cx="80" cy="55" r="4.5" fill="#92400E" opacity="0.75" />
      <path d="M84.5,55 L84.5,30 Q98,26 106,38" stroke="#92400E" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.75" />

      <circle cx="125" cy="70" r="4" fill="#B45309" opacity="0.7" />
      <path d="M129,70 L129,47 Q141,44 147,54" stroke="#B45309" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />

      {/* Equalizer Frequency Graphic Bars */}
      <rect x="170" y="125" width="5" height="28" rx="2.5" fill="#B45309" opacity="0.6" />
      <rect x="180" y="110" width="5" height="43" rx="2.5" fill="#D97706" opacity="0.65" />
      <rect x="190" y="95" width="5" height="58" rx="2.5" fill="#F59E0B" opacity="0.7" />
      <rect x="200" y="115" width="5" height="38" rx="2.5" fill="#D97706" opacity="0.65" />
      <rect x="210" y="130" width="5" height="23" rx="2.5" fill="#B45309" opacity="0.6" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   3. ARTS & CULTURE: Terracotta vase, artist palette & Matisse curves
   ───────────────────────────────────────────────────────────── */
function ArtsDunes() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="artSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F3E8FF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FAF5FF" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#artSky)" />

      {/* Flowing Painter's Palette Contour Curves */}
      <path d="M-20,150 C140,95 260,170 400,125 C500,90 560,140 620,115 L620,360 L-20,360 Z" fill="#DDD6FE" opacity="0.65" />
      <path d="M-20,205 C160,150 280,225 420,180 C520,140 560,190 620,165 L620,360 L-20,360 Z" fill="#FBCFE8" opacity="0.6" />

      {/* Deep Violet Foundation */}
      <path d="M0,260 Q180,200 360,260 T600,225 L600,360 L0,360 Z" fill="#C084FC" opacity="0.45" />
      <path d="M0,305 Q160,250 340,305 T600,265 L600,360 L0,360 Z" fill="#9333EA" opacity="0.35" />
    </svg>
  )
}

function ArtsAccents() {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMaxYMin meet" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Bauhaus Arch & Semicircle Sun */}
      <path d="M175,85 A25,25 0 0,1 225,85 Z" fill="#E879F9" opacity="0.65" />
      <circle cx="200" cy="45" r="14" fill="#C084FC" opacity="0.65" />

      {/* Sculpted Grecian Terracotta Vase Silhouette on Right */}
      <path d="M220,135 C220,115 212,108 224,92 C228,88 228,84 220,84 L252,84 C244,84 244,88 248,92 C260,108 252,115 252,135 C252,160 264,175 256,190 L216,190 C208,175 220,160 220,135 Z" fill="#A855F7" opacity="0.45" />
      <path d="M216,105 C204,116 204,142 216,155" stroke="#9333EA" strokeWidth="2.5" fill="none" opacity="0.5" />

      {/* Matisse Organic Fluid Cut-outs */}
      <circle cx="120" cy="140" r="10" fill="#F472B6" opacity="0.55" />
      <circle cx="138" cy="132" r="6" fill="#9333EA" opacity="0.55" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   4. NIGHTLIFE: Crescent moon, cocktail coupe, stars & rooftop arches
   ───────────────────────────────────────────────────────────── */
function NightlifeDunes() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="niteSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E0E7FF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#EEF2FF" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#niteSky)" />

      {/* Layered Modern Architectural Arches */}
      <path d="M100,190 A40,40 0 0,1 180,190 L180,360 L100,360 Z" fill="#C7D2FE" opacity="0.45" />
      <path d="M150,150 A50,50 0 0,1 250,150 L250,360 L150,360 Z" fill="#A5B4FC" opacity="0.5" />
      <path d="M220,170 A45,45 0 0,1 310,170 L310,360 L220,360 Z" fill="#C7D2FE" opacity="0.4" />

      {/* Atmospheric Rooftop Silhouette Contours */}
      <path d="M0,240 Q160,180 340,240 T600,210 L600,360 L0,360 Z" fill="#818CF8" opacity="0.55" />
      <path d="M0,290 Q150,235 320,290 T600,250 L600,360 L0,360 Z" fill="#4F46E5" opacity="0.4" />
    </svg>
  )
}

function NightlifeAccents() {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMaxYMin meet" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Glowing Crescent Moon */}
      <path d="M210,30 A20,20 0 0,0 230,50 A16,16 0 1,1 210,30 Z" fill="#6366F1" opacity="0.9" />
      
      {/* 4-point Sparkle Stars */}
      <path d="M130,35 L132.5,41 L139,42.5 L132.5,44 L130,50 L127.5,44 L121,42.5 L127.5,41 Z" fill="#818CF8" opacity="0.8" />
      <path d="M165,58 L167,63 L172,64 L167,65.5 L165,70 L163,65.5 L158,64 L163,63 Z" fill="#818CF8" opacity="0.7" />
      <path d="M255,38 L256.5,42 L260,43 L256.5,44 L255,48 L253.5,44 L250,43 L253.5,42 Z" fill="#A5B4FC" opacity="0.75" />

      {/* Cocktail Coupe Silhouette on Right */}
      <path d="M225,125 Q240,150 240,165 L238,188 L232,188 L232,190 L248,190 L248,188 L242,188 L240,165 Q240,150 255,125 Z" fill="#6366F1" opacity="0.5" />
      <circle cx="237" cy="118" r="2.5" fill="#818CF8" opacity="0.7" />
      <circle cx="243" cy="112" r="2" fill="#818CF8" opacity="0.8" />
      <circle cx="240" cy="103" r="2.8" fill="#A5B4FC" opacity="0.6" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   5. SPORTS: Curving track lanes, speed chevrons & kinetic sunrise
   ───────────────────────────────────────────────────────────── */
function SportsDunes() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sptSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFEDD5" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFF7ED" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#sptSky)" />

      {/* Curving Track Lanes */}
      <path d="M-40,280 C160,180 340,160 640,110 L640,160 C340,210 160,230 -40,330 Z" fill="#EA580C" opacity="0.3" />
      <path d="M-40,330 C160,230 340,210 640,160 L640,210 C340,260 160,280 -40,380 Z" fill="#C2410C" opacity="0.3" />

      <path d="M-40,280 C160,180 340,160 640,110" stroke="#FFF7ED" strokeWidth="3" strokeDasharray="16 10" fill="none" opacity="0.85" />
      <path d="M-40,330 C160,230 340,210 640,160" stroke="#FFF7ED" strokeWidth="3" strokeDasharray="16 10" fill="none" opacity="0.85" />

      {/* Aerodynamic Velocity Hill Curves */}
      <path d="M0,180 Q180,120 360,175 T600,135 L600,360 L0,360 Z" fill="#FED7AA" opacity="0.6" />
      <path d="M0,230 Q200,165 400,230 T600,185 L600,360 L0,360 Z" fill="#FDBA74" opacity="0.55" />
      <path d="M0,285 Q170,225 350,290 T600,245 L600,360 L0,360 Z" fill="#EA580C" opacity="0.4" />
    </svg>
  )
}

function SportsAccents() {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMaxYMin meet" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Kinetic Speed Sunrise (True Circle) */}
      <circle cx="230" cy="55" r="26" fill="#F97316" opacity="0.9" />
      <line x1="160" y1="48" x2="195" y2="48" stroke="#FB923C" strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />
      <line x1="170" y1="62" x2="200" y2="62" stroke="#FB923C" strokeWidth="2.5" strokeLinecap="round" opacity="0.65" />

      {/* Dynamic Chevrons */}
      <path d="M215,130 L230,142 L215,154" stroke="#FB923C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
      <path d="M238,122 L253,134 L238,146" stroke="#FB923C" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   6. FOOD & DRINK: Wine glass, steam spirals & vineyard terraces
   ───────────────────────────────────────────────────────────── */
function FoodDunes() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fdSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE4E6" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFF1F2" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#fdSky)" />

      {/* Vineyard Slopes */}
      <path d="M0,170 Q160,115 330,165 T600,130 L600,360 L0,360 Z" fill="#FECDD3" opacity="0.65" />
      <path d="M0,220 Q190,155 380,220 T600,180 L600,360 L0,360 Z" fill="#FDA4AF" opacity="0.6" />
      <path d="M0,275 Q160,200 340,270 T600,230 L600,360 L0,360 Z" fill="#FB7185" opacity="0.45" />
      <path d="M0,315 Q150,250 320,315 T600,270 L600,360 L0,360 Z" fill="#E11D48" opacity="0.35" />
    </svg>
  )
}

function FoodAccents() {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMaxYMin meet" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Warm Rose Sun */}
      <circle cx="230" cy="55" r="25" fill="#F43F5E" opacity="0.85" />
      
      {/* Culinary Steam Spirals */}
      <path d="M150,75 Q162,52 146,35 Q158,18 174,15" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M174,80 Q186,57 170,40 Q182,23 198,20" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.6" />

      {/* Wine Glass Silhouette on Right */}
      <path d="M235,115 Q235,142 248,142 Q261,142 261,115 Z" fill="#E11D48" opacity="0.55" />
      <line x1="248" y1="142" x2="248" y2="170" stroke="#BE123C" strokeWidth="2.5" opacity="0.7" />
      <ellipse cx="248" cy="170" rx="10" ry="3" fill="#BE123C" opacity="0.7" />

      {/* Grape Cluster */}
      <circle cx="215" cy="125" r="4.5" fill="#9F1239" opacity="0.7" />
      <circle cx="225" cy="125" r="4.5" fill="#9F1239" opacity="0.7" />
      <circle cx="220" cy="133" r="4" fill="#BE123C" opacity="0.75" />
      <circle cx="228" cy="133" r="4" fill="#BE123C" opacity="0.75" />
      <circle cx="224" cy="140" r="3.5" fill="#E11D48" opacity="0.8" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   7. WELLNESS: Zen water ripples, pebble cairn & bamboo
   ───────────────────────────────────────────────────────────── */
function WellnessDunes() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wllSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#CCFBF1" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#F0FDFA" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#wllSky)" />

      {/* Calm Water Dunes */}
      <path d="M0,180 Q170,125 340,175 T600,140 L600,360 L0,360 Z" fill="#99F6E4" opacity="0.6" />
      <path d="M0,230 Q160,170 330,230 T600,190 L600,360 L0,360 Z" fill="#5EEAD4" opacity="0.55" />
      <path d="M0,280 Q180,215 360,285 T600,240 L600,360 L0,360 Z" fill="#2DD4BF" opacity="0.45" />
    </svg>
  )
}

function WellnessAccents() {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMaxYMin meet" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Radiant Zen Sun */}
      <circle cx="230" cy="55" r="36" fill="#2DD4BF" opacity="0.2" />
      <circle cx="230" cy="55" r="24" fill="#14B8A6" opacity="0.85" />

      {/* Concentric Zen Water Ripples */}
      <ellipse cx="140" cy="140" rx="55" ry="12" stroke="#14B8A6" strokeWidth="1.2" fill="none" opacity="0.4" />
      <ellipse cx="140" cy="140" rx="36" ry="8" stroke="#14B8A6" strokeWidth="1.2" fill="none" opacity="0.5" />
      <ellipse cx="140" cy="140" rx="18" ry="4" stroke="#0D9488" strokeWidth="1.5" fill="none" opacity="0.6" />

      {/* Stacked River Stone Pebble Cairn on Right */}
      <ellipse cx="245" cy="175" rx="22" ry="7" fill="#0F766E" opacity="0.75" />
      <ellipse cx="245" cy="162" rx="17" ry="6" fill="#115E59" opacity="0.8" />
      <ellipse cx="245" cy="151" rx="12" ry="4.5" fill="#134E4A" opacity="0.85" />
      <ellipse cx="245" cy="142" rx="7.5" ry="3" fill="#042F2E" opacity="0.9" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   8. WORKSHOPS: Idea bulb, growth staircase & blueprint curves
   ───────────────────────────────────────────────────────────── */
function WorkshopsDunes() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wrkSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#DBEAFE" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#wrkSky)" />

      {/* Knowledge Wave Contours */}
      <path d="M-20,155 Q150,95 320,145 T620,115 L620,360 L-20,360 Z" fill="#BFDBFE" opacity="0.6" />
      <path d="M0,215 Q190,150 380,215 T600,175 L600,360 L0,360 Z" fill="#93C5FD" opacity="0.55" />
      <path d="M0,270 Q160,200 340,270 T600,225 L600,360 L0,360 Z" fill="#60A5FA" opacity="0.45" />
      <path d="M0,315 Q180,250 360,315 T600,270 L600,360 L0,360 Z" fill="#2563EB" opacity="0.35" />
    </svg>
  )
}

function WorkshopsAccents() {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMaxYMin meet" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Glowing Idea Bulb (True Circle) */}
      <circle cx="230" cy="55" r="22" fill="#3B82F6" opacity="0.85" />
      <line x1="230" y1="24" x2="230" y2="14" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="254" y1="33" x2="262" y2="25" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="206" y1="33" x2="198" y2="25" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="260" y1="55" x2="270" y2="55" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <line x1="200" y1="55" x2="190" y2="55" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" opacity="0.7" />

      {/* Isometric Stepped Staircase on Right */}
      <polygon points="180,180 200,180 200,160 220,160 220,140 240,140 240,120 260,120 260,200 180,200" fill="#2563EB" opacity="0.35" />
      <polygon points="200,180 200,160 220,160 220,140 240,140 240,120 260,120 260,200 180,200" stroke="#1D4ED8" strokeWidth="1.5" fill="none" opacity="0.6" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   9. SPIRITUAL: Sacred geometry mandala, lotus & cosmic dunes
   ───────────────────────────────────────────────────────────── */
function SpiritualDunes() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sprSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#EDE9FE" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#F5F3FF" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#sprSky)" />

      {/* Cosmic Dunes */}
      <path d="M0,175 Q160,115 330,175 T600,135 L600,360 L0,360 Z" fill="#DDD6FE" opacity="0.6" />
      <path d="M0,230 Q180,165 370,230 T600,185 L600,360 L0,360 Z" fill="#C4B5FD" opacity="0.55" />
      <path d="M0,285 Q150,220 330,285 T600,240 L600,360 L0,360 Z" fill="#A78BFA" opacity="0.45" />
    </svg>
  )
}

function SpiritualAccents() {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMaxYMin meet" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Mandala Rosette Sun (True Circles) */}
      <circle cx="230" cy="55" r="38" stroke="#8B5CF6" strokeWidth="0.8" strokeDasharray="3 3" fill="none" opacity="0.35" />
      <circle cx="230" cy="55" r="28" stroke="#8B5CF6" strokeWidth="1.2" fill="none" opacity="0.4" />
      <circle cx="230" cy="55" r="18" fill="#8B5CF6" opacity="0.85" />
      <circle cx="230" cy="30" r="3.5" fill="#A78BFA" opacity="0.7" />
      <circle cx="230" cy="80" r="3.5" fill="#A78BFA" opacity="0.7" />
      <circle cx="205" cy="55" r="3.5" fill="#A78BFA" opacity="0.7" />
      <circle cx="255" cy="55" r="3.5" fill="#A78BFA" opacity="0.7" />

      {/* Blooming Lotus Petals on Right */}
      <path d="M230,180 C216,155 216,135 230,118 C244,135 244,155 230,180 Z" fill="#A78BFA" opacity="0.75" />
      <path d="M230,180 C202,162 195,142 205,124 C222,138 226,155 230,180 Z" fill="#8B5CF6" opacity="0.65" />
      <path d="M230,180 C258,162 265,142 255,124 C238,138 234,155 230,180 Z" fill="#8B5CF6" opacity="0.65" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   10. COMEDY: Microphone, spotlights & smile arcs
   ───────────────────────────────────────────────────────────── */
function ComedyDunes() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cmdSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FEF9C3" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FEFCE8" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#cmdSky)" />

      {/* Crossed Spotlights */}
      <polygon points="40,0 120,0 280,360 120,360" fill="#FEF08A" opacity="0.45" />
      <polygon points="500,0 420,0 260,360 380,360" fill="#FEF08A" opacity="0.45" />

      {/* Smile Arcs */}
      <path d="M0,170 Q140,105 280,170 T600,130 L600,360 L0,360 Z" fill="#FEF08A" opacity="0.65" />
      <path d="M0,220 Q180,150 360,225 T600,180 L600,360 L0,360 Z" fill="#FDE047" opacity="0.6" />
      <path d="M0,275 Q150,205 320,275 T600,230 L600,360 L0,360 Z" fill="#FACC15" opacity="0.5" />
      <path d="M0,320 Q170,250 350,320 T600,275 L600,360 L0,360 Z" fill="#CA8A04" opacity="0.35" />
    </svg>
  )
}

function ComedyAccents() {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMaxYMin meet" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Cheerful Sun */}
      <circle cx="230" cy="55" r="24" fill="#EAB308" opacity="0.9" />

      {/* Vintage Standup Microphone on Right */}
      <ellipse cx="240" cy="125" rx="10" ry="14" fill="#CA8A04" opacity="0.75" />
      <ellipse cx="240" cy="125" rx="8" ry="12" fill="#EAB308" opacity="0.8" />
      <line x1="232" y1="125" x2="248" y2="125" stroke="#713F12" strokeWidth="1.5" opacity="0.8" />
      <path d="M227,128 C227,146 253,146 253,128" stroke="#713F12" strokeWidth="2.5" fill="none" opacity="0.8" />
      <line x1="240" y1="144" x2="240" y2="185" stroke="#713F12" strokeWidth="2.5" opacity="0.8" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   11. TECHNO: Synthwave perspective grid & sliced cyber sun
   ───────────────────────────────────────────────────────────── */
function TechnoDunes() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tckSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#CFFAFE" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ECFEFF" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#tckSky)" />

      {/* Horizon & Perspective Grid Lines */}
      <line x1="200" y1="180" x2="600" y2="180" stroke="#0891B2" strokeWidth="1.5" opacity="0.5" />
      <line x1="160" y1="200" x2="600" y2="200" stroke="#0891B2" strokeWidth="1.5" opacity="0.5" />
      <line x1="120" y1="230" x2="600" y2="230" stroke="#0891B2" strokeWidth="2" opacity="0.55" />
      <line x1="80" y1="270" x2="600" y2="270" stroke="#0891B2" strokeWidth="2" opacity="0.6" />
      <line x1="40" y1="320" x2="600" y2="320" stroke="#0891B2" strokeWidth="2.5" opacity="0.65" />
      <line x1="480" y1="180" x2="600" y2="360" stroke="#06B6D4" strokeWidth="2" opacity="0.6" />
      <line x1="480" y1="180" x2="480" y2="360" stroke="#06B6D4" strokeWidth="2" opacity="0.6" />
      <line x1="480" y1="180" x2="360" y2="360" stroke="#06B6D4" strokeWidth="2" opacity="0.6" />
      <line x1="480" y1="180" x2="240" y2="360" stroke="#06B6D4" strokeWidth="2" opacity="0.6" />
      <line x1="480" y1="180" x2="120" y2="360" stroke="#06B6D4" strokeWidth="2" opacity="0.6" />

      {/* Oscilloscope Waveform */}
      <path d="M0,170 L220,170 L235,140 L250,200 L265,130 L280,210 L295,150 L310,185 L325,170 L480,170" stroke="#0891B2" strokeWidth="3" fill="none" opacity="0.7" />

      {/* Cyber Wave Curves */}
      <path d="M0,230 Q160,170 340,230 T600,195 L600,360 L0,360 Z" fill="#A5F3FC" opacity="0.5" />
      <path d="M0,285 Q160,215 340,285 T600,240 L600,360 L0,360 Z" fill="#22D3EE" opacity="0.35" />
    </svg>
  )
}

function TechnoAccents() {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMaxYMin meet" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Sliced Synthwave Cyber Sun (True Circle) */}
      <circle cx="230" cy="55" r="26" fill="#06B6D4" opacity="0.85" />
      <line x1="202" y1="52" x2="258" y2="52" stroke="#ECFEFF" strokeWidth="2.5" />
      <line x1="205" y1="59" x2="255" y2="59" stroke="#ECFEFF" strokeWidth="2.5" />
      <line x1="212" y1="66" x2="248" y2="66" stroke="#ECFEFF" strokeWidth="2.5" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   12. INDIE: Cassette tape with ribbon, desert cacti & swallows
   ───────────────────────────────────────────────────────────── */
function IndieDunes() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="indSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FCE7F3" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FDF2F8" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#indSky)" />

      {/* Saguaro Cacti Silhouettes on Left */}
      <line x1="90" y1="210" x2="90" y2="280" stroke="#3F6E56" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
      <path d="M80,240 L80,225 L90,225" stroke="#3F6E56" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.8" />
      <path d="M100,248 L100,235 L90,235" stroke="#3F6E56" strokeWidth="3.5" strokeLinecap="round" fill="none" opacity="0.8" />

      {/* Boho Desert Dunes */}
      <path d="M0,165 Q140,110 290,160 T600,120 L600,360 L0,360 Z" fill="#A8717E" opacity="0.6" />
      <path d="M0,215 Q190,145 380,215 T600,170 L600,360 L0,360 Z" fill="#D49A70" opacity="0.65" />
      <path d="M0,270 Q160,195 340,270 T600,225 L600,360 L0,360 Z" fill="#C27D65" opacity="0.5" />
      <path d="M0,315 Q170,245 350,315 T600,270 L600,360 L0,360 Z" fill="#E6B5AD" opacity="0.4" />
    </svg>
  )
}

function IndieAccents() {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMaxYMin meet" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Dusty Boho Sun (True Circle) */}
      <circle cx="230" cy="55" r="24" fill="#D98E5E" opacity="0.9" />

      {/* Desert Swallows */}
      <path d="M140,40 Q148,34 156,40 Q164,34 172,40 Q164,38 156,42 Q148,38 140,40 Z" fill="#4A5568" opacity="0.6" />
      <path d="M115,52 Q121,46 128,52 Q134,46 141,52 Q134,50 128,54 Q121,50 115,52 Z" fill="#4A5568" opacity="0.5" />

      {/* Vintage Cassette Tape Silhouette on Right */}
      <rect x="180" y="115" width="95" height="58" rx="6" fill="#C27D65" opacity="0.7" />
      <rect x="190" y="123" width="75" height="30" rx="3" fill="#FDF2F8" opacity="0.85" />
      <circle cx="210" cy="138" r="7.5" fill="#A8717E" opacity="0.8" />
      <circle cx="210" cy="138" r="3" fill="#FDF2F8" />
      <circle cx="245" cy="138" r="7.5" fill="#A8717E" opacity="0.8" />
      <circle cx="245" cy="138" r="3" fill="#FDF2F8" />
      <path d="M225,173 C208,188 185,178 170,195" stroke="#78350F" strokeWidth="2" fill="none" opacity="0.75" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   13. GENERAL: Festive bunting garland, starbursts & celebration dunes
   ───────────────────────────────────────────────────────────── */
function GeneralDunes() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gnSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E0E7FF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#F8FAFC" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#gnSky)" />

      {/* Layered Harmonious Celebration Dunes */}
      <path d="M0,155 Q140,100 290,150 T600,115 L600,360 L0,360 Z" fill="#C7D2FE" opacity="0.6" />
      <path d="M0,200 Q180,140 370,205 T600,160 L600,360 L0,360 Z" fill="#A5B4FC" opacity="0.55" />
      <path d="M0,240 Q160,180 340,245 T600,210 L600,360 L0,360 Z" fill="#818CF8" opacity="0.5" />
      <path d="M0,285 Q150,230 320,290 T600,250 L600,360 L0,360 Z" fill="#6366F1" opacity="0.4" />
    </svg>
  )
}

function GeneralAccents() {
  return (
    <svg viewBox="0 0 300 200" preserveAspectRatio="xMaxYMin meet" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      {/* Festive Bunting Garland */}
      <path d="M60,20 Q160,45 280,15" stroke="#6366F1" strokeWidth="1.2" fill="none" opacity="0.5" />
      <polygon points="90,24 105,27 97,42" fill="#818CF8" opacity="0.75" />
      <polygon points="130,30 145,32 137,47" fill="#F59E0B" opacity="0.75" />
      <polygon points="170,34 185,35 177,50" fill="#EC4899" opacity="0.75" />
      <polygon points="210,35 225,33 217,48" fill="#10B981" opacity="0.75" />
      <polygon points="250,30 265,26 257,41" fill="#6366F1" opacity="0.75" />

      {/* Confetti Starbursts & Sun (True Circle) */}
      <circle cx="230" cy="75" r="22" fill="#6366F1" opacity="0.8" />
      <circle cx="60" cy="70" r="3.5" fill="#F59E0B" opacity="0.8" />
      <circle cx="80" cy="95" r="3" fill="#EC4899" opacity="0.75" />
      <circle cx="120" cy="80" r="4" fill="#10B981" opacity="0.7" />
    </svg>
  )
}
