"use client"

import { SessionProvider } from "next-auth/react"
import { CityProvider } from "@/context/CityContext"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CityProvider>
        {children}
      </CityProvider>
    </SessionProvider>
  )
}
