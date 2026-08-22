"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"

export type ThemeName = "ringer" | "vibrant"

interface ThemeContextValue {
  theme: ThemeName
  toggleTheme: () => void
  isVibrant: boolean
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "vibrant",
  toggleTheme: () => {},
  isVibrant: true,
})

const STORAGE_KEY = "vibecheck-theme"

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>("vibrant")
  const [mounted, setMounted] = useState(false)

  // Read from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as ThemeName | null
      if (stored === "vibrant" || stored === "ringer") {
        setTheme(stored)
      } else {
        setTheme("vibrant")
      }
    } catch {
      // localStorage not available
    }
    setMounted(true)
  }, [])

  // Sync data-theme attribute on <html> whenever theme changes
  useEffect(() => {
    if (!mounted) return
    document.documentElement.setAttribute("data-theme", theme)
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      // localStorage not available
    }
  }, [theme, mounted])

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "ringer" ? "vibrant" : "ringer"))
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, isVibrant: theme === "vibrant" }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
