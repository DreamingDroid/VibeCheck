import type { Metadata } from "next";
import { Inter, Lora, Courier_Prime } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const lora = Lora({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

const courierPrime = Courier_Prime({
  subsets: ["latin"],
  variable: "--font-typewriter",
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

import { SITE_URL, SITE_NAME, generateRootJsonLd, isProductionEnvironment } from "@/lib/seo";

const isProd = isProductionEnvironment();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VibeCheck Space | Discover Local Events, News & City Happenings",
    template: "%s | VibeCheck Space",
  },
  description: "Find upcoming local events, live music concerts, tech meetups, workshops, cultural festivals, and local news stories in Vizag and beyond on VibeCheck Space.",
  keywords: [
    "local events",
    "local news",
    "Vizag events",
    "events in Vizag",
    "things to do in Vizag",
    "Vizag news",
    "upcoming events Vizag",
    "workshops Vizag",
    "concerts Vizag",
    "tech meetups Vizag",
    "local happenings",
    "city guide Vizag",
    "community events",
    "VibeCheck Space",
  ],
  authors: [{ name: "BayBuzz Labs" }],
  creator: "BayBuzz Labs",
  publisher: SITE_NAME,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "VibeCheck Space | Discover Local Events & City News",
    description: "Discover upcoming local events, workshops, concerts, and breaking city news in Vizag.",
    url: SITE_URL,
    siteName: SITE_NAME,
    images: [
      {
        url: `${SITE_URL}/apple-touch-icon.png`,
        width: 512,
        height: 512,
        alt: "VibeCheck Space",
      },
    ],
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VibeCheck Space | Discover Local Events & City News",
    description: "Discover upcoming local events, workshops, concerts, and breaking city news in Vizag.",
    images: [`${SITE_URL}/apple-touch-icon.png`],
  },
  robots: isProd
    ? {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-video-preview": -1,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      }
    : {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
          noarchive: true,
        },
      },
};

import { GlobalHeader } from "@/components/global-header";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const rootJsonLd = generateRootJsonLd();

  return (
    <html
      lang="en"
      data-theme="vibrant"
      className={`${inter.variable} ${lora.variable} ${courierPrime.variable} h-full antialiased font-sans`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(rootJsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <GlobalHeader />
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <footer className="w-full text-center py-8 border-t border-black/5 text-zinc-400 text-xs mt-auto font-medium">
            © {new Date().getFullYear()} BayBuzz Labs. All rights reserved.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
