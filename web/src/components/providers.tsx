"use client"

import { SessionProvider } from "next-auth/react"
import { CityProvider } from "@/context/CityContext"
import { ThemeProvider } from "@/context/ThemeContext"
import { LanguageProvider } from "@/context/LanguageContext"
import { Toaster } from "sonner"
import { VibeConfirmProvider } from "@/components/vibe-confirm"
import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';
import { useEffect } from 'react';

function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("Service Worker registered successfully with scope:", reg.scope);
        })
        .catch((err) => {
          console.error("Service Worker registration failed:", err);
        });
    }
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <LanguageProvider>
        <CityProvider>
          <ThemeProvider>
          {children}
          <ServiceWorkerRegister />
          <ProgressBar
            height="3px"
            color="#ec4899"
            options={{ showSpinner: false }}
            shallowRouting
          />
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
          </ThemeProvider>
        </CityProvider>
      </LanguageProvider>
    </SessionProvider>
  )
}
