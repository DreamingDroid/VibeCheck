"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import Link from "next/link"

export default function Home() {
  const { data: session } = useSession()

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 sm:p-24 bg-zinc-950 text-white">
      <div className="text-center max-w-lg">
        <h1 className="text-4xl font-bold mb-4 tracking-tight">Vizag Vibes</h1>
        <p className="text-zinc-400 mb-8">
          The central hub for discovering local events and nightlife in Visakhapatnam. Let&apos;s check if your Google login works!
        </p>
        
        {session ? (
          <div className="p-6 border border-zinc-800 rounded-xl bg-zinc-900 shadow-xl">
            <h2 className="text-2xl font-semibold mb-2">Welcome, {session.user?.name}!</h2>
            <p className="text-zinc-400 mb-6">{session.user?.email}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/dashboard">
                <button className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors font-medium cursor-pointer">
                  Launch Discovery Portal
                </button>
              </Link>
              <button 
                onClick={() => signOut()} 
                className="px-6 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white rounded-lg transition-colors font-medium"
              >
                Sign Out
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 border border-zinc-800 rounded-xl bg-zinc-900 shadow-xl">
            <h2 className="text-2xl font-semibold mb-2">Authentication Status</h2>
            <p className="text-zinc-400 mb-6">You are currently logged out.</p>
            <button 
              onClick={() => signIn("google")} 
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Sign In with Google
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
