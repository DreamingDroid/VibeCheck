"use client"

import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { useState } from "react"

const Spinner = ({ className }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export function GlobalHeader() {
  const { data: session } = useSession()
  const [isSigningOut, setIsSigningOut] = useState(false)

  const handleSignOut = async () => {
    setIsSigningOut(true)
    await signOut({ callbackUrl: "/" })
  }

  return (
    <header className="w-full bg-black/40 backdrop-blur-md border-b border-white/5 text-white sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href={session ? "/dashboard" : "/"} className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-green-400 to-yellow-400 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
          Vizag Vibes
        </Link>
        
        {session && (
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-sm text-cyan-100 font-medium tracking-wide">
              {session.user?.name}
            </div>
            <button 
              onClick={handleSignOut} 
              disabled={isSigningOut}
              className="text-xs px-4 py-2 bg-black/50 hover:bg-white/10 border border-white/10 rounded-lg transition-all flex items-center gap-2 font-semibold text-zinc-300 hover:text-white"
            >
              {isSigningOut ? <Spinner className="h-3 w-3 text-cyan-400" /> : null}
              {isSigningOut ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
        )}
      </div>
    </header>
  )
}
