"use client"

import { SessionProvider } from "next-auth/react"
import { CityProvider } from "@/context/CityContext"
import { Toaster } from "sonner"
import { VibeConfirmProvider } from "@/components/vibe-confirm"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CityProvider>
        {children}
        <Toaster
          position="bottom-right"
          richColors
          expand
          toastOptions={{
            style: {
              borderRadius: "20px",
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.12)",
              fontFamily: "var(--font-sans)",
              fontSize: "12px",
              fontWeight: 700,
              padding: "16px 20px",
            },
          }}
        />
        <VibeConfirmProvider />
      </CityProvider>
    </SessionProvider>
  )
}
