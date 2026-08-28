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

export const metadata: Metadata = {
  title: "VibeCheck Space",
  description: "Discover local events and connect with the Vizag community.",
};

import { GlobalHeader } from "@/components/global-header";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-theme="vibrant"
      className={`${inter.variable} ${lora.variable} ${courierPrime.variable} h-full antialiased font-sans`}
    >
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
