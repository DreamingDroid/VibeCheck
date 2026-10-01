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
      {/* Dynamic Smooth-Curve Bohemian Minimalist SVG Landscape */}
      <div className="absolute inset-0 w-full h-full opacity-60 transition-all duration-700 ease-out group-hover:opacity-75 group-hover:scale-[1.02]">
        {cat === "adventure" && <AdventureCurves />}
        {cat === "music" && <MusicCurves />}
        {cat === "arts" && <ArtsCurves />}
        {cat === "nightlife" && <NightlifeCurves />}
        {cat === "sports" && <SportsCurves />}
        {cat === "food" && <FoodCurves />}
        {cat === "wellness" && <WellnessCurves />}
        {cat === "workshops" && <WorkshopsCurves />}
        {cat === "spiritual" && <SpiritualCurves />}
        {cat === "comedy" && <ComedyCurves />}
        {cat === "techno" && <TechnoCurves />}
        {cat === "indie" && <IndieCurves />}
        {cat === "general" && <GeneralCurves />}
      </div>

      {/* Strong legibility gradient overlay to guarantee 100% dark text contrast */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-white/35 sm:from-white/92 sm:via-white/75 sm:to-white/25 pointer-events-none z-[1]" />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────
   1. ADVENTURE: Mountain ridges, winding switchback trail, pines & soaring birds
   ───────────────────────────────────────────────────────────── */
function AdventureCurves() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="advSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E0F2E9" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#F2FBF6" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#advSky)" />
      
      {/* Soft Mountain Clouds */}
      <path d="M50,55 Q70,35 95,45 Q115,32 138,45 Q158,40 168,58 Q155,72 50,72 Z" fill="#FFFFFF" opacity="0.8" />
      
      {/* Rising Mountain Sun */}
      <circle cx="485" cy="65" r="32" fill="#E89B58" opacity="0.85" />
      
      {/* Soaring Eagles / Birds */}
      <path d="M360,45 Q370,37 380,45 Q390,37 400,45 Q390,42 380,48 Q370,42 360,45 Z" fill="#2A5C50" opacity="0.6" />
      <path d="M330,60 Q338,53 346,60 Q354,53 362,60 Q354,57 346,62 Q338,57 330,60 Z" fill="#2A5C50" opacity="0.5" />

      {/* Layer 1: Distant Jagged Peak */}
      <polygon points="180,180 290,90 380,180" fill="#F2B7A5" opacity="0.5" />
      <polygon points="340,190 440,80 540,190" fill="#F2B7A5" opacity="0.45" />

      {/* Layer 2: Mid Range Mountain Slopes */}
      <path d="M0,170 Q140,110 300,165 T600,120 L600,360 L0,360 Z" fill="#E48E70" opacity="0.55" />

      {/* Switchback Hiking Trail Ribbon */}
      <path d="M80,360 C150,290 260,280 340,240 C410,205 480,225 530,205 L555,218 C495,240 430,225 360,260 C280,300 180,310 120,360 Z" fill="#8DD3C7" opacity="0.8" />

      {/* Layer 3: Sage Green Rolling Foothills */}
      <path d="M0,230 Q160,170 350,235 T600,190 L600,360 L0,360 Z" fill="#5C9B88" opacity="0.6" />

      {/* Layer 4: Deep Forest Alpine Slopes */}
      <path d="M0,280 Q150,220 330,285 T600,240 L600,360 L0,360 Z" fill="#235E54" opacity="0.5" />

      {/* Pine Trees Silhouettes */}
      <polygon points="75,235 65,260 85,260" fill="#1B443B" opacity="0.8" />
      <polygon points="75,225 68,245 82,245" fill="#1B443B" opacity="0.85" />
      <rect x="73" y="260" width="4" height="8" fill="#1B443B" opacity="0.8" />

      <polygon points="120,205 110,232 130,232" fill="#235E54" opacity="0.85" />
      <polygon points="120,192 113,215 127,215" fill="#235E54" opacity="0.9" />
      <rect x="118" y="232" width="4" height="8" fill="#1B443B" opacity="0.85" />

      <polygon points="460,225 450,252 470,252" fill="#1B443B" opacity="0.85" />
      <polygon points="460,212 453,235 467,235" fill="#1B443B" opacity="0.9" />
      <rect x="458" y="252" width="4" height="8" fill="#1B443B" opacity="0.85" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   2. MUSIC: Large vinyl record, acoustic soundwaves & equalizer
   ───────────────────────────────────────────────────────────── */
function MusicCurves() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="musSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFFBEB" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#musSky)" />

      {/* Prominent Vinyl Record Disc Cutting in from Upper Right */}
      <circle cx="530" cy="110" r="115" fill="#78350F" opacity="0.12" />
      <circle cx="530" cy="110" r="95" stroke="#92400E" strokeWidth="1.5" fill="none" opacity="0.25" />
      <circle cx="530" cy="110" r="75" stroke="#B45309" strokeWidth="1.5" fill="none" opacity="0.35" />
      <circle cx="530" cy="110" r="55" stroke="#D97706" strokeWidth="2" fill="none" opacity="0.45" />
      <circle cx="530" cy="110" r="35" fill="#F59E0B" opacity="0.85" />
      <circle cx="530" cy="110" r="12" fill="#FEF3C7" opacity="0.95" />
      <circle cx="530" cy="110" r="4" fill="#78350F" opacity="0.9" />

      {/* Floating Melody Notes */}
      <circle cx="260" cy="75" r="4.5" fill="#92400E" opacity="0.75" />
      <path d="M264.5,75 L264.5,50 Q278,46 286,58" stroke="#92400E" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity="0.75" />

      <circle cx="310" cy="95" r="4" fill="#B45309" opacity="0.7" />
      <path d="M314,95 L314,72 Q326,69 332,79" stroke="#B45309" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.7" />

      {/* Resonant Harmonic Acoustic Wave Ribbons */}
      <path d="M-20,160 C120,110 240,190 380,140 C480,105 540,150 620,125 L620,360 L-20,360 Z" fill="#FDE68A" opacity="0.6" />
      <path d="M-20,210 C140,155 270,230 410,180 C510,140 560,195 620,165 L620,360 L-20,360 Z" fill="#FCA5A5" opacity="0.5" />

      {/* Melodic Staff Flowing Curves */}
      <path d="M0,235 C180,185 320,255 480,210 T620,195" stroke="#D97706" strokeWidth="2.5" fill="none" opacity="0.6" />
      <path d="M0,248 C180,198 320,268 480,223 T620,208" stroke="#D97706" strokeWidth="1.5" strokeDasharray="6 4" fill="none" opacity="0.5" />

      {/* Golden Base Resonance Dunes */}
      <path d="M0,270 C160,215 340,280 480,235 T600,220 L600,360 L0,360 Z" fill="#F59E0B" opacity="0.45" />
      <path d="M0,310 C180,260 360,320 500,275 T600,255 L600,360 L0,360 Z" fill="#B45309" opacity="0.35" />

      {/* Equalizer Frequency Graphic Bars */}
      <rect x="420" y="240" width="7" height="35" rx="3.5" fill="#B45309" opacity="0.6" />
      <rect x="434" y="220" width="7" height="55" rx="3.5" fill="#D97706" opacity="0.65" />
      <rect x="448" y="200" width="7" height="75" rx="3.5" fill="#F59E0B" opacity="0.7" />
      <rect x="462" y="230" width="7" height="45" rx="3.5" fill="#D97706" opacity="0.65" />
      <rect x="476" y="250" width="7" height="25" rx="3.5" fill="#B45309" opacity="0.6" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   3. ARTS & CULTURE: Grecian terracotta vase, artist palette & Matisse curves
   ───────────────────────────────────────────────────────────── */
function ArtsCurves() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="artSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F3E8FF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FAF5FF" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#artSky)" />

      {/* Bauhaus Arch & Semicircle Sun */}
      <path d="M430,110 A35,35 0 0,1 500,110 Z" fill="#E879F9" opacity="0.65" />
      <circle cx="465" cy="55" r="16" fill="#C084FC" opacity="0.65" />

      {/* Sculpted Grecian Terracotta Vase / Pottery Silhouette on Right */}
      <path d="M490,200 C490,175 480,165 495,145 C500,140 500,135 490,135 L530,135 C520,135 520,140 525,145 C540,165 530,175 530,200 C530,230 545,250 535,270 L485,270 C475,250 490,230 490,200 Z" fill="#A855F7" opacity="0.45" />
      {/* Vase Handle */}
      <path d="M485,160 C470,175 470,210 485,225" stroke="#9333EA" strokeWidth="3" fill="none" opacity="0.5" />

      {/* Flowing Painter's Palette Contour Curves */}
      <path d="M-20,150 C140,95 260,170 400,125 C500,90 560,140 620,115 L620,360 L-20,360 Z" fill="#DDD6FE" opacity="0.65" />
      <path d="M-20,205 C160,150 280,225 420,180 C520,140 560,190 620,165 L620,360 L-20,360 Z" fill="#FBCFE8" opacity="0.6" />

      {/* Matisse Organic Fluid Cut-out Shapes */}
      <path d="M120,240 C100,215 130,195 155,210 C180,225 160,265 135,260 Z" fill="#C084FC" opacity="0.5" />
      <circle cx="210" cy="235" r="12" fill="#F472B6" opacity="0.55" />
      <circle cx="235" cy="225" r="7" fill="#9333EA" opacity="0.55" />

      {/* Deep Violet Sculptural Foundation */}
      <path d="M0,260 Q180,200 360,260 T600,225 L600,360 L0,360 Z" fill="#C084FC" opacity="0.45" />
      <path d="M0,305 Q160,250 340,305 T600,265 L600,360 L0,360 Z" fill="#9333EA" opacity="0.35" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   4. NIGHTLIFE: Crescent moon, cocktail coupe, stars & city archways
   ───────────────────────────────────────────────────────────── */
function NightlifeCurves() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="niteSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E0E7FF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#EEF2FF" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#niteSky)" />

      {/* Glowing Crescent Moon & Midnight Sparkles */}
      <path d="M470,42 A22,22 0 0,0 492,64 A18,18 0 1,1 470,42 Z" fill="#6366F1" opacity="0.9" />
      
      {/* 4-point Sparkle Stars */}
      <path d="M360,45 L363,53 L371,55 L363,57 L360,65 L357,57 L349,55 L357,53 Z" fill="#818CF8" opacity="0.8" />
      <path d="M410,75 L412,81 L418,82 L412,84 L410,90 L408,84 L402,82 L408,81 Z" fill="#818CF8" opacity="0.7" />
      <path d="M530,48 L531.5,53 L536,54 L531.5,55 L530,60 L528.5,55 L524,54 L528.5,53 Z" fill="#A5B4FC" opacity="0.75" />

      {/* Sleek Cocktail Coupe Silhouette on Right */}
      <path d="M495,190 Q515,225 515,245 L513,275 L505,275 L505,278 L525,278 L525,275 L517,275 L515,245 Q515,225 535,190 Z" fill="#6366F1" opacity="0.5" />
      {/* Champagne Bubbles */}
      <circle cx="510" cy="180" r="3" fill="#818CF8" opacity="0.7" />
      <circle cx="518" cy="172" r="2" fill="#818CF8" opacity="0.8" />
      <circle cx="514" cy="160" r="3.5" fill="#A5B4FC" opacity="0.6" />

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

/* ─────────────────────────────────────────────────────────────
   5. SPORTS: Curving running track lanes, speed chevrons & kinetic sunrise
   ───────────────────────────────────────────────────────────── */
function SportsCurves() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sptSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFEDD5" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFF7ED" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#sptSky)" />

      {/* Kinetic Speed Sunrise */}
      <circle cx="485" cy="75" r="32" fill="#F97316" opacity="0.9" />
      <line x1="390" y1="65" x2="435" y2="65" stroke="#FB923C" strokeWidth="3" strokeLinecap="round" opacity="0.65" />
      <line x1="405" y1="82" x2="445" y2="82" stroke="#FB923C" strokeWidth="3" strokeLinecap="round" opacity="0.65" />

      {/* Curving Running Track Lanes Swooping Diagonally */}
      {/* Lane 1 Outer Ribbon */}
      <path d="M-40,280 C160,180 340,160 640,110 L640,160 C340,210 160,230 -40,330 Z" fill="#EA580C" opacity="0.3" />
      {/* Lane 2 Ribbon */}
      <path d="M-40,330 C160,230 340,210 640,160 L640,210 C340,260 160,280 -40,380 Z" fill="#C2410C" opacity="0.3" />

      {/* Dashed Track Lane Separation Lines */}
      <path d="M-40,280 C160,180 340,160 640,110" stroke="#FFF7ED" strokeWidth="3" strokeDasharray="16 10" fill="none" opacity="0.85" />
      <path d="M-40,330 C160,230 340,210 640,160" stroke="#FFF7ED" strokeWidth="3" strokeDasharray="16 10" fill="none" opacity="0.85" />

      {/* Dynamic Chevrons of Momentum */}
      <path d="M470,180 L490,195 L470,210" stroke="#FB923C" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />
      <path d="M500,170 L520,185 L500,200" stroke="#FB923C" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.7" />

      {/* Aerodynamic Velocity Hill Curves */}
      <path d="M0,180 Q180,120 360,175 T600,135 L600,360 L0,360 Z" fill="#FED7AA" opacity="0.6" />
      <path d="M0,230 Q200,165 400,230 T600,185 L600,360 L0,360 Z" fill="#FDBA74" opacity="0.55" />
      <path d="M0,285 Q170,225 350,290 T600,245 L600,360 L0,360 Z" fill="#EA580C" opacity="0.4" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   6. FOOD & DRINK: Wine glass silhouette, grape clusters, steam spirals & vineyard terraces
   ───────────────────────────────────────────────────────────── */
function FoodCurves() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="fdSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFE4E6" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FFF1F2" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#fdSky)" />

      {/* Warm Rose Sun */}
      <circle cx="485" cy="75" r="30" fill="#F43F5E" opacity="0.85" />
      
      {/* S-curve Aromatic Culinary Steam Spirals */}
      <path d="M380,105 Q395,75 375,50 Q390,25 410,20" stroke="#FB7185" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M410,110 Q425,80 405,55 Q420,30 440,25" stroke="#FB7185" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.6" />
      <path d="M440,115 Q455,85 435,60 Q450,35 470,30" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />

      {/* Stemmed Wine Glass Silhouette on Right */}
      <path d="M510,165 Q510,205 530,205 Q550,205 550,165 Z" fill="#E11D48" opacity="0.55" />
      <line x1="530" y1="205" x2="530" y2="245" stroke="#BE123C" strokeWidth="3" opacity="0.7" />
      <ellipse cx="530" cy="245" rx="14" ry="4" fill="#BE123C" opacity="0.7" />

      {/* Cascading Grape Cluster Dots */}
      <circle cx="480" cy="180" r="5.5" fill="#9F1239" opacity="0.7" />
      <circle cx="492" cy="180" r="5.5" fill="#9F1239" opacity="0.7" />
      <circle cx="486" cy="190" r="5" fill="#BE123C" opacity="0.75" />
      <circle cx="496" cy="190" r="5" fill="#BE123C" opacity="0.75" />
      <circle cx="491" cy="200" r="4.5" fill="#E11D48" opacity="0.8" />

      {/* Tuscan Terraced Vineyard Slopes */}
      <path d="M0,170 Q160,115 330,165 T600,130 L600,360 L0,360 Z" fill="#FECDD3" opacity="0.65" />
      <path d="M0,220 Q190,155 380,220 T600,180 L600,360 L0,360 Z" fill="#FDA4AF" opacity="0.6" />
      <path d="M0,275 Q160,200 340,270 T600,230 L600,360 L0,360 Z" fill="#FB7185" opacity="0.45" />
      <path d="M0,315 Q150,250 320,315 T600,270 L600,360 L0,360 Z" fill="#E11D48" opacity="0.35" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   7. WELLNESS: Zen water ripples, pebble cairn tower & bamboo shoots
   ───────────────────────────────────────────────────────────── */
function WellnessCurves() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wllSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#CCFBF1" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#F0FDFA" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#wllSky)" />

      {/* Radiant Zen Sun with Expanding Light Rings */}
      <circle cx="485" cy="75" r="48" fill="#2DD4BF" opacity="0.2" />
      <circle cx="485" cy="75" r="30" fill="#14B8A6" opacity="0.85" />

      {/* Concentric Zen Water Ripples */}
      <ellipse cx="360" cy="220" rx="90" ry="18" stroke="#14B8A6" strokeWidth="1.5" fill="none" opacity="0.4" />
      <ellipse cx="360" cy="220" rx="60" ry="12" stroke="#14B8A6" strokeWidth="1.5" fill="none" opacity="0.5" />
      <ellipse cx="360" cy="220" rx="30" ry="6" stroke="#0D9488" strokeWidth="2" fill="none" opacity="0.6" />

      {/* Stacked River Stone Pebble Cairn (Zen Tower) on Right */}
      <ellipse cx="510" cy="275" rx="30" ry="10" fill="#0F766E" opacity="0.75" />
      <ellipse cx="510" cy="258" rx="23" ry="8" fill="#115E59" opacity="0.8" />
      <ellipse cx="510" cy="244" rx="16" ry="6" fill="#134E4A" opacity="0.85" />
      <ellipse cx="510" cy="233" rx="10" ry="4" fill="#042F2E" opacity="0.9" />

      {/* Bamboo Shoots Rising on Left */}
      <line x1="80" y1="120" x2="80" y2="360" stroke="#0D9488" strokeWidth="3.5" strokeLinecap="round" opacity="0.6" />
      <line x1="80" y1="160" x2="80" y2="162" stroke="#042F2E" strokeWidth="6" opacity="0.7" />
      <line x1="80" y1="210" x2="80" y2="212" stroke="#042F2E" strokeWidth="6" opacity="0.7" />
      <path d="M80,160 Q105,150 115,135" stroke="#14B8A6" strokeWidth="2" fill="none" opacity="0.7" />
      <ellipse cx="115" cy="135" rx="10" ry="3.5" transform="rotate(-30 115 135)" fill="#14B8A6" opacity="0.7" />

      {/* Calm Water Dunes */}
      <path d="M0,180 Q170,125 340,175 T600,140 L600,360 L0,360 Z" fill="#99F6E4" opacity="0.6" />
      <path d="M0,230 Q160,170 330,230 T600,190 L600,360 L0,360 Z" fill="#5EEAD4" opacity="0.55" />
      <path d="M0,280 Q180,215 360,285 T600,240 L600,360 L0,360 Z" fill="#2DD4BF" opacity="0.45" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   8. WORKSHOPS: Glowing idea bulb, growth staircase & blueprint curves
   ───────────────────────────────────────────────────────────── */
function WorkshopsCurves() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="wrkSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#DBEAFE" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#EFF6FF" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#wrkSky)" />

      {/* Glowing Idea Bulb Silhouette in Top Right */}
      <circle cx="485" cy="75" r="28" fill="#3B82F6" opacity="0.85" />
      {/* Filament Rays */}
      <line x1="485" y1="35" x2="485" y2="22" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <line x1="518" y1="46" x2="528" y2="36" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <line x1="452" y1="46" x2="442" y2="36" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <line x1="525" y1="75" x2="538" y2="75" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
      <line x1="445" y1="75" x2="432" y2="75" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />

      {/* Isometric Stepped Staircase of Learning / Growth on Right */}
      <polygon points="400,280 430,280 430,250 460,250 460,220 490,220 490,190 520,190 520,360 400,360" fill="#2563EB" opacity="0.35" />
      <polygon points="430,280 430,250 460,250 460,220 490,220 490,190 520,190 520,360 400,360" stroke="#1D4ED8" strokeWidth="2" fill="none" opacity="0.6" />

      {/* Stepped Blueprint Knowledge Wave Contours */}
      <path d="M-20,155 Q150,95 320,145 T620,115 L620,360 L-20,360 Z" fill="#BFDBFE" opacity="0.6" />
      <path d="M0,215 Q190,150 380,215 T600,175 L600,360 L0,360 Z" fill="#93C5FD" opacity="0.55" />
      <path d="M0,270 Q160,200 340,270 T600,225 L600,360 L0,360 Z" fill="#60A5FA" opacity="0.45" />
      <path d="M0,315 Q180,250 360,315 T600,270 L600,360 L0,360 Z" fill="#2563EB" opacity="0.35" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   9. SPIRITUAL: Sacred geometry mandala, blooming lotus & incense swirl
   ───────────────────────────────────────────────────────────── */
function SpiritualCurves() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sprSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#EDE9FE" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#F5F3FF" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#sprSky)" />

      {/* Sacred Geometry Mandala Rosette Sun in Upper Right */}
      <circle cx="485" cy="75" r="52" stroke="#8B5CF6" strokeWidth="1" strokeDasharray="4 4" fill="none" opacity="0.35" />
      <circle cx="485" cy="75" r="40" stroke="#8B5CF6" strokeWidth="1.5" fill="none" opacity="0.4" />
      <circle cx="485" cy="75" r="26" fill="#8B5CF6" opacity="0.85" />
      {/* 8 radiating mini petals */}
      <circle cx="485" cy="42" r="5" fill="#A78BFA" opacity="0.7" />
      <circle cx="485" cy="108" r="5" fill="#A78BFA" opacity="0.7" />
      <circle cx="452" cy="75" r="5" fill="#A78BFA" opacity="0.7" />
      <circle cx="518" cy="75" r="5" fill="#A78BFA" opacity="0.7" />

      {/* Prominent Blooming Multi-Petal Lotus on Right */}
      {/* Center Petal */}
      <path d="M485,260 C465,225 465,195 485,170 C505,195 505,225 485,260 Z" fill="#A78BFA" opacity="0.75" />
      {/* Left Petal */}
      <path d="M485,260 C445,235 435,205 450,180 C475,200 480,225 485,260 Z" fill="#8B5CF6" opacity="0.65" />
      {/* Right Petal */}
      <path d="M485,260 C525,235 535,205 520,180 C495,200 490,225 485,260 Z" fill="#8B5CF6" opacity="0.65" />
      {/* Outer Petals */}
      <path d="M485,260 C420,245 410,220 425,200 C450,220 470,240 485,260 Z" fill="#7C3AED" opacity="0.5" />
      <path d="M485,260 C550,245 560,220 545,200 C520,220 500,240 485,260 Z" fill="#7C3AED" opacity="0.5" />

      {/* Ethereal Swirling Incense Smoke Ribbon */}
      <path d="M380,270 Q400,210 370,160 T410,70" stroke="#C4B5FD" strokeWidth="2.5" fill="none" opacity="0.6" />

      {/* Cosmic Violet Dunes */}
      <path d="M0,175 Q160,115 330,175 T600,135 L600,360 L0,360 Z" fill="#DDD6FE" opacity="0.6" />
      <path d="M0,230 Q180,165 370,230 T600,185 L600,360 L0,360 Z" fill="#C4B5FD" opacity="0.55" />
      <path d="M0,285 Q150,220 330,285 T600,240 L600,360 L0,360 Z" fill="#A78BFA" opacity="0.45" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   10. COMEDY: Vintage chrome microphone, criss-cross spotlights & smile arcs
   ───────────────────────────────────────────────────────────── */
function ComedyCurves() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cmdSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FEF9C3" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FEFCE8" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#cmdSky)" />

      {/* Cheerful Sun */}
      <circle cx="485" cy="75" r="30" fill="#EAB308" opacity="0.9" />

      {/* Crossed Theatrical Spotlight Cones */}
      <polygon points="40,0 120,0 280,360 120,360" fill="#FEF08A" opacity="0.45" />
      <polygon points="500,0 420,0 260,360 380,360" fill="#FEF08A" opacity="0.45" />

      {/* Vintage Chrome Standup Microphone on Right */}
      <ellipse cx="500" cy="180" rx="14" ry="20" fill="#CA8A04" opacity="0.75" />
      <ellipse cx="500" cy="180" rx="12" ry="18" fill="#EAB308" opacity="0.8" />
      <line x1="488" y1="180" x2="512" y2="180" stroke="#713F12" strokeWidth="2" opacity="0.8" />
      <line x1="490" y1="172" x2="510" y2="172" stroke="#713F12" strokeWidth="1.5" opacity="0.8" />
      <line x1="490" y1="188" x2="510" y2="188" stroke="#713F12" strokeWidth="1.5" opacity="0.8" />
      {/* Mic U-mount & Stand */}
      <path d="M482,185 C482,210 518,210 518,185" stroke="#713F12" strokeWidth="3" fill="none" opacity="0.8" />
      <line x1="500" y1="205" x2="500" y2="270" stroke="#713F12" strokeWidth="3.5" opacity="0.8" />

      {/* Joyful Bouncy Smile Wave Arcs */}
      <path d="M0,170 Q140,105 280,170 T600,130 L600,360 L0,360 Z" fill="#FEF08A" opacity="0.65" />
      <path d="M0,220 Q180,150 360,225 T600,180 L600,360 L0,360 Z" fill="#FDE047" opacity="0.6" />
      <path d="M0,275 Q150,205 320,275 T600,230 L600,360 L0,360 Z" fill="#FACC15" opacity="0.5" />
      <path d="M0,320 Q170,250 350,320 T600,275 L600,360 L0,360 Z" fill="#CA8A04" opacity="0.35" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   11. TECHNO: Synthwave perspective grid, sliced cyber sun & audio waveform
   ───────────────────────────────────────────────────────────── */
function TechnoCurves() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="tckSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#CFFAFE" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#ECFEFF" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#tckSky)" />

      {/* Sliced Synthwave Cyber Sun */}
      <circle cx="485" cy="75" r="32" fill="#06B6D4" opacity="0.85" />
      <line x1="450" y1="72" x2="520" y2="72" stroke="#ECFEFF" strokeWidth="3" />
      <line x1="454" y1="81" x2="516" y2="81" stroke="#ECFEFF" strokeWidth="3" />
      <line x1="462" y1="90" x2="508" y2="90" stroke="#ECFEFF" strokeWidth="3" />

      {/* Synthwave 3D Perspective Grid Vanishing to Center Right Horizon */}
      {/* Horizon Line */}
      <line x1="200" y1="180" x2="600" y2="180" stroke="#0891B2" strokeWidth="1.5" opacity="0.5" />
      {/* Horizontal Perspective Grid Lines */}
      <line x1="160" y1="200" x2="600" y2="200" stroke="#0891B2" strokeWidth="1.5" opacity="0.5" />
      <line x1="120" y1="230" x2="600" y2="230" stroke="#0891B2" strokeWidth="2" opacity="0.55" />
      <line x1="80" y1="270" x2="600" y2="270" stroke="#0891B2" strokeWidth="2" opacity="0.6" />
      <line x1="40" y1="320" x2="600" y2="320" stroke="#0891B2" strokeWidth="2.5" opacity="0.65" />
      {/* Perspective Vanishing Lines */}
      <line x1="480" y1="180" x2="600" y2="360" stroke="#06B6D4" strokeWidth="2" opacity="0.6" />
      <line x1="480" y1="180" x2="480" y2="360" stroke="#06B6D4" strokeWidth="2" opacity="0.6" />
      <line x1="480" y1="180" x2="360" y2="360" stroke="#06B6D4" strokeWidth="2" opacity="0.6" />
      <line x1="480" y1="180" x2="240" y2="360" stroke="#06B6D4" strokeWidth="2" opacity="0.6" />
      <line x1="480" y1="180" x2="120" y2="360" stroke="#06B6D4" strokeWidth="2" opacity="0.6" />

      {/* Oscilloscope Digital Audio Pulse Waveform */}
      <path d="M0,170 L220,170 L235,140 L250,200 L265,130 L280,210 L295,150 L310,185 L325,170 L480,170" stroke="#0891B2" strokeWidth="3" fill="none" opacity="0.7" />

      {/* Cyber Wave Curves */}
      <path d="M0,230 Q160,170 340,230 T600,195 L600,360 L0,360 Z" fill="#A5F3FC" opacity="0.5" />
      <path d="M0,285 Q160,215 340,285 T600,240 L600,360 L0,360 Z" fill="#22D3EE" opacity="0.35" />
    </svg>
  )
}

