"use client"

import { useTheme } from "@/context/ThemeContext"
import {
  Music, Headphones, Mic2,
  Palette, PenTool, Brush,
  Trophy, Dumbbell, Medal,
  Wine, UtensilsCrossed, ChefHat,
  Code, Cpu, Zap,
  Star, Flame, Guitar,
  BookOpen, GraduationCap, Lightbulb,
  Compass, Sun, Moon,
  Heart, Leaf, Droplets,
  Smile, PartyPopper, Drama,
  Sparkles, Globe, Gem,
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
}

const ICON_SIZE_SM = "h-4 w-4"
const ICON_SIZE_MD = "h-5 w-5"
const ICON_SIZE_ACCENT = "h-7 w-7"

const categoryConfigs: Record<string, CategoryConfig> = {
  Music: {
    floatingIcons: [
      { icon: <Music className={ICON_SIZE_SM} />, top: "12%", right: "18%", rotate: "-15deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <Headphones className={ICON_SIZE_MD} />, top: "35%", right: "8%", rotate: "10deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Mic2 className={ICON_SIZE_SM} />, bottom: "30%", right: "22%", rotate: "20deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Music className={ICON_SIZE_ACCENT} />,
    accentColor: "#F59E0B",
  },
  Arts: {
    floatingIcons: [
      { icon: <Palette className={ICON_SIZE_SM} />, top: "15%", right: "15%", rotate: "12deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <PenTool className={ICON_SIZE_MD} />, top: "40%", right: "10%", rotate: "-8deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Brush className={ICON_SIZE_SM} />, bottom: "28%", right: "20%", rotate: "25deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Palette className={ICON_SIZE_ACCENT} />,
    accentColor: "#9C27B0",
  },
  Sports: {
    floatingIcons: [
      { icon: <Trophy className={ICON_SIZE_SM} />, top: "14%", right: "16%", rotate: "-10deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <Dumbbell className={ICON_SIZE_MD} />, top: "38%", right: "8%", rotate: "15deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Medal className={ICON_SIZE_SM} />, bottom: "32%", right: "24%", rotate: "-20deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Trophy className={ICON_SIZE_ACCENT} />,
    accentColor: "#F97316",
  },
  Food: {
    floatingIcons: [
      { icon: <Wine className={ICON_SIZE_SM} />, top: "12%", right: "20%", rotate: "8deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <UtensilsCrossed className={ICON_SIZE_MD} />, top: "36%", right: "10%", rotate: "-12deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <ChefHat className={ICON_SIZE_SM} />, bottom: "30%", right: "18%", rotate: "18deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <UtensilsCrossed className={ICON_SIZE_ACCENT} />,
    accentColor: "#10B981",
  },
  Techno: {
    floatingIcons: [
      { icon: <Code className={ICON_SIZE_SM} />, top: "15%", right: "14%", rotate: "-5deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <Cpu className={ICON_SIZE_MD} />, top: "40%", right: "8%", rotate: "12deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Zap className={ICON_SIZE_SM} />, bottom: "28%", right: "22%", rotate: "-15deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Cpu className={ICON_SIZE_ACCENT} />,
    accentColor: "#06B6D4",
  },
  Indie: {
    floatingIcons: [
      { icon: <Star className={ICON_SIZE_SM} />, top: "12%", right: "18%", rotate: "15deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <Flame className={ICON_SIZE_MD} />, top: "38%", right: "10%", rotate: "-10deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Guitar className={ICON_SIZE_SM} />, bottom: "30%", right: "20%", rotate: "20deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Star className={ICON_SIZE_ACCENT} />,
    accentColor: "#EC4899",
  },
  Education: {
    floatingIcons: [
      { icon: <BookOpen className={ICON_SIZE_SM} />, top: "14%", right: "16%", rotate: "-8deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <GraduationCap className={ICON_SIZE_MD} />, top: "40%", right: "8%", rotate: "10deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Lightbulb className={ICON_SIZE_SM} />, bottom: "28%", right: "22%", rotate: "-18deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <BookOpen className={ICON_SIZE_ACCENT} />,
    accentColor: "#3B82F6",
  },
  Spiritual: {
    floatingIcons: [
      { icon: <Compass className={ICON_SIZE_SM} />, top: "15%", right: "18%", rotate: "12deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <Sun className={ICON_SIZE_MD} />, top: "38%", right: "10%", rotate: "-6deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Moon className={ICON_SIZE_SM} />, bottom: "30%", right: "20%", rotate: "22deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Compass className={ICON_SIZE_ACCENT} />,
    accentColor: "#7C3AED",
  },
  Wellness: {
    floatingIcons: [
      { icon: <Heart className={ICON_SIZE_SM} />, top: "14%", right: "16%", rotate: "-10deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <Leaf className={ICON_SIZE_MD} />, top: "40%", right: "8%", rotate: "8deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Droplets className={ICON_SIZE_SM} />, bottom: "28%", right: "22%", rotate: "16deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Leaf className={ICON_SIZE_ACCENT} />,
    accentColor: "#14B8A6",
  },
  Comedy: {
    floatingIcons: [
      { icon: <Smile className={ICON_SIZE_SM} />, top: "12%", right: "18%", rotate: "10deg", animation: "float-gentle", size: ICON_SIZE_SM },
      { icon: <PartyPopper className={ICON_SIZE_MD} />, top: "38%", right: "10%", rotate: "-14deg", animation: "float-slow", size: ICON_SIZE_MD },
      { icon: <Drama className={ICON_SIZE_SM} />, bottom: "30%", right: "20%", rotate: "18deg", animation: "float-drift", size: ICON_SIZE_SM },
    ],
    accentIcon: <Smile className={ICON_SIZE_ACCENT} />,
    accentColor: "#EAB308",
  },
}

const defaultConfig: CategoryConfig = {
  floatingIcons: [
    { icon: <Sparkles className={ICON_SIZE_SM} />, top: "14%", right: "16%", rotate: "-8deg", animation: "float-gentle", size: ICON_SIZE_SM },
    { icon: <Globe className={ICON_SIZE_MD} />, top: "40%", right: "8%", rotate: "10deg", animation: "float-slow", size: ICON_SIZE_MD },
    { icon: <Gem className={ICON_SIZE_SM} />, bottom: "28%", right: "22%", rotate: "15deg", animation: "float-drift", size: ICON_SIZE_SM },
  ],
  accentIcon: <Sparkles className={ICON_SIZE_ACCENT} />,
  accentColor: "#6B7280",
}

/**
 * Renders decorative floating icons and an accent icon for a given category.
 * Only renders in vibrant theme — returns null in ringer theme.
 * Parent must have `position: relative` and `overflow: hidden`.
 */
export function CategoryDecorations({ category, showAccent = true }: { category: string; showAccent?: boolean }) {
  const { isVibrant } = useTheme()

  if (!isVibrant) return null

  const config = categoryConfigs[category] || defaultConfig

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
  const key = category.toLowerCase().replace(/\s+/g, "")
  const map: Record<string, string> = {
    music: "vibe-card-music",
    arts: "vibe-card-arts",
    sports: "vibe-card-sports",
    food: "vibe-card-food",
    techno: "vibe-card-techno",
    indie: "vibe-card-indie",
    education: "vibe-card-education",
    spiritual: "vibe-card-spiritual",
    wellness: "vibe-card-wellness",
    comedy: "vibe-card-comedy",
    nightlife: "vibe-card-nightlife",
    general: "vibe-card-general",
  }
  return map[key] || "vibe-card-general"
}

/**
 * Returns the accent color for a given category.
 */
export function getCategoryAccentColor(category: string): string {
  const config = categoryConfigs[category] || defaultConfig
  return config.accentColor
}
