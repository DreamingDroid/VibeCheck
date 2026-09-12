"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from "react";
import { toast } from "sonner";

export type LanguageCode = "en" | "nl";

export interface LanguageOption {
  code: LanguageCode;
  name: string;
  nativeName: string;
  flag: string;
}

export const ALL_LANGUAGES: Record<LanguageCode, LanguageOption> = {
  en: { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  nl: { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱" },
};

// Country configurations: maps country code -> available languages & default auto-selected language
interface CountryLanguageConfig {
  countryCode: string;
  countryName: string;
  availableLanguages: LanguageCode[];
  defaultLanguage: LanguageCode;
}

const COUNTRY_CONFIGS: Record<string, CountryLanguageConfig> = {
  NL: {
    countryCode: "NL",
    countryName: "Netherlands",
    availableLanguages: ["en", "nl"],
    defaultLanguage: "nl",
  },
  IN: {
    countryCode: "IN",
    countryName: "India",
    availableLanguages: ["en"],
    defaultLanguage: "en",
  },
};

const DEFAULT_CONFIG: CountryLanguageConfig = {
  countryCode: "OTHER",
  countryName: "Global",
  availableLanguages: ["en"],
  defaultLanguage: "en",
};

// Translations Dictionary
const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    // Header & Navigation
    "app.tagline": "SPACE",
    "nav.search_placeholder": "Discover your next vibe",
    "nav.local_currents": "LOCAL CURRENTS",
    "nav.preferences": "PREFERENCES",
    "nav.organizer_hub": "ORGANIZER HUB",
    "nav.approval_pending": "ORGANISER APPROVAL PENDING",
    "nav.rejected": "APPLICATION REJECTED",
    "nav.become_organizer": "BECOME AN ORGANIZER",
    "nav.admin": "ADMIN",
    "nav.notifications": "NOTIFICATIONS",
    "nav.disconnect": "DISCONNECT",
    "nav.join_vibe": "JOIN THE VIBE",
    "nav.signed_in_as": "Signed in as",
    "nav.all_caught_up": "All Caught Up!",
    "nav.no_notifications": "No notifications matching this filter.",
    "nav.mark_all_read": "Mark all as read",
    "nav.filter_all": "All",
    "nav.filter_unread": "Unread",
    "nav.filter_alerts": "Alerts",

    // Categories
    "cat.the_latest": "The Latest",
    "cat.music": "Music",
    "cat.live_music": "Live Music",
    "cat.podcasts": "Podcasts",
    "cat.sports": "Sports",
    "cat.arts": "Arts",
    "cat.education": "Education",
    "cat.spiritual": "Spiritual",
    "cat.wellness": "Wellness",
    "cat.indie": "Indie",
    "cat.techno": "Techno",
    "cat.food": "Food",
    "cat.comedy": "Comedy",
    "cat.workshops": "Workshops",
    "cat.nightlife": "Nightlife",
    "cat.night_life": "Night Life",
    "cat.general": "General",

    // Landing Page
    "landing.badge": "exclusive network",
    "landing.hero_title_1": "The City of Destiny,",
    "landing.hero_title_2": "Reimagined.",
    "landing.hero_desc": "VibeCheck Space is your ultimate local guide to discovering upcoming events, live concerts, tech meetups, creative workshops, and breaking city news.",
    "landing.join_cta": "JOIN THE VIBE",
    "landing.explore_news": "Explore Local News & Currents",
    "landing.local_currents_title": "Local Currents & News",
    "landing.live_updates_from": "Live updates from {city}",
    "landing.read_time": "{min} min read",
    "landing.no_currents": "No local currents reported for {city} today. Check back later!",

    // Dashboard
    "dash.whats_happening": "What's happening in {city}",
    "dash.share_platform": "Share Platform",
    "dash.join_whatsapp": "Join WhatsApp Community",
    "dash.view_calendar": "Calendar View",
    "dash.view_list": "List View",
    "dash.no_events": "No events found matching your current filter.",
    "dash.rsvp_now": "RSVP Now",
    "dash.details": "Details",
    "dash.follow": "Follow",
    "dash.following": "Following",

    // Preferences Page
    "pref.title": "Identity Matrix",
    "pref.subtitle": "Configuring Your Personal Vibe Frequency",
    "pref.return": "RETURN TO PORTAL",
    "pref.vibe_interests": "Vibe Interests",
    "pref.vibe_interests_desc": "Synchronize your feed with specific frequencies. These tags define what vibes find you first.",
    "pref.home_base": "Home Base",
    "pref.preferred_territory": "Preferred Territory",
    "pref.demographics": "Demographics",
    "pref.profession": "Profession",
    "pref.age_group": "Age Group",
    "pref.whatsapp_hookup": "WhatsApp Hookup",
    "pref.neural_link_active": "✓ NEURAL LINK ACTIVE",
    "pref.language_settings": "Language & Location Region",
    "pref.language_desc": "Detected via network carrier & device location.",
    "pref.auto_detect_label": "Auto-switch language based on location",
    "pref.detected_country": "Detected Country",
    "pref.current_language": "Active Language",
    "pref.identity_status": "Identity Status",
    "pref.categories_linked": "Categories Linked",
    "pref.commit_changes": "COMMIT CHANGES",
    "pref.syncing": "SYNCING...",
    "pref.synchronized": "CONFIGS SYNCHRONIZED",

    // Footer
    "footer.rights": "All rights reserved.",

    // Notifications & Toast
    "lang.switched_toast": "📍 Location detected: {country} — Switched language to {language}",
  },
  nl: {
    // Header & Navigation
    "app.tagline": "RUIMTE",
    "nav.search_placeholder": "Ontdek jouw volgende vibe",
    "nav.local_currents": "LOKAAL NIEUWS",
    "nav.preferences": "VOORKEUREN",
    "nav.organizer_hub": "ORGANISATOREN HUB",
    "nav.approval_pending": "GOEDKEURING IN AFWACHTING",
    "nav.rejected": "AANVRAAG AFGEWEZEN",
    "nav.become_organizer": "WORD ORGANISATOR",
    "nav.admin": "BEHEERDER",
    "nav.notifications": "MELDINGEN",
    "nav.disconnect": "UITLOGGEN",
    "nav.join_vibe": "DOE MEE MET DE VIBE",
    "nav.signed_in_as": "Ingelogd als",
    "nav.all_caught_up": "Helemaal bij!",
    "nav.no_notifications": "Geen meldingen gevonden voor deze filter.",
    "nav.mark_all_read": "Alles als gelezen markeren",
    "nav.filter_all": "Alles",
    "nav.filter_unread": "Ongelezen",
    "nav.filter_alerts": "Waarschuwingen",

    // Categories
    "cat.the_latest": "Het Nieuwste",
    "cat.music": "Muziek",
    "cat.live_music": "Live Muziek",
    "cat.podcasts": "Podcasts",
    "cat.sports": "Sport",
    "cat.arts": "Kunst & Cultuur",
    "cat.education": "Educatie",
    "cat.spiritual": "Spiritualiteit",
    "cat.wellness": "Welzijn",
    "cat.indie": "Indie",
    "cat.techno": "Techno",
    "cat.food": "Eten & Drinken",
    "cat.comedy": "Komedie",
    "cat.workshops": "Workshops",
    "cat.nightlife": "Nachtleven",
    "cat.night_life": "Nachtleven",
    "cat.general": "Algemeen",

    // Landing Page
    "landing.badge": "exclusief netwerk",
    "landing.hero_title_1": "De Stad van de Toekomst,",
    "landing.hero_title_2": "Herontdekt.",
    "landing.hero_desc": "VibeCheck Space is jouw ultieme lokale gids voor het ontdekken van aankomende evenementen, live concerten, tech meetups, creatieve workshops en het laatste stadsnieuws.",
    "landing.join_cta": "DOE MEE MET DE VIBE",
    "landing.explore_news": "Ontdek Lokaal Nieuws & Stromingen",
    "landing.local_currents_title": "Lokaal Nieuws & Stromingen",
    "landing.live_updates_from": "Live updates vanuit {city}",
    "landing.read_time": "{min} min leestijd",
    "landing.no_currents": "Vandaag geen lokale berichten gerapporteerd voor {city}. Kom snel terug!",

    // Dashboard
    "dash.whats_happening": "Wat gebeurt er in {city}",
    "dash.share_platform": "Platform Delen",
    "dash.join_whatsapp": "Word lid van de WhatsApp Community",
    "dash.view_calendar": "Kalenderweergave",
    "dash.view_list": "Lijstweergave",
    "dash.no_events": "Geen evenementen gevonden die aan je filter voldoen.",
    "dash.rsvp_now": "Nu Aanmelden (RSVP)",
    "dash.details": "Details",
    "dash.follow": "Volgen",
    "dash.following": "Volgend",

    // Preferences Page
    "pref.title": "Identiteitsmatrix",
    "pref.subtitle": "Configureer jouw persoonlijke vibe-frequentie",
    "pref.return": "TERUG NAAR PORTAAL",
    "pref.vibe_interests": "Vibe Interesses",
    "pref.vibe_interests_desc": "Synchroniseer je feed met specifieke frequenties. Deze tags bepalen welke vibes jou als eerste vinden.",
    "pref.home_base": "Thuisbasis",
    "pref.preferred_territory": "Voorkeursregio",
    "pref.demographics": "Demografie",
    "pref.profession": "Beroep",
    "pref.age_group": "Leeftijdsgroep",
    "pref.whatsapp_hookup": "WhatsApp Koppeling",
    "pref.neural_link_active": "✓ NEURALE LINK ACTIEF",
    "pref.language_settings": "Taal & Locatieregio",
    "pref.language_desc": "Gedetecteerd via mobiel netwerk & apparaatlocatie.",
    "pref.auto_detect_label": "Taal automatisch aanpassen aan locatie",
    "pref.detected_country": "Gedetecteerd Land",
    "pref.current_language": "Actieve Taal",
    "pref.identity_status": "Identiteitsstatus",
    "pref.categories_linked": "Gekoppelde Categorieën",
    "pref.commit_changes": "WIJZIGINGEN OPSLAAN",
    "pref.syncing": "SYNCHRONISEREN...",
    "pref.synchronized": "CONFIGURATIE GESYNCHRONISEERD",

    // Footer
    "footer.rights": "Alle rechten voorbehouden.",

    // Notifications & Toast
    "lang.switched_toast": "📍 Locatie gedetecteerd: {country} — Taal ingesteld op {language}",
  },
};

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode, isManual?: boolean) => void;
  detectedCountry: string;
  detectedCountryName: string;
  availableLanguages: LanguageOption[];
  hasMultipleLanguages: boolean;
  autoDetectEnabled: boolean;
  setAutoDetectEnabled: (enabled: boolean) => void;
  isDetectingLocation: boolean;
  t: (key: string, variables?: Record<string, string | number>) => string;
  getCategoryLabel: (category: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Quick timezone to country mapping for zero-permission instant detection
function detectCountryFromTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz.includes("Amsterdam") || tz.includes("Europe/Amsterdam")) return "NL";
    if (tz.includes("Kolkata") || tz.includes("Calcutta") || tz.includes("Asia/Kolkata")) return "IN";
    if (tz.includes("Berlin")) return "DE";
    if (tz.includes("Paris")) return "FR";
    if (tz.includes("London")) return "GB";
    if (tz.includes("New_York") || tz.includes("Los_Angeles") || tz.includes("Chicago")) return "US";
  } catch (e) {
    // Ignore error
  }
  return null;
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("en");
  const [detectedCountry, setDetectedCountry] = useState<string>("IN");
  const [detectedCountryName, setDetectedCountryName] = useState<string>("India");
  const [autoDetectEnabled, setAutoDetectEnabledState] = useState<boolean>(true);
  const [isDetectingLocation, setIsDetectingLocation] = useState<boolean>(true);

  // Derive current available languages based on detected country
  const currentCountryConfig = useMemo(() => {
    return COUNTRY_CONFIGS[detectedCountry] || DEFAULT_CONFIG;
  }, [detectedCountry]);

  const availableLanguages = useMemo(() => {
    return currentCountryConfig.availableLanguages.map((code) => ALL_LANGUAGES[code]).filter(Boolean);
  }, [currentCountryConfig]);

  const hasMultipleLanguages = availableLanguages.length > 1;

  const setLanguage = useCallback((lang: LanguageCode, isManual: boolean = true) => {
    setLanguageState(lang);
    if (typeof window !== "undefined") {
      if (isManual) {
        localStorage.setItem("vibecheck_language", lang);
        localStorage.setItem("vibecheck_language_manual", "true");
      }
      document.documentElement.lang = lang;
    }
  }, []);

  const setAutoDetectEnabled = useCallback((enabled: boolean) => {
    setAutoDetectEnabledState(enabled);
    if (typeof window !== "undefined") {
      localStorage.setItem("vibecheck_autodetect_lang", enabled ? "true" : "false");
      if (!enabled) {
        localStorage.setItem("vibecheck_language_manual", "true");
      } else {
        localStorage.removeItem("vibecheck_language_manual");
      }
    }
  }, []);

  // Location / Mobile Network IP Country Detection
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedManual = localStorage.getItem("vibecheck_language_manual") === "true";
    const savedLanguage = localStorage.getItem("vibecheck_language") as LanguageCode | null;
    const savedAutoDetect = localStorage.getItem("vibecheck_autodetect_lang");

    if (savedAutoDetect !== null) {
      setAutoDetectEnabledState(savedAutoDetect === "true");
    }

    if (savedLanguage && (savedLanguage === "en" || savedLanguage === "nl")) {
      setLanguageState(savedLanguage);
      document.documentElement.lang = savedLanguage;
    }

    // 1. Instant Synchronous Guess via Timezone
    const tzCountry = detectCountryFromTimezone();
    if (tzCountry) {
      setDetectedCountry(tzCountry);
      setDetectedCountryName(COUNTRY_CONFIGS[tzCountry]?.countryName || tzCountry);
    }

    // 2. Fetch Mobile Cellular Network / IP Geolocation (Zero permission needed!)
    const detectViaNetwork = async () => {
      setIsDetectingLocation(true);
      try {
        let countryCode = tzCountry || "IN";
        let countryName = COUNTRY_CONFIGS[countryCode]?.countryName || "India";

        try {
          // Fast, public country IP resolver
          const res = await fetch("https://api.country.is/", { signal: AbortSignal.timeout(3500) });
          if (res.ok) {
            const data = await res.json();
            if (data?.country) {
              countryCode = data.country.toUpperCase();
            }
          }
        } catch {
          // Fallback to secondary IP geolocation if primary is blocked or slow
          try {
            const res2 = await fetch("https://ipapi.co/json/", { credentials: "omit", signal: AbortSignal.timeout(3500) });
            if (res2.ok) {
              const data2 = await res2.json();
              if (data2?.country_code) {
                countryCode = data2.country_code.toUpperCase();
                countryName = data2.country_name || countryName;
              }
            }
          } catch {
            // Keep tz fallback
          }
        }

        const config = COUNTRY_CONFIGS[countryCode] || DEFAULT_CONFIG;
        setDetectedCountry(countryCode);
        setDetectedCountryName(config.countryName || countryName);

        // If user already saved a manual language preference in settings/preferences, NEVER override it with location
        if (savedManual && savedLanguage) {
          setIsDetectingLocation(false);
          return;
        }

        // Auto-switch language if auto-detect is enabled and user hasn't manually pinned a language
        const shouldAutoSwitch = (!savedManual || savedAutoDetect === "true") && (savedAutoDetect !== "false");

        if (shouldAutoSwitch) {
          const targetLang = config.defaultLanguage;
          if (targetLang !== language) {
            setLanguageState(targetLang);
            document.documentElement.lang = targetLang;
            localStorage.setItem("vibecheck_language", targetLang);

            if (countryCode === "NL") {
              toast(`📍 Netherlands detected — Switched language to Nederlands`, {
                duration: 4000,
              });
            }
          }
        }
      } catch (err) {
        console.warn("[LanguageContext] Location detection warning:", err);
      } finally {
        setIsDetectingLocation(false);
      }
    };

    detectViaNetwork();
  }, []);

  // Translation Function
  const t = useCallback((key: string, variables?: Record<string, string | number>): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    let text = dict[key] || TRANSLATIONS.en[key] || key;

    if (variables) {
      Object.entries(variables).forEach(([vKey, vVal]) => {
        text = text.replace(new RegExp(`\\{${vKey}\\}`, "g"), String(vVal));
      });
    }

    return text;
  }, [language]);

  // Dynamic category translation
  const getCategoryLabel = useCallback((category: string): string => {
    if (!category) return "";
    const key = `cat.${category.toLowerCase().replace(/[\s-]+/g, "_")}`;
    const dict = TRANSLATIONS[language] || TRANSLATIONS.en;
    return dict[key] || category;
  }, [language]);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        detectedCountry,
        detectedCountryName,
        availableLanguages,
        hasMultipleLanguages,
        autoDetectEnabled,
        setAutoDetectEnabled,
        isDetectingLocation,
        t,
        getCategoryLabel,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export function useTranslation() {
  const { t, getCategoryLabel, language } = useLanguage();
  return { t, getCategoryLabel, language };
}
