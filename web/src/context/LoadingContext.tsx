"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from "react";
import { usePathname, useSearchParams } from "next/navigation";

interface LoadingContextType {
  isNavigating: boolean;
  isApiLoading: boolean;
  activeRequestsCount: number;
  startNavigation: (url?: string) => void;
  finishNavigation: () => void;
  startApiCall: () => void;
  finishApiCall: () => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [isNavigating, setIsNavigating] = useState(false);
  const [activeRequestsCount, setActiveRequestsCount] = useState(0);
  const isApiLoading = activeRequestsCount > 0;

  const previousUrlRef = useRef<string>("");
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startNavigation = useCallback((_url?: string) => {
    setIsNavigating(true);
    // Clear any previous timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    // Safety fallback: reset navigation state after 10 seconds if navigation hangs
    navigationTimeoutRef.current = setTimeout(() => {
      setIsNavigating(false);
    }, 10000);
  }, []);

  const finishNavigation = useCallback(() => {
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
    // Smooth delay before ending so the transition doesn't abruptly flash
    setTimeout(() => {
      setIsNavigating(false);
    }, 150);
  }, []);

  const startApiCall = useCallback(() => {
    setActiveRequestsCount((prev) => prev + 1);
  }, []);

  const finishApiCall = useCallback(() => {
    setActiveRequestsCount((prev) => Math.max(0, prev - 1));
  }, []);

  const withLoading = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T> => {
      startApiCall();
      try {
        return await fn();
      } finally {
        finishApiCall();
      }
    },
    [startApiCall, finishApiCall]
  );

  // Detect route / URL changes and finish navigation
  useEffect(() => {
    const currentUrl = `${pathname}?${searchParams?.toString() || ""}`;
    if (previousUrlRef.current && previousUrlRef.current !== currentUrl) {
      finishNavigation();
    }
    previousUrlRef.current = currentUrl;
  }, [pathname, searchParams, finishNavigation]);

  // Intercept click on internal links for instantaneous navigation feedback
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleClick = (e: MouseEvent) => {
      // Find closest anchor tag
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      const targetAttr = anchor.getAttribute("target");
      const isDownload = anchor.hasAttribute("download");

      // Skip non-navigation links
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("javascript:") ||
        targetAttr === "_blank" ||
        isDownload ||
        e.defaultPrevented ||
        e.button !== 0 || // only main/left click
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.shiftKey
      ) {
        return;
      }

      // Check if it is an internal route
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin === window.location.origin) {
          const currentUrl = window.location.pathname + window.location.search;
          const destinationUrl = url.pathname + url.search;
          if (currentUrl !== destinationUrl) {
            startNavigation(destinationUrl);
          }
        }
      } catch (err) {
        // Invalid URL, ignore
      }
    };

    const handlePopState = () => {
      startNavigation();
    };

    document.addEventListener("click", handleClick, { capture: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
    };
  }, [startNavigation]);

  // Intercept window.fetch for automatic background API loading indication
  useEffect(() => {
    if (typeof window === "undefined") return;

    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      const url = typeof args[0] === "string" ? args[0] : args[0] instanceof Request ? args[0].url : "";
      
      // We track internal /api/ calls or calls to our backend
      const isApiCall =
        url.includes("/api/") ||
        (process.env.NEXT_PUBLIC_API_URL && url.includes(process.env.NEXT_PUBLIC_API_URL));

      // Skip static files or SW registrations
      const isBackgroundNoise =
        url.includes("/sw.js") ||
        url.includes("/_next/") ||
        url.includes("favicon") ||
        url.includes("manifest");

      const shouldTrack = isApiCall && !isBackgroundNoise;

      if (shouldTrack) {
        setActiveRequestsCount((prev) => prev + 1);
      }

      try {
        const response = await originalFetch.apply(this, args);
        return response;
      } finally {
        if (shouldTrack) {
          setActiveRequestsCount((prev) => Math.max(0, prev - 1));
        }
      }
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  return (
    <LoadingContext.Provider
      value={{
        isNavigating,
        isApiLoading,
        activeRequestsCount,
        startNavigation,
        finishNavigation,
        startApiCall,
        finishApiCall,
        withLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error("useLoading must be used within a LoadingProvider");
  }
  return context;
}
