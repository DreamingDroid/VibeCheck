"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  ShieldAlert,
  Timer,
  RefreshCw,
  Clock,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Check,
  ChevronRight,
  Lock,
  ExternalLink,
  ShieldCheck,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

function InstagramIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function isValidInstagramInput(val: string): boolean {
  const trimmed = val.trim();
  if (!trimmed) return false;

  // 1. Explicit handle format starting with '@': e.g. @mybrand (1-30 valid chars)
  if (trimmed.startsWith("@")) {
    const handle = trimmed.slice(1);
    return /^[a-zA-Z0-9._]{1,30}$/.test(handle);
  }

  // 2. Full or partial Instagram URL: must contain instagram.com/ or instagr.am/
  const hasInstagramDomain = /^(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\//i.test(trimmed);
  if (!hasInstagramDomain) {
    return false;
  }

  try {
    const urlToTest = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(urlToTest);
    const hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (hostname !== "instagram.com" && hostname !== "instagr.am") {
      return false;
    }
    const pathname = parsed.pathname.replace(/^\/+|\/+$/g, "");
    // Must have a valid username segment (1-30 chars, no nested routes)
    return /^[a-zA-Z0-9._]{1,30}$/.test(pathname);
  } catch {
    return false;
  }
}

function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    return "/api/proxy";
  }
  return "http://localhost:4000";
}

