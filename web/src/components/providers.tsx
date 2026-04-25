"use client"

import { SessionProvider } from "next-auth/react"
import { CityProvider } from "@/context/CityContext"
import { Toaster } from "sonner"
import { VibeConfirmProvider } from "@/components/vibe-confirm"
import { AppProgressBar as ProgressBar } from 'next-nprogress-bar';
import NProgress from 'nprogress';
import { useEffect } from 'react';

function FetchProgressBar() {
  useEffect(() => {
    const originalFetch = window.fetch;
    let activeRequests = 0;

    window.fetch = async function (...args) {
      if (activeRequests === 0) {
        NProgress.start();
      }
      activeRequests++;

      try {
        const response = await originalFetch.apply(this, args);
        return response;
      } finally {
        activeRequests--;
        if (activeRequests === 0) {
          NProgress.done();
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CityProvider>
        {children}
        <FetchProgressBar />
        <ProgressBar
          height="4px"
          color="#000000"
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
      </CityProvider>
    </SessionProvider>
  )
}
