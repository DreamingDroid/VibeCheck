import { Metadata } from "next";
import { SITE_URL, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Waves on Beach Road | Live Pop-Up Engine & Micro-Drops | VibeCheck Space",
  description:
    "Real-time discovery for transient weekend pop-ups, artisanal kiosks, and sunset stalls along Beach Road in Visakhapatnam. Real-time countdown tickers and zero dead trips.",
  keywords: [
    "Beach Road Vizag",
    "Waves",
    "pop up food stalls",
    "micro drops Vizag",
    "Beach Road pop ups",
    "artisanal coffee Beach Road",
    "Vizag street food",
    "weekend stalls Beach Road",
    "Visakhapatnam pop ups",
    "live micro drops",
    "VibeCheck Waves",
  ],
  alternates: {
    canonical: `${SITE_URL}/waves`,
  },
  openGraph: {
    title: "Waves on Beach Road | Live Pop-Up Engine | VibeCheck Space",
    description:
      "Catch live pop-ups, artisanal kiosks, and sunset micro-drops along Beach Road in Vizag before they pack up.",
    url: `${SITE_URL}/waves`,
    siteName: SITE_NAME,
    images: [
      {
        url: `${SITE_URL}/apple-touch-icon.png`,
        width: 512,
        height: 512,
        alt: "Waves on Beach Road - VibeCheck Space",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Waves on Beach Road | Live Pop-Up Engine | VibeCheck Space",
    description:
      "Catch live pop-ups, artisanal kiosks, and sunset micro-drops along Beach Road in Vizag before they pack up.",
    images: [`${SITE_URL}/apple-touch-icon.png`],
  },
};

export default function WavesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