/* ─────────────────────────────────────────────────────────────
   12. INDIE: Vintage cassette tape with ribbon, desert cacti & swallows
   ───────────────────────────────────────────────────────────── */
function IndieCurves() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="indSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FCE7F3" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#FDF2F8" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#indSky)" />

      {/* Dusty Boho Sun */}
      <circle cx="485" cy="75" r="30" fill="#D98E5E" opacity="0.9" />

      {/* Desert Swallows */}
      <path d="M360,50 Q370,42 380,50 Q390,42 400,50 Q390,47 380,53 Q370,47 360,50 Z" fill="#4A5568" opacity="0.6" />
      <path d="M330,65 Q338,58 346,65 Q354,58 362,65 Q354,62 346,67 Q338,62 330,65 Z" fill="#4A5568" opacity="0.5" />

      {/* Vintage Cassette Tape Silhouette on Right */}
      <rect x="420" y="160" width="130" height="80" rx="8" fill="#C27D65" opacity="0.7" />
      <rect x="435" y="172" width="100" height="40" rx="4" fill="#FDF2F8" opacity="0.85" />
      {/* Tape Spool Wheels */}
      <circle cx="460" cy="192" r="10" fill="#A8717E" opacity="0.8" />
      <circle cx="460" cy="192" r="4" fill="#FDF2F8" />
      <circle cx="510" cy="192" r="10" fill="#A8717E" opacity="0.8" />
      <circle cx="510" cy="192" r="4" fill="#FDF2F8" />
      {/* Unfurling Magnetic Tape Ribbon Loop */}
      <path d="M485,240 C460,265 430,250 410,275 C390,300 370,285 340,300" stroke="#78350F" strokeWidth="3" fill="none" opacity="0.75" />

      {/* Saguaro Cacti Silhouettes */}
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

