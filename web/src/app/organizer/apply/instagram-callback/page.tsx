"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

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
  const [isPopup, setIsPopup] = useState(false);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    if (hasProcessedRef.current) return;
    hasProcessedRef.current = true;

    const hasOpener = typeof window !== "undefined" && Boolean(window.opener);
    setIsPopup(hasOpener);

    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    if (error) {
      setStatus("error");
      setMessage(errorDescription || error || "Instagram authorization was cancelled or failed.");
      if (hasOpener) {
        try {
          window.opener.postMessage(
            { type: "INSTAGRAM_AUTH_ERROR", error: errorDescription || error },
            "*"
          );
        } catch {}
      }
      return;
    }

    if (code) {
      const cleanCode = code.replace(/#_$/, "").split("#")[0].trim();

      // If opened as a popup window, transmit code to parent opener
      if (hasOpener) {
        try {
          window.opener.postMessage(
            { type: "INSTAGRAM_AUTH_SUCCESS", code: cleanCode },
            "*"
          );
        } catch (e) {
          console.error("Failed to postMessage to opener:", e);
        }
        setStatus("success");
        setMessage("Instagram authorization received! Verifying with your application...");
        setTimeout(() => {
          try {
            window.close();
          } catch {}
        }, 1500);
        return;
      }

      // Standalone redirect fallback
      const baseUrl = getApiBaseUrl();
      setMessage("Confirming Instagram account ownership with server...");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

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
            try {
              sessionStorage.setItem("vibecheck_ig_verified", JSON.stringify(data));
            } catch {}
            setStatus("success");
            setMessage(`Verified @${data.handle}! Redirecting...`);
            setTimeout(() => {
              window.location.href = "/organizer/apply";
            }, 1200);
          } else {
            setStatus("error");
            setMessage(data.error || "Failed to verify Instagram account.");
            setTimeout(() => {
              window.location.href = "/organizer/apply";
            }, 3000);
          }
        })
        .catch((err: any) => {
          clearTimeout(timeoutId);
          console.error("Instagram exchange error:", err);
          setStatus("error");
          const errMsg =
            err.name === "AbortError"
              ? "Verification request timed out. Please check your network."
              : "Network error connecting to verification service.";
          setMessage(errMsg);
          setTimeout(() => {
            window.location.href = "/organizer/apply";
          }, 3000);
        });
    } else {
      setStatus("error");
      setMessage("No authorization code received from Instagram.");
      if (hasOpener) {
        try {
          window.opener.postMessage(
            { type: "INSTAGRAM_AUTH_ERROR", error: "No authorization code received from Instagram." },
            "*"
          );
        } catch {}
      }
    }
  }, [searchParams]);

  const handleClose = () => {
    try {
      if (window.opener) {
        window.close();
      } else {
        window.location.href = "/organizer/apply";
      }
    } catch {
      window.location.href = "/organizer/apply";
    }
  };

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
            <button
              onClick={handleClose}
              className="w-full h-11 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-black text-xs uppercase tracking-wider transition-colors border border-emerald-500/30"
            >
              {isPopup ? "Close This Window" : "Continue to Application"}
            </button>
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
              onClick={handleClose}
              className="w-full h-11 rounded-2xl bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase tracking-wider transition-colors"
            >
              {isPopup ? "Close Window" : "Return to Application"}
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
