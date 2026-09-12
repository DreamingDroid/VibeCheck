"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ShieldAlert, Timer, RefreshCw, Clock, AlertCircle, ArrowLeft, Sparkles, Check, ChevronRight } from "lucide-react";
import { toast } from "sonner";

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

  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneToken, setPhoneToken] = useState("");

  const [verifyModal, setVerifyModal] = useState<{ isOpen: boolean; type: "phone" | null }>({ isOpen: false, type: null });
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [organizerStatus, setOrganizerStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes = 180 seconds

  // Prefill email and check existing organizer status
  useEffect(() => {
    if (session?.user?.email) {
      setFormData((prev) => ({ ...prev, email: session?.user?.email || "" }));

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
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

  const handleSendOtp = async (type: "phone") => {
    const value = formData.phone;
    if (!value) {
      toast.error(`Please enter your WhatsApp number first.`);
      return;
    }

    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
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
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
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

    setLoading(true);
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/apply/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, phoneToken }),
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
                      <h4 className="text-xs font-black uppercase text-zinc-800">Application Submitted</h4>
                      <p className="text-[11px] font-medium text-zinc-500">Your brand details and WhatsApp verification were recorded.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 animate-pulse shadow-xs">
                      <Clock className="h-3.5 w-3.5 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase text-amber-700">SuperAdmin Review in Progress</h4>
                      <p className="text-[11px] font-medium text-zinc-500">Our administrators are validating your organizer credentials and brand info.</p>
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
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-black mb-2 block">Instagram URL</label>
                  <Input name="instagramUrl" value={formData.instagramUrl} onChange={handleChange} className="bg-zinc-100/80 font-bold border-transparent focus-visible:ring-2 focus-visible:ring-primary h-12 px-5 rounded-2xl transition-all" placeholder="https://instagram.com/..." />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-black mb-2 block">Facebook URL</label>
                  <Input name="facebookUrl" value={formData.facebookUrl} onChange={handleChange} className="bg-zinc-100/80 font-bold border-transparent focus-visible:ring-2 focus-visible:ring-primary h-12 px-5 rounded-2xl transition-all" placeholder="https://facebook.com/..." />
                </div>
              </div>

              <div className="border-t border-black/5 pt-6">
                <h3 className="text-sm font-black uppercase tracking-widest mb-4">Contact & Verification</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Email Address (Read-only from session) */}
                  <div className="bg-white border border-black/5 p-4 sm:p-5 rounded-3xl shadow-sm opacity-80">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black mb-3 block">Email Address (Linked Account)</label>
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

              <div className="pt-6">
                <Button type="submit" disabled={loading || !phoneVerified} className="w-full bg-primary text-black font-black italic tracking-tighter uppercase text-xl h-16 rounded-2xl hover:bg-primary/80 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-1 duration-300">
                  {organizerStatus === "rejected" ? "Re-Submit Application" : "Submit Application"}
                </Button>
                {!phoneVerified && (
                  <p className="text-center text-xs text-zinc-400 font-bold mt-4 flex items-center justify-center gap-2">
                    <ShieldAlert className="h-4 w-4" /> Please verify your WhatsApp number to continue
                  </p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Verification Modal */}
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

