"use client"

import { useTheme } from "@/context/ThemeContext"
import {
  Music, Headphones, Mic2,
  Palette, PenTool, Brush,
  Trophy, Dumbbell, Medal,
  Wine, UtensilsCrossed, ChefHat,
  Zap, Flame,
  BookOpen, GraduationCap, Lightbulb,
  Compass, Sun, Moon,
  Heart, Leaf, Droplets,
  Smile, PartyPopper, Drama,
  Sparkles, Globe, Gem, Mountain, Footprints, Trees, Briefcase
} from "lucide-react"

type IconPlacement = {
  icon: React.ReactNode
  top?: string
  bottom?: string
  left?: string
  right?: string
  rotate: string
  animation: string
  size: string
}

type CategoryConfig = {
  floatingIcons: IconPlacement[]
  accentIcon: React.ReactNode
  accentColor: string
  badgeBg: string
  badgeText: string
}

const ICON_SIZE_SM = "h-4 w-4"
const ICON_SIZE_MD = "h-5 w-5"
const ICON_SIZE_ACCENT = "h-7 w-7"

const categoryConfigs: Record<string, CategoryConfig> = {
  General: {
    floatingIcons: [
      { icon: <Sparkles className={ICON_SIZE_SM} />, top: "12%", right: "16%", rotate: "-10deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <Globe className={ICON_SIZE_MD} />, top: "38%", right: "8%", rotate: "12deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Gem className={ICON_SIZE_SM} />, bottom: "28%", right: "22%", rotate: "-18deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Sparkles className={ICON_SIZE_ACCENT} />,
    accentColor: "#6366F1",
    badgeBg: "bg-indigo-600",
    badgeText: "text-white",
  },
  Adventure: {
    floatingIcons: [
      { icon: <Mountain className={ICON_SIZE_SM} />, top: "14%", right: "16%", rotate: "-10deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <Footprints className={ICON_SIZE_MD} />, top: "38%", right: "8%", rotate: "15deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Trees className={ICON_SIZE_SM} />, bottom: "32%", right: "24%", rotate: "-20deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Mountain className={ICON_SIZE_ACCENT} />,
    accentColor: "#10B981",
    badgeBg: "bg-emerald-600",
    badgeText: "text-white",
  },
  Music: {
    floatingIcons: [
      { icon: <Music className={ICON_SIZE_SM} />, top: "12%", right: "18%", rotate: "-15deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <Headphones className={ICON_SIZE_MD} />, top: "35%", right: "8%", rotate: "10deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Mic2 className={ICON_SIZE_SM} />, bottom: "30%", right: "22%", rotate: "20deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Music className={ICON_SIZE_ACCENT} />,
    accentColor: "#F59E0B",
    badgeBg: "bg-amber-400",
    badgeText: "text-black",
  },
  Nightlife: {
    floatingIcons: [
      { icon: <Wine className={ICON_SIZE_SM} />, top: "12%", right: "18%", rotate: "-10deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <PartyPopper className={ICON_SIZE_MD} />, top: "38%", right: "10%", rotate: "15deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Flame className={ICON_SIZE_SM} />, bottom: "30%", right: "22%", rotate: "-15deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Wine className={ICON_SIZE_ACCENT} />,
    accentColor: "#6366F1",
    badgeBg: "bg-indigo-600",
    badgeText: "text-white",
  },
  "Arts & Culture": {
    floatingIcons: [
      { icon: <Palette className={ICON_SIZE_SM} />, top: "15%", right: "15%", rotate: "12deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <PenTool className={ICON_SIZE_MD} />, top: "40%", right: "10%", rotate: "-8deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Brush className={ICON_SIZE_SM} />, bottom: "28%", right: "20%", rotate: "25deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Palette className={ICON_SIZE_ACCENT} />,
    accentColor: "#A855F7",
    badgeBg: "bg-purple-600",
    badgeText: "text-white",
  },
  Arts: {
    floatingIcons: [
      { icon: <Palette className={ICON_SIZE_SM} />, top: "15%", right: "15%", rotate: "12deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <PenTool className={ICON_SIZE_MD} />, top: "40%", right: "10%", rotate: "-8deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Brush className={ICON_SIZE_SM} />, bottom: "28%", right: "20%", rotate: "25deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Palette className={ICON_SIZE_ACCENT} />,
    accentColor: "#A855F7",
    badgeBg: "bg-purple-600",
    badgeText: "text-white",
  },
  Sports: {
    floatingIcons: [
      { icon: <Trophy className={ICON_SIZE_SM} />, top: "14%", right: "16%", rotate: "-10deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <Dumbbell className={ICON_SIZE_MD} />, top: "38%", right: "8%", rotate: "15deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Medal className={ICON_SIZE_SM} />, bottom: "32%", right: "24%", rotate: "-20deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Trophy className={ICON_SIZE_ACCENT} />,
    accentColor: "#F97316",
    badgeBg: "bg-orange-500",
    badgeText: "text-white",
  },
  "Food & Drink": {
    floatingIcons: [
      { icon: <Wine className={ICON_SIZE_SM} />, top: "12%", right: "20%", rotate: "8deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <UtensilsCrossed className={ICON_SIZE_MD} />, top: "36%", right: "10%", rotate: "-12deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <ChefHat className={ICON_SIZE_SM} />, bottom: "30%", right: "18%", rotate: "18deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <UtensilsCrossed className={ICON_SIZE_ACCENT} />,
    accentColor: "#F43F5E",
    badgeBg: "bg-rose-500",
    badgeText: "text-white",
  },
  Food: {
    floatingIcons: [
      { icon: <Wine className={ICON_SIZE_SM} />, top: "12%", right: "20%", rotate: "8deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <UtensilsCrossed className={ICON_SIZE_MD} />, top: "36%", right: "10%", rotate: "-12deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <ChefHat className={ICON_SIZE_SM} />, bottom: "30%", right: "18%", rotate: "18deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <UtensilsCrossed className={ICON_SIZE_ACCENT} />,
    accentColor: "#F43F5E",
    badgeBg: "bg-rose-500",
    badgeText: "text-white",
  },
  Wellness: {
    floatingIcons: [
      { icon: <Heart className={ICON_SIZE_SM} />, top: "14%", right: "16%", rotate: "-10deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <Leaf className={ICON_SIZE_MD} />, top: "40%", right: "8%", rotate: "8deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Droplets className={ICON_SIZE_SM} />, bottom: "28%", right: "22%", rotate: "16deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Leaf className={ICON_SIZE_ACCENT} />,
    accentColor: "#14B8A6",
    badgeBg: "bg-teal-600",
    badgeText: "text-white",
  },
  Workshops: {
    floatingIcons: [
      { icon: <Briefcase className={ICON_SIZE_SM} />, top: "14%", right: "16%", rotate: "-8deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <Lightbulb className={ICON_SIZE_MD} />, top: "40%", right: "8%", rotate: "10deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <BookOpen className={ICON_SIZE_SM} />, bottom: "28%", right: "22%", rotate: "-18deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Lightbulb className={ICON_SIZE_ACCENT} />,
    accentColor: "#2563EB",
    badgeBg: "bg-blue-600",
    badgeText: "text-white",
  },
  Education: {
    floatingIcons: [
      { icon: <BookOpen className={ICON_SIZE_SM} />, top: "14%", right: "16%", rotate: "-8deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <GraduationCap className={ICON_SIZE_MD} />, top: "40%", right: "8%", rotate: "10deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Lightbulb className={ICON_SIZE_SM} />, bottom: "28%", right: "22%", rotate: "-18deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <BookOpen className={ICON_SIZE_ACCENT} />,
    accentColor: "#3B82F6",
    badgeBg: "bg-blue-600",
    badgeText: "text-white",
  },
  Spiritual: {
    floatingIcons: [
      { icon: <Compass className={ICON_SIZE_SM} />, top: "15%", right: "18%", rotate: "12deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <Sun className={ICON_SIZE_MD} />, top: "38%", right: "10%", rotate: "-6deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Moon className={ICON_SIZE_SM} />, bottom: "30%", right: "20%", rotate: "22deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Compass className={ICON_SIZE_ACCENT} />,
    accentColor: "#8B5CF6",
    badgeBg: "bg-violet-600",
    badgeText: "text-white",
  },
  Comedy: {
    floatingIcons: [
      { icon: <Smile className={ICON_SIZE_SM} />, top: "12%", right: "18%", rotate: "10deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <PartyPopper className={ICON_SIZE_MD} />, top: "38%", right: "10%", rotate: "-14deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Drama className={ICON_SIZE_SM} />, bottom: "30%", right: "20%", rotate: "18deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Smile className={ICON_SIZE_ACCENT} />,
    accentColor: "#EAB308",
    badgeBg: "bg-amber-400",
    badgeText: "text-black",
  },
  Techno: {
    floatingIcons: [
      { icon: <Zap className={ICON_SIZE_SM} />, top: "14%", right: "16%", rotate: "-10deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <Flame className={ICON_SIZE_MD} />, top: "40%", right: "8%", rotate: "12deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Sparkles className={ICON_SIZE_SM} />, bottom: "28%", right: "22%", rotate: "-15deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Zap className={ICON_SIZE_ACCENT} />,
    accentColor: "#06B6D4",
    badgeBg: "bg-cyan-500",
    badgeText: "text-slate-950",
  },
  Indie: {
    floatingIcons: [
      { icon: <Heart className={ICON_SIZE_SM} />, top: "14%", right: "16%", rotate: "-10deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <Sparkles className={ICON_SIZE_MD} />, top: "38%", right: "8%", rotate: "15deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Gem className={ICON_SIZE_SM} />, bottom: "28%", right: "22%", rotate: "-15deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Heart className={ICON_SIZE_ACCENT} />,
    accentColor: "#EC4899",
    badgeBg: "bg-pink-500",
    badgeText: "text-white",
  },
}

const defaultConfig: CategoryConfig = {
  floatingIcons: [
    { icon: <Sparkles className={ICON_SIZE_SM} />, top: "14%", right: "16%", rotate: "-8deg", animation: "float-gentle", size: ICON_SIZE_SM },
    { icon: <Globe className={ICON_SIZE_MD} />, top: "40%", right: "8%", rotate: "10deg", animation: "float-slow", size: ICON_SIZE_MD },
    { icon: <Gem className={ICON_SIZE_SM} />, bottom: "28%", right: "22%", rotate: "15deg", animation: "float-drift", size: ICON_SIZE_SM },
  ],
  accentIcon: <Sparkles className={ICON_SIZE_ACCENT} />,
  accentColor: "#6366F1",
  badgeBg: "bg-indigo-600",
  badgeText: "text-white",
}

function findCategoryConfig(category: string): CategoryConfig {
  if (!category) return defaultConfig
  const norm = category.trim().toLowerCase()
  for (const [key, val] of Object.entries(categoryConfigs)) {
    if (key.toLowerCase() === norm) return val
  }
  if (norm.includes("music") || norm.includes("gig") || norm.includes("concert")) return categoryConfigs.Music
  if (norm.includes("art") || norm.includes("craft") || norm.includes("paint") || norm.includes("culture")) return categoryConfigs["Arts & Culture"]
  if (norm.includes("sport") || norm.includes("fitness") || norm.includes("run")) return categoryConfigs.Sports
  if (norm.includes("adventure") || norm.includes("trek") || norm.includes("camp") || norm.includes("nature")) return categoryConfigs.Adventure
  if (norm.includes("food") || norm.includes("dining") || norm.includes("drink") || norm.includes("culinary")) return categoryConfigs["Food & Drink"]
  if (norm.includes("techno") || norm.includes("electronic") || norm.includes("tech") || norm.includes("cyber")) return categoryConfigs.Techno
  if (norm.includes("indie") || norm.includes("acoustic")) return categoryConfigs.Indie
  if (norm.includes("workshop") || norm.includes("education") || norm.includes("learn") || norm.includes("bootcamp")) return categoryConfigs.Workshops
  if (norm.includes("spiritual") || norm.includes("meditat") || norm.includes("mindful")) return categoryConfigs.Spiritual
  if (norm.includes("wellness") || norm.includes("health") || norm.includes("yoga")) return categoryConfigs.Wellness
  if (norm.includes("comedy") || norm.includes("standup") || norm.includes("humor")) return categoryConfigs.Comedy
  if (norm.includes("nightlife") || norm.includes("club") || norm.includes("party")) return categoryConfigs.Nightlife
  return categoryConfigs.General || defaultConfig
}

/**
 * Renders decorative floating icons and an accent icon for a given category.
 * Only renders in vibrant theme — returns null in ringer theme.
 * Parent must have `position: relative` and `overflow: hidden`.
 */
export function CategoryDecorations({ category, showAccent = true }: { category: string; showAccent?: boolean }) {
  const { isVibrant } = useTheme()

  if (!isVibrant) return null

  const config = findCategoryConfig(category)

  return (
    <>
      {/* Scattered floating icons */}
      <div className="hidden sm:block">
        {config.floatingIcons.map((item, i) => (
          <div
            key={i}
            className={`vibe-float-icon animate-${item.animation}`}
            style={{
              top: item.top,
              bottom: item.bottom,
              left: item.left,
              right: item.right,
              transform: `rotate(${item.rotate})`,
              animationDelay: `${i * 0.8}s`,
              color: config.accentColor,
            }}
          >
            {item.icon}
          </div>
        ))}
      </div>

      {/* Large accent icon (bottom-right, Hostinger-style) */}
      {showAccent && (
        <div className="vibe-accent-icon hidden sm:flex" style={{ color: config.accentColor }}>
          {config.accentIcon}
        </div>
      )}
    </>
  )
}

/**
 * Returns the CSS class name for category-specific card background gradient.
 * Returns empty string in ringer theme.
 */
export function getCategoryCardClass(category: string): string {
  const norm = (category || "").toLowerCase().replace(/[\s&_]+/g, "")
  if (norm.includes("adventure") || norm.includes("trek") || norm.includes("nature")) return "vibe-card-adventure"
  if (norm.includes("music") || norm.includes("gig") || norm.includes("concert")) return "vibe-card-music"
  if (norm.includes("nightlife") || norm.includes("club") || norm.includes("party")) return "vibe-card-nightlife"
  if (norm.includes("art") || norm.includes("craft") || norm.includes("culture")) return "vibe-card-arts"
  if (norm.includes("sport") || norm.includes("fitness") || norm.includes("run")) return "vibe-card-sports"
  if (norm.includes("food") || norm.includes("drink") || norm.includes("dining")) return "vibe-card-food"
  if (norm.includes("techno") || norm.includes("tech") || norm.includes("cyber")) return "vibe-card-techno"
  if (norm.includes("indie") || norm.includes("acoustic")) return "vibe-card-indie"
  if (norm.includes("workshop") || norm.includes("learn") || norm.includes("bootcamp")) return "vibe-card-workshops"
  if (norm.includes("education")) return "vibe-card-education"
  if (norm.includes("spiritual") || norm.includes("mindful") || norm.includes("meditat")) return "vibe-card-spiritual"
  if (norm.includes("wellness") || norm.includes("health") || norm.includes("yoga")) return "vibe-card-wellness"
  if (norm.includes("comedy") || norm.includes("standup")) return "vibe-card-comedy"
  return "vibe-card-general"
}

/**
 * Returns the accent color hex for a given category.
 */
export function getCategoryAccentColor(category: string): string {
  const config = findCategoryConfig(category)
  return config.accentColor
}

/**
 * Returns the sticker badge CSS class for category badges.
 */
export function getCategoryBadgeClass(category: string): string {
  const config = findCategoryConfig(category)
  return `${config.badgeBg} ${config.badgeText} shadow-xs font-black`
}

