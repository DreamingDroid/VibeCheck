import { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Local Currents & City News | Vizag Happenings, Culture & Stories",
  description: "Catch the latest local news, culture spotlights, music reviews, tech stories, and community happenings in Vizag on VibeCheck Space.",
  keywords: [
    "local news",
    "Vizag news",
    "local currents",
    "city news Vizag",
    "Vizag culture",
    "community stories",
    "Vizag events",
    "things happening in Vizag",
    "local updates",
    "VibeCheck Space",
  ],
  alternates: {
    canonical: `${SITE_URL}/local-currents`,
  },
  openGraph: {
    title: "Local Currents & City News | VibeCheck Space",
    description: "Catch the latest local news, culture spotlights, music reviews, tech stories, and community happenings in Vizag.",
    url: `${SITE_URL}/local-currents`,
    siteName: SITE_NAME,
    images: [
      {
        url: `${SITE_URL}/apple-touch-icon.png`,
        width: 512,
        height: 512,
        alt: "Local Currents - VibeCheck Space",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Local Currents & City News | VibeCheck Space",
    description: "Catch the latest local news, culture spotlights, music reviews, tech stories, and community happenings in Vizag.",
    images: [`${SITE_URL}/apple-touch-icon.png`],
  },
};

export default function LocalCurrentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