/* ─────────────────────────────────────────────────────────────
   13. GENERAL: Festive bunting garland, confetti starbursts & harmonious dunes
   ───────────────────────────────────────────────────────────── */
function GeneralCurves() {
  return (
    <svg viewBox="0 0 600 360" preserveAspectRatio="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gnSky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#E0E7FF" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#F8FAFC" stopOpacity="0.25" />
        </linearGradient>
      </defs>
      <rect width="600" height="360" fill="url(#gnSky)" />

      {/* Festive Bunting Garland String Across Top Right */}
      <path d="M280,25 Q420,55 580,20" stroke="#6366F1" strokeWidth="1.5" fill="none" opacity="0.5" />
      {/* Hanging Pennant Flags */}
      <polygon points="320,31 340,34 330,52" fill="#818CF8" opacity="0.75" />
      <polygon points="370,38 390,40 380,58" fill="#F59E0B" opacity="0.75" />
      <polygon points="420,43 440,44 430,62" fill="#EC4899" opacity="0.75" />
      <polygon points="470,44 490,42 480,60" fill="#10B981" opacity="0.75" />
      <polygon points="520,38 540,33 530,52" fill="#6366F1" opacity="0.75" />

      {/* Festive Confetti Circles & Starbursts */}
      <circle cx="485" cy="95" r="28" fill="#6366F1" opacity="0.8" />
      <circle cx="260" cy="85" r="4.5" fill="#F59E0B" opacity="0.8" />
      <circle cx="285" cy="115" r="3.5" fill="#EC4899" opacity="0.75" />
      <circle cx="340" cy="100" r="5" fill="#10B981" opacity="0.7" />

      {/* Layered Harmonious Celebration Dunes */}
      <path d="M0,155 Q140,100 290,150 T600,115 L600,360 L0,360 Z" fill="#C7D2FE" opacity="0.6" />
      <path d="M0,200 Q180,140 370,205 T600,160 L600,360 L0,360 Z" fill="#A5B4FC" opacity="0.55" />
      <path d="M0,240 Q160,180 340,245 T600,210 L600,360 L0,360 Z" fill="#818CF8" opacity="0.5" />
      <path d="M0,285 Q150,230 320,290 T600,250 L600,360 L0,360 Z" fill="#6366F1" opacity="0.4" />
    </svg>
  )
}
