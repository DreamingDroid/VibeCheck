import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "VibeCheck",
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
      className={`${inter.variable} h-full antialiased font-sans`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers>
          <GlobalHeader />
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <footer className="w-full text-center py-8 border-t border-black/5 text-zinc-400 text-xs mt-auto font-medium">
            © {new Date().getFullYear()} VIBECHECK. All rights reserved.
          </footer>
        </Providers>
      </body>
    </html>
  );
}
