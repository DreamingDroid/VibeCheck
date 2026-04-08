import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Vizag Vibes",
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
      <body className="min-h-full flex flex-col bg-zinc-950 text-white selection:bg-indigo-500/30">
        <Providers>
          <GlobalHeader />
          <div className="flex-1 flex flex-col">
            {children}
          </div>
          <footer className="w-full text-center py-8 border-t border-zinc-800/50 bg-zinc-950 text-zinc-500 text-sm mt-auto">
             All rights reserved @ Vizag Vibes
          </footer>
        </Providers>
      </body>
    </html>
  );
}