export default function OrganizerApplyPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  const [formData, setFormData] = useState({
    brandName: "",
    description: "",
    facebookUrl: "",
    instagramUrl: "",
    email: "",
    phone: "",
  });

  const formDataRef = useRef(formData);
  useEffect(() => {
    formDataRef.current = formData;
  }, [formData]);

  const sessionRef = useRef(session);
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const popupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isExchangingRef = useRef(false);

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneToken, setPhoneToken] = useState("");

  const [instagramVerified, setInstagramVerified] = useState(false);
  const [instagramToken, setInstagramToken] = useState("");
  const [instagramHandle, setInstagramHandle] = useState("");
  const [instagramLoading, setInstagramLoading] = useState(false);
  const [devInstagramModal, setDevInstagramModal] = useState<{ isOpen: boolean; handle: string }>({ isOpen: false, handle: "" });

  const [verifyModal, setVerifyModal] = useState<{ isOpen: boolean; type: "phone" | null }>({ isOpen: false, type: null });
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [organizerStatus, setOrganizerStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Timer state
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes = 180 seconds

  const clearPopupInterval = () => {
    if (popupIntervalRef.current) {
      clearInterval(popupIntervalRef.current);
      popupIntervalRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearPopupInterval();
    };
  }, []);

  // Restore draft form inputs and Instagram verification from session storage on mount
  useEffect(() => {
    try {
      // 1. Restore draft form inputs if returning from redirect
      const draft = sessionStorage.getItem("vibecheck_apply_draft");
      if (draft) {
        const parsedDraft = JSON.parse(draft);
        if (parsedDraft && typeof parsedDraft === "object") {
          setFormData((prev) => ({
            ...prev,
            ...parsedDraft,
          }));
        }
        sessionStorage.removeItem("vibecheck_apply_draft");
      }

      // 2. Check for Instagram verification from session storage (redirect fallback)
      const stored = sessionStorage.getItem("vibecheck_ig_verified");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token && parsed.handle) {
          setInstagramVerified(true);
          setInstagramToken(parsed.token);
          setInstagramHandle(parsed.handle);
          setFormData((prev) => ({
            ...prev,
            instagramUrl: parsed.instagramUrl || `https://instagram.com/${parsed.handle}`,
          }));
          sessionStorage.removeItem("vibecheck_ig_verified");
          toast.success(`Instagram @${parsed.handle} verified successfully! 🎉`);
        }
      }
    } catch (e) {
      // Ignore parse error
    }
  }, []);

  // Prefill email and check existing organizer status
  useEffect(() => {
    if (session?.user?.email) {
      setFormData((prev) => ({ ...prev, email: session?.user?.email || "" }));

      const baseUrl = getApiBaseUrl();
      fetch(`${baseUrl}/api/admin/check?email=${encodeURIComponent(session.user.email)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.success && data.isOrganizer) {
            setOrganizerStatus(data.status || null);
            setRejectionReason(data.rejectionReason || null);
          } else {
            setOrganizerStatus(null);
            setRejectionReason(null);
          }
        })
        .catch((err) => console.error("Error checking organizer status:", err))
        .finally(() => setCheckingStatus(false));
    } else if (authStatus !== "loading") {
      setCheckingStatus(false);
    }
  }, [session, authStatus]);

  // Window message listener for Instagram OAuth popup
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      // Validate trusted origin (local, vercel preview, production)
      const isTrustedOrigin =
        event.origin === window.location.origin ||
        event.origin.includes("localhost") ||
        event.origin.includes("127.0.0.1") ||
        event.origin.includes("vercel.app") ||
        event.origin.includes("vibecheckspace");

      if (!isTrustedOrigin) return;

      if (event.data?.type === "INSTAGRAM_VERIFIED") {
        clearPopupInterval();
        const { token, handle, instagramUrl } = event.data;
        setInstagramVerified(true);
        setInstagramToken(token);
        setInstagramHandle(handle);
        setFormData((prev) => ({
          ...prev,
          instagramUrl: instagramUrl || `https://instagram.com/${handle}`,
        }));
        setInstagramLoading(false);
        toast.success(`Instagram @${handle} verified successfully! 🎉`);
        return;
      }

      if (event.data?.type === "INSTAGRAM_AUTH_SUCCESS" && event.data?.code) {
        if (isExchangingRef.current) return;
        isExchangingRef.current = true;
        clearPopupInterval();
        setInstagramLoading(true);

        const baseUrl = getApiBaseUrl();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
          const res = await fetch(`${baseUrl}/api/apply/instagram/exchange`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              code: event.data.code,
              email: formDataRef.current.email || sessionRef.current?.user?.email || "",
            }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          let data: any = {};
          try {
            data = await res.json();
          } catch {
            data = { success: false, error: `Server returned status ${res.status}` };
          }

          if (data.success && data.handle) {
            setInstagramVerified(true);
            setInstagramToken(data.token);
            setInstagramHandle(data.handle);
            setFormData((prev) => ({
              ...prev,
              instagramUrl: data.instagramUrl || `https://instagram.com/${data.handle}`,
            }));
            toast.success(`Instagram @${data.handle} verified successfully! 🎉`);
          } else {
            toast.error(data.error || "Failed to verify Instagram account.");
          }
        } catch (err: any) {
          clearTimeout(timeoutId);
          console.error("Instagram verification exchange error:", err);
          if (err.name === "AbortError") {
            toast.error("Instagram verification request timed out.");
          } else {
            toast.error("Network error completing Instagram verification.");
          }
        } finally {
          isExchangingRef.current = false;
          setInstagramLoading(false);
        }
      } else if (event.data?.type === "INSTAGRAM_AUTH_ERROR") {
        clearPopupInterval();
        toast.error(event.data.error || "Instagram authorization failed.");
        setInstagramLoading(false);
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => {
      window.removeEventListener("message", handleOAuthMessage);
      clearPopupInterval();
    };
  }, []);

  // Protect route
  useEffect(() => {
    if (authStatus === "unauthenticated") {
      toast.error("Please sign in first.");
      router.push("/dashboard");
    }
  }, [authStatus, router]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (verifyModal.isOpen && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [verifyModal.isOpen, timeLeft]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleStartInstagramVerify = async () => {
    if (!isValidInstagramInput(formData.instagramUrl)) {
      toast.error("Please enter a valid Instagram profile URL (e.g. https://instagram.com/yourbrand) or @handle");
      return;
    }

    setInstagramLoading(true);
    clearPopupInterval();
    const baseUrl = getApiBaseUrl();

    try {
      const res = await fetch(`${baseUrl}/api/apply/instagram/auth-url`);
      const data = await res.json();

      if (!data.success) {
        toast.error(data.error || "Failed to initialize Instagram verification");
        setInstagramLoading(false);
        return;
      }

      if (data.isDevMode || !data.authUrl) {
        // Dev Simulation Mode (or Meta credentials pending)
        const initialHandle = formData.instagramUrl
          ? formData.instagramUrl.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').split(/[/?#]/)[0].replace(/^@/, '')
          : '';
        setDevInstagramModal({ isOpen: true, handle: initialHandle });
        setInstagramLoading(false);
        return;
      }

      // Save draft form data to sessionStorage in case of redirect fallback
      try {
        sessionStorage.setItem("vibecheck_apply_draft", JSON.stringify(formData));
      } catch {}

      // Live OAuth popup flow
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.authUrl,
        "Instagram OAuth Verification",
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`
      );

      if (popup) {
        let elapsed = 0;
        popupIntervalRef.current = setInterval(() => {
          elapsed += 500;
          try {
            if (!popup || popup.closed || elapsed >= 120000) {
              clearPopupInterval();
              setInstagramLoading(false);
            }
          } catch {
            clearPopupInterval();
            setInstagramLoading(false);
          }
        }, 500);
      } else {
        // Popup blocked, fallback to direct redirect
        window.location.href = data.authUrl;
      }
    } catch (err) {
      console.error("Instagram verify init error:", err);
      toast.error("Network error starting Instagram verification");
      setInstagramLoading(false);
    }
  };

  const handleDevInstagramVerify = async () => {
    if (!devInstagramModal.handle.trim()) {
      toast.error("Please enter an Instagram handle to verify.");
      return;
    }

    setInstagramLoading(true);
    const baseUrl = getApiBaseUrl();

    try {
      const res = await fetch(`${baseUrl}/api/apply/instagram/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "dev_simulation",
          devHandle: devInstagramModal.handle.trim()
        }),
      });
      const data = await res.json();

      if (data.success) {
        setInstagramVerified(true);
        setInstagramToken(data.token);
        setInstagramHandle(data.handle);
        setFormData((prev) => ({ ...prev, instagramUrl: data.instagramUrl || `https://instagram.com/${data.handle}` }));
        setDevInstagramModal({ isOpen: false, handle: "" });
        toast.success(`Instagram @${data.handle} verified successfully! 🎉`);
      } else {
        toast.error(data.error || "Failed to verify Instagram account.");
      }
    } catch (e) {
      toast.error("Network error during verification.");
    } finally {
      setInstagramLoading(false);
    }
  };

  const handleResetInstagram = () => {
    setInstagramVerified(false);
    setInstagramToken("");
    setInstagramHandle("");
    setFormData((prev) => ({ ...prev, instagramUrl: "" }));
  };

  const handleSendOtp = async (type: "phone") => {
    const value = formData.phone;
    if (!value) {
      toast.error(`Please enter your WhatsApp number first.`);
      return;
    }

    setLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/apply/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, value }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifyModal({ isOpen: true, type });
        setTimeLeft(180);
        setOtpCode("");
      } else {
        toast.error(data.error || `Failed to send OTP`);
      }
    } catch (e) {
      toast.error("Network error");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!verifyModal.type || !otpCode) return;
    setLoading(true);
    const value = formData.phone;

    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/apply/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: verifyModal.type, value, code: otpCode }),
      });
      const data = await res.json();
      if (data.success) {
        setPhoneVerified(true);
        setPhoneToken(data.token);
        toast.success(`Phone verified successfully!`);
        setVerifyModal({ isOpen: false, type: null });
      } else {
        toast.error(data.error || "Invalid OTP");
      }
    } catch (e) {
      toast.error("Network error");
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneVerified) {
      toast.error("Please verify your WhatsApp number before submitting.");
      return;
    }

    if (!instagramVerified || !instagramToken) {
      toast.error("Please verify your business Instagram account to prove ownership.");
      return;
    }

    setLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/apply/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          phoneToken,
          instagramToken
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Application submitted successfully! Please wait for admin approval.");
        setOrganizerStatus("pending_approval");
      } else {
        toast.error(data.error || "Failed to submit application");
      }
    } catch (e) {
      toast.error("Network error");
    }
    setLoading(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Loading skeleton while resolving session and status
  if (checkingStatus || authStatus === "loading") {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center py-20 px-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-black/5 shadow-xl text-center space-y-4">
          <div className="h-12 w-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto animate-pulse">
            <Clock className="h-6 w-6" />
          </div>
          <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Checking Organizer Status...</p>
        </div>
      </div>
    );
  }

  // 1. Pending Approval State View
  if (organizerStatus === "pending_approval") {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-12 md:py-20 px-4 animate-in fade-in duration-300">
        <div className="max-w-2xl w-full">
          {/* Header Badge */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-black uppercase tracking-wider shadow-xs">
              <Clock className="h-4 w-4 animate-pulse text-amber-500" />
              <span>Organiser Approval Pending</span>
            </div>
          </div>

          <Card className="ringer-card border-none bg-white shadow-2xl overflow-hidden rounded-3xl">
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-8 sm:p-10 border-b border-black/5 text-center">
              <div className="h-20 w-20 rounded-3xl bg-amber-500/20 text-amber-600 flex items-center justify-center mx-auto mb-5 shadow-inner">
                <Clock className="h-10 w-10 animate-pulse text-amber-600" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-900 mb-2">
                Application Under Review
              </h1>
              <p className="text-zinc-500 text-sm font-bold max-w-lg mx-auto leading-relaxed">
                Thank you for applying to become an organizer on VibeCheck. Your application has been submitted and is currently being reviewed by our SuperAdmin editorial team.
              </p>
            </div>

            <CardContent className="p-6 sm:p-8 space-y-6">
              {/* Application Lifecycle Pipeline */}
              <div className="bg-zinc-50/80 rounded-2xl p-5 border border-black/5 space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Approval Workflow</h3>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-zinc-800">Application Submitted & Identity Verified</h4>
                      <p className="text-[11px] font-medium text-zinc-500">Your brand details, WhatsApp verification, and Instagram ownership were confirmed.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 animate-pulse shadow-xs">
                      <Clock className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-amber-700">SuperAdmin Review in Progress</h4>
                      <p className="text-[11px] font-medium text-zinc-500">Our administrators are validating your organizer credentials and vibe curation history.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 opacity-50">
                    <div className="h-6 w-6 rounded-full bg-zinc-200 text-zinc-500 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] font-black">3</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-zinc-700">Organizer Hub Activation</h4>
                      <p className="text-[11px] font-medium text-zinc-500">Upon approval, you unlock event creation, RSVP management, and broadcasts.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informational callout */}
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-xs font-bold text-amber-900 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-black uppercase tracking-wider text-[11px] text-amber-800">Single Organizer Account Policy</p>
                  <p className="text-[11px] text-amber-800/90 font-medium leading-relaxed">
                    You cannot submit multiple organizer applications while an existing request is pending review. As soon as a SuperAdmin approves or responds to your application, you will be notified.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Link href="/" className="flex-1">
                  <Button variant="outline" className="w-full h-12 rounded-2xl border-black/10 font-black uppercase text-xs tracking-wider hover:bg-black hover:text-white transition-colors">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
                  </Button>
                </Link>
                <Link href="/vibes" className="flex-1">
                  <Button className="w-full h-12 rounded-2xl bg-black text-white hover:bg-primary hover:text-black font-black uppercase text-xs tracking-wider transition-colors shadow-md">
                    Explore Events <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // 2. Already Approved View
  if (organizerStatus === "approved") {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-12 md:py-20 px-4 animate-in fade-in duration-300">
        <div className="max-w-xl w-full">
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-xs font-black uppercase tracking-wider shadow-xs">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Verified Organizer</span>
            </div>
          </div>

          <Card className="ringer-card border-none bg-white shadow-2xl overflow-hidden rounded-3xl text-center p-8 sm:p-10 space-y-6">
            <div className="h-20 w-20 rounded-3xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Sparkles className="h-10 w-10 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-zinc-900 mb-2">
                You're a Verified Organiser!
              </h1>
              <p className="text-zinc-500 text-sm font-bold max-w-md mx-auto leading-relaxed">
                Your account is fully activated with organizer privileges. You can manage events, attendee passes, and live broadcasts from the Organizer Hub.
              </p>
            </div>
            <Link href="/organizer" className="block pt-2">
              <Button className="w-full h-14 rounded-2xl bg-primary text-black font-black uppercase tracking-tight text-base hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl">
                Open Organizer Hub
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  // 3. Application Form (for new applicants or re-applying after rejection)
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-12 md:py-20 px-4">
      <div className="max-w-4xl w-full">
        <h1 className="text-3xl sm:text-5xl font-black italic tracking-tighter uppercase mb-4 text-center">
          Become a <span className="text-primary">Guardian</span>
        </h1>
        <p className="text-zinc-500 text-sm font-bold text-center mb-8 uppercase tracking-widest">
          Apply to organize events on VibeCheck
        </p>

        {/* Rejection Notice Banner (if re-applying) */}
        {organizerStatus === "rejected" && (
          <div className="mb-8 p-5 bg-red-50/90 border border-red-200 rounded-3xl shadow-sm text-left animate-in fade-in duration-300">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
              <h4 className="text-xs font-black uppercase tracking-wider text-red-700">Previous Application Update Required</h4>
            </div>
            <p className="text-xs font-medium text-zinc-700 leading-relaxed">
              Your previous organizer application was not approved. Please review the feedback below and update your brand details before re-submitting.
            </p>
            {rejectionReason && (
              <div className="mt-3 bg-white/90 p-3 rounded-2xl border border-red-100 text-xs font-bold text-red-900 italic">
                "{rejectionReason}"
              </div>
            )}
          </div>
        )}

        <Card className="ringer-card border-none bg-white shadow-xl">
          <CardHeader className="border-b border-black/5 bg-zinc-50/50 pb-8">
            <CardTitle className="text-xl font-black uppercase tracking-tight">Your Vibe Identity</CardTitle>
            <CardDescription className="text-zinc-400 font-bold text-xs uppercase tracking-widest mt-2">
              Drop your details and let the people know who's setting the stage
            </CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black mb-2 block">Brand Name *</label>
                  <Input name="brandName" required value={formData.brandName} onChange={handleChange} className="bg-zinc-100/80 font-bold border-transparent focus-visible:ring-2 focus-visible:ring-primary h-12 px-5 rounded-2xl transition-all" placeholder="e.g. Techno Vibe Collectives" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-black mb-2 block">Description *</label>
                  <Textarea name="description" required value={formData.description} onChange={handleChange} rows={5} className="bg-zinc-100/80 font-bold border-transparent focus-visible:ring-2 focus-visible:ring-primary p-5 rounded-2xl transition-all resize-y" placeholder="What kind of events do you curate?" />
                </div>

                {/* Instagram Ownership Verification Card */}
                <div className="md:col-span-2 bg-gradient-to-br from-zinc-50 via-pink-50/20 to-purple-50/30 border border-black/5 p-5 sm:p-6 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-xs">
                        <InstagramIcon className="h-4 w-4 stroke-[2.5]" />
                      </div>
                      <label className="text-[11px] font-black uppercase tracking-widest text-black">
                        Business Instagram Account *
                      </label>
                    </div>
                    {instagramVerified ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 text-[10px] font-black uppercase tracking-wider">
                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                        Ownership Verified
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        OAuth Verification Required
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-500 font-medium mb-4 leading-relaxed">
                    To protect organizers and attendees against fraud, you must prove ownership of your business Instagram profile.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <Input
                        name="instagramUrl"
                        readOnly={instagramVerified}
                        disabled={instagramVerified}
                        value={formData.instagramUrl}
                        onChange={handleChange}
                        className={`bg-white font-bold border-black/10 focus-visible:ring-2 focus-visible:ring-primary h-12 px-5 rounded-2xl transition-all ${instagramVerified ? 'text-emerald-700 bg-emerald-50/40 border-emerald-300/60' : ''}`}
                        placeholder="https://instagram.com/yourbrand"
                      />
                      {instagramVerified && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    {instagramVerified ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleResetInstagram}
                        className="border-black/10 text-zinc-600 hover:text-black hover:bg-zinc-100 text-[10px] uppercase font-black px-5 h-12 rounded-2xl shrink-0 transition-colors"
                      >
                        Change Account
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={handleStartInstagramVerify}
                        disabled={instagramLoading || !isValidInstagramInput(formData.instagramUrl)}
                        className="bg-gradient-to-r from-amber-500 via-pink-600 to-purple-600 text-white text-[10px] uppercase font-black px-6 h-12 rounded-2xl hover:opacity-90 transition-all shadow-md hover:shadow-xl hover:-translate-y-0.5 duration-200 shrink-0 gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none"
                      >
                        {instagramLoading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <>
                            <InstagramIcon className="h-4 w-4" />
                            <span>Verify with Instagram</span>
                          </>
                        )}
                      </Button>
                    )}
                  </div>

                  {!instagramVerified && formData.instagramUrl.trim().length > 0 && !isValidInstagramInput(formData.instagramUrl) && (
                    <p className="text-[11px] font-bold text-amber-600 mt-2.5 flex items-center gap-1.5">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                      Please enter a valid Instagram URL (e.g. https://instagram.com/yourbrand) or @handle
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-black mb-2 block">Facebook URL (Optional)</label>
                  <Input name="facebookUrl" value={formData.facebookUrl} onChange={handleChange} className="bg-zinc-100/80 font-bold border-transparent focus-visible:ring-2 focus-visible:ring-primary h-12 px-5 rounded-2xl transition-all" placeholder="https://facebook.com/..." />
                </div>
              </div>

              <div className="border-t border-black/5 pt-6">
                <h3 className="text-sm font-black uppercase tracking-widest mb-4">Contact & Security Verification</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Email Address (Read-only from session) */}
                  <div className="bg-white border border-black/5 p-4 sm:p-5 rounded-3xl shadow-sm opacity-80">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black mb-3 block">Email Address (Linked Google Account)</label>
                    <Input
                      name="email"
                      readOnly
                      disabled
                      value={formData.email}
                      className="bg-zinc-100/80 font-bold border-transparent h-12 px-5 rounded-2xl cursor-not-allowed text-zinc-500"
                      placeholder="guardian@vibecheck.com"
                      type="email"
                    />
                  </div>

                  {/* Phone Verification Row */}
                  <div className="bg-white border border-black/5 p-4 sm:p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black mb-3 block">WhatsApp Number *</label>
                    <div className="flex flex-col lg:flex-row gap-3">
                      <Input
                        name="phone"
                        required
                        disabled={phoneVerified}
                        value={formData.phone}
                        onChange={handleChange}
                        className={`bg-zinc-100/80 font-bold border-transparent focus-visible:ring-2 focus-visible:ring-primary h-12 px-5 rounded-2xl transition-all flex-1 ${phoneVerified ? 'text-primary opacity-70' : ''}`}
                        placeholder="+91 99999 99999"
                      />
                      {phoneVerified ? (
                        <Button type="button" disabled className="bg-primary/20 text-primary border-none text-[10px] uppercase font-black px-6 h-12 rounded-2xl shrink-0">
                          <CheckCircle2 className="h-4 w-4 mr-2" /> Verified
                        </Button>
                      ) : (
                        <Button type="button" onClick={() => handleSendOtp("phone")} disabled={loading || !formData.phone} className="bg-black text-white text-[10px] uppercase font-black px-6 h-12 rounded-2xl hover:bg-primary hover:text-black transition-colors shadow-md hover:shadow-xl hover:-translate-y-0.5 duration-200 shrink-0">
                          Verify
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirement Checklist */}
              <div className="bg-zinc-50 border border-black/5 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-zinc-600">
                <span className="flex items-center gap-2">
                  {formData.brandName.trim() && formData.description.trim() ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-zinc-300" />
                  )}
                  Brand Details
                </span>
                <span className="flex items-center gap-2">
                  {phoneVerified ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-zinc-300" />
                  )}
                  WhatsApp Verified
                </span>
                <span className="flex items-center gap-2">
                  {instagramVerified ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-zinc-300" />
                  )}
                  Instagram Verified
                </span>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={
                    loading ||
                    !formData.brandName.trim() ||
                    !formData.description.trim() ||
                    !phoneVerified ||
                    !instagramVerified
                  }
                  className="w-full bg-primary text-black font-black italic tracking-tighter uppercase text-xl h-16 rounded-2xl hover:bg-primary/80 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-1 duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {organizerStatus === "rejected" ? "Re-Submit Application" : "Submit Application"}
                </Button>
                {(!formData.brandName.trim() || !formData.description.trim() || !phoneVerified || !instagramVerified) && (
                  <p className="text-center text-xs text-zinc-400 font-bold mt-4 flex items-center justify-center gap-2">
                    <ShieldAlert className="h-4 w-4" /> Please fill all mandatory fields (Brand Name, Description) and verify both WhatsApp & Instagram to submit
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Dev / Simulation Instagram Verification Modal */}
      {devInstagramModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-black/10 text-center space-y-5">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-pink-500/20">
              <InstagramIcon className="h-8 w-8 stroke-[2.5]" />
            </div>

            <div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Verify Instagram</h2>
              <p className="text-zinc-500 text-xs font-bold mt-2">
                Enter your Instagram handle. The system will verify its availability and lock it to your organizer account.
              </p>
            </div>

            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-zinc-400 text-base">@</span>
              <Input
                value={devInstagramModal.handle}
                onChange={(e) => setDevInstagramModal({ ...devInstagramModal, handle: e.target.value.replace(/^@/, '') })}
                placeholder="technovibes"
                className="pl-9 text-base font-bold h-14 bg-zinc-50 rounded-2xl"
                autoFocus
              />
            </div>

            <Button
              onClick={handleDevInstagramVerify}
              disabled={instagramLoading || !devInstagramModal.handle.trim()}
              className="w-full bg-gradient-to-r from-amber-500 via-pink-600 to-purple-600 text-white uppercase font-black tracking-widest text-xs h-12 hover:opacity-90 transition-opacity rounded-2xl"
            >
              {instagramLoading ? "Verifying Account..." : "Confirm & Link Handle"}
            </Button>

            <button
              onClick={() => setDevInstagramModal({ isOpen: false, handle: "" })}
              className="w-full text-center text-[10px] font-black uppercase text-zinc-400 hover:text-black pt-2 tracking-widest"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp OTP Verification Modal */}
      {verifyModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-black/10">
            <div className="text-center mb-8">
              <div className="h-16 w-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">Verify {verifyModal.type}</h2>
              <p className="text-zinc-500 text-xs font-bold mt-2 mb-4">Enter the 6-digit code sent to your WhatsApp</p>

              {timeLeft > 0 && (
                <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  WhatsApp OTP Sent!
                </div>
              )}
            </div>

            <Input
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder="123456"
              className="text-center text-3xl tracking-[0.5em] font-black h-16 bg-zinc-50 mb-6"
              maxLength={6}
            />

            <Button onClick={handleVerifyOtp} disabled={loading || otpCode.length < 6} className="w-full bg-black text-white uppercase font-black tracking-widest text-xs h-12 hover:bg-primary hover:text-black transition-colors mb-4">
              Confirm Code
            </Button>

            <div className="flex items-center justify-between mt-6 text-xs font-bold text-zinc-400 border-t border-black/5 pt-4">
              <span className="flex items-center gap-1"><Timer className="h-4 w-4" /> {formatTime(timeLeft)}</span>
              {timeLeft === 0 ? (
                <button onClick={() => handleSendOtp(verifyModal.type!)} className="text-primary hover:underline flex items-center gap-1 uppercase tracking-widest">
                  <RefreshCw className="h-3 w-3" /> Resend Code
                </button>
              ) : (
                <span className="uppercase tracking-widest opacity-50">Resend in {formatTime(timeLeft)}</span>
              )}
            </div>

            <button onClick={() => setVerifyModal({ isOpen: false, type: null })} className="w-full text-center text-[10px] font-black uppercase text-zinc-400 hover:text-black mt-6 tracking-widest">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


