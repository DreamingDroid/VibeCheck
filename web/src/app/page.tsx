"use client"

import { useSession, signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"

const Spinner = ({ className }: { className?: string }) => (
  <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default function Home() {
  const { status } = useSession()
  const router = useRouter()
  const [isSigningIn, setIsSigningIn] = useState(false)

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard")
    }
  }, [status, router])

  if (status === "loading" || status === "authenticated") {
    return (
      <main className="flex flex-1 items-center justify-center bg-zinc-950 text-indigo-400">
         <Spinner className="h-10 w-10 text-indigo-500" />
      </main>
    )
  }

  const handleSignIn = () => {
    setIsSigningIn(true)
    signIn("google", { callbackUrl: '/dashboard' })
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative ambient glowing orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none -z-10 animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/10 rounded-full blur-[120px] pointer-events-none -z-10" />
      
      <div className="text-center max-w-xl z-10 animate-float relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 via-green-500 to-yellow-500 rounded-3xl blur opacity-25"></div>
        <div className="relative bg-black/40 backdrop-blur-xl p-10 sm:p-14 rounded-3xl border border-white/10 shadow-2xl flex flex-col items-center">
          <h1 className="text-6xl font-extrabold mb-6 tracking-tight bg-gradient-to-br from-cyan-300 via-green-300 to-yellow-400 bg-clip-text text-transparent drop-shadow-sm filter">
            Vizag Vibes
          </h1>
          <p className="text-zinc-300 mb-10 text-lg leading-relaxed font-medium">
            The future of networking and discovery in the City of Destiny. <br className="hidden sm:block"/> Powered by coastal energy and AI.
          </p>

          <div className="w-full flex flex-col items-center border-t border-white/10 pt-8 mt-2">
            <h2 className="text-xl font-semibold mb-2 text-white/90">Access the Network</h2>
            <p className="text-zinc-400 mb-6 text-sm">Discover the intelligent way to explore Visakhapatnam.</p>
            <button 
              onClick={handleSignIn} 
              disabled={isSigningIn}
              className="group relative px-8 py-3 bg-cyan-600 hover:bg-cyan-500 overflow-hidden text-white rounded-xl transition-all duration-300 font-bold flex items-center justify-center min-w-[240px] shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_30px_rgba(6,182,212,0.5)]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
              <span className="relative flex items-center">
                {isSigningIn ? (
                  <>
                    <Spinner className="-ml-1 mr-3 h-5 w-5 text-white" />
                    Initializing...
                  </>
                ) : (
                  "Launch Portal"
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
