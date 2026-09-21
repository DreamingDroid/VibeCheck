"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "/api/proxy";
  }
  return "http://localhost:4000";
}

function InstagramCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [message, setMessage] = useState("Connecting your Instagram account...");

  useEffect(() => {
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      setStatus("error");
      setMessage(errorDescription || error || "Instagram authorization was cancelled or failed.");
      if (window.opener) {
        window.opener.postMessage(
          { type: "INSTAGRAM_AUTH_ERROR", error: errorDescription || error },
          "*"
        );
      }
      return;
    }

    if (code) {
      const cleanCode = code.replace(/#_$/, "").split("#")[0].trim();

      // If opened as a popup window, transmit code to parent opener immediately
      if (window.opener) {
        window.opener.postMessage(
          { type: "INSTAGRAM_AUTH_SUCCESS", code: cleanCode },
          "*"
        );
        setStatus("success");
        setMessage("Instagram authorization received! Verifying with your session...");
        setTimeout(() => {
          try {
            window.close();
          } catch {}
        }, 1200);
        return;
      }

      // Standalone redirect fallback
      const baseUrl = getApiBaseUrl();
      setMessage("Confirming Instagram account ownership with server...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000);

      fetch(`${baseUrl}/api/apply/instagram/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode }),
        signal: controller.signal,
      })
        .then(async (res) => {
          clearTimeout(timeoutId);
          let data: any = {};
          try {
            data = await res.json();
          } catch {
            data = { success: false, error: `Server returned status ${res.status}` };
          }

          if (data.success && data.handle) {
            sessionStorage.setItem("vibecheck_ig_verified", JSON.stringify(data));
            setStatus("success");
            setMessage(`Verified @${data.handle}! Redirecting...`);
            setTimeout(() => router.push("/organizer/apply"), 1200);
          } else {
            setStatus("error");
            setMessage(data.error || "Failed to verify Instagram account.");
            setTimeout(() => router.push("/organizer/apply"), 3500);
          }
        })
        .catch((err: any) => {
          clearTimeout(timeoutId);
          console.error("Instagram exchange error:", err);
          setStatus("error");
          const errMsg =
            err.name === "AbortError"
              ? "Verification request timed out. Please check your network or backend server."
              : "Network error connecting to verification service.";
          setMessage(errMsg);
          setTimeout(() => router.push("/organizer/apply"), 3500);
        });
    } else {
      setStatus("error");
      setMessage("No authorization code received from Instagram.");
      if (window.opener) {
        window.opener.postMessage(
          { type: "INSTAGRAM_AUTH_ERROR", error: "No authorization code received from Instagram." },
          "*"
        );
      }
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-white text-center">
      <div className="max-w-sm w-full bg-zinc-900/90 border border-white/10 rounded-3xl p-8 shadow-2xl space-y-6">
        {status === "processing" && (
          <>
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 flex items-center justify-center mx-auto shadow-lg shadow-pink-500/20">
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight">Verifying Instagram</h2>
            <p className="text-xs text-zinc-400 font-bold leading-relaxed">{message}</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="h-16 w-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-emerald-400">Connected!</h2>
            <p className="text-xs text-zinc-300 font-bold leading-relaxed">{message}</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="h-16 w-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="text-xl font-black uppercase tracking-tight text-red-400">Verification Failed</h2>
            <p className="text-xs text-zinc-300 font-bold leading-relaxed">{message}</p>
            <button
              onClick={() => {
                if (window.opener) {
                  window.close();
                } else {
                  router.push("/organizer/apply");
                }
              }}
              className="w-full h-11 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider transition-colors"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function InstagramCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-white font-bold text-xs">
          Loading...
        </div>
      }
    >
      <InstagramCallbackContent />
    </Suspense>
  );
}
