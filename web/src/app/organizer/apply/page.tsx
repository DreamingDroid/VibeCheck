"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ShieldAlert, Timer, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function OrganizerApplyPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    brandName: "",
    description: "",
    facebookUrl: "",
    instagramUrl: "",
    email: "",
    phone: "",
  });

  const [emailVerified, setEmailVerified] = useState(false);
  const [emailToken, setEmailToken] = useState("");
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneToken, setPhoneToken] = useState("");

  const [verifyModal, setVerifyModal] = useState<{ isOpen: boolean; type: "email" | "phone" | null }>({ isOpen: false, type: null });
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(180); // 3 minutes = 180 seconds

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (verifyModal.isOpen && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0) {
      // Timer hit 0
    }
    return () => clearInterval(timer);
  }, [verifyModal.isOpen, timeLeft]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSendOtp = async (type: "email" | "phone") => {
    const value = type === "email" ? formData.email : formData.phone;
    if (!value) {
      toast.error(`Please enter your ${type} first.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/apply/send-otp", {
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
    const value = verifyModal.type === "email" ? formData.email : formData.phone;

    try {
      const res = await fetch("http://localhost:4000/api/apply/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: verifyModal.type, value, code: otpCode }),
      });
      const data = await res.json();
      if (data.success) {
        if (verifyModal.type === "email") {
          setEmailVerified(true);
          setEmailToken(data.token);
        } else {
          setPhoneVerified(true);
          setPhoneToken(data.token);
        }
        toast.success(`${verifyModal.type} verified successfully!`);
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
    if (!emailVerified || !phoneVerified) {
      toast.error("Please verify both email and phone number before submitting.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("http://localhost:4000/api/apply/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, emailToken, phoneToken }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Application submitted successfully! Please wait for admin approval.");
        router.push("/");
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

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-12 md:py-20 px-4">
      <div className="max-w-4xl w-full">
        <h1 className="text-5xl font-black italic tracking-tighter uppercase mb-4 text-center">Become a <span className="text-primary">Guardian</span></h1>
        <p className="text-zinc-500 text-sm font-bold text-center mb-12 uppercase tracking-widest">Apply to organize events on VibeCheck</p>

        <Card className="ringer-card border-none bg-white shadow-xl">
          <CardHeader className="border-b border-black/5 bg-zinc-50/50 pb-8">
            <CardTitle className="text-xl font-black uppercase tracking-tight">Your Vibe Identity</CardTitle>
            <CardDescription className="text-zinc-400 font-bold text-xs uppercase tracking-widest mt-2">Drop your details and let the people know who's setting the stage</CardDescription>
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
                  {/* Email Verification Row */}
                  <div className="bg-white border border-black/5 p-4 sm:p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                    <label className="text-[10px] font-black uppercase tracking-widest text-black mb-3 block">Email Address *</label>
                    <div className="flex flex-col lg:flex-row gap-3">
                      <Input 
                        name="email" 
                        required 
                        disabled={emailVerified} 
                        value={formData.email} 
                        onChange={handleChange} 
                        className={`bg-zinc-100/80 font-bold border-transparent focus-visible:ring-2 focus-visible:ring-primary h-12 px-5 rounded-2xl transition-all flex-1 ${emailVerified ? 'text-primary opacity-70' : ''}`} 
                        placeholder="guardian@vibecheck.com" 
                        type="email" 
                      />
                      {emailVerified ? (
                        <Button type="button" disabled className="bg-primary/20 text-primary border-none text-[10px] uppercase font-black px-6 h-12 rounded-2xl shrink-0"><CheckCircle2 className="h-4 w-4 mr-2" /> Verified</Button>
                      ) : (
                        <Button type="button" onClick={() => handleSendOtp("email")} disabled={loading || !formData.email} className="bg-black text-white text-[10px] uppercase font-black px-6 h-12 rounded-2xl hover:bg-primary hover:text-black transition-colors shadow-md hover:shadow-xl hover:-translate-y-0.5 duration-200 shrink-0">Verify</Button>
                      )}
                    </div>
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
                        <Button type="button" disabled className="bg-primary/20 text-primary border-none text-[10px] uppercase font-black px-6 h-12 rounded-2xl shrink-0"><CheckCircle2 className="h-4 w-4 mr-2" /> Verified</Button>
                      ) : (
                        <Button type="button" onClick={() => handleSendOtp("phone")} disabled={loading || !formData.phone} className="bg-black text-white text-[10px] uppercase font-black px-6 h-12 rounded-2xl hover:bg-primary hover:text-black transition-colors shadow-md hover:shadow-xl hover:-translate-y-0.5 duration-200 shrink-0">Verify</Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <Button type="submit" disabled={loading || !emailVerified || !phoneVerified} className="w-full bg-primary text-black font-black italic tracking-tighter uppercase text-xl h-16 rounded-2xl hover:bg-primary/80 transition-colors shadow-lg hover:shadow-xl hover:-translate-y-1 duration-300">
                  Submit Application
                </Button>
                {(!emailVerified || !phoneVerified) && (
                  <p className="text-center text-xs text-zinc-400 font-bold mt-4 flex items-center justify-center gap-2">
                    <ShieldAlert className="h-4 w-4" /> Please verify contact details to continue
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
              <p className="text-zinc-500 text-xs font-bold mt-2 mb-4">Enter the 6-digit code sent to your {verifyModal.type}</p>
              
              {timeLeft > 0 && (
                <div className="inline-flex items-center gap-2 bg-primary/20 text-primary px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest animate-in fade-in zoom-in slide-in-from-bottom-2 duration-300">
                  <CheckCircle2 className="h-3.5 w-3.5" /> 
                  {verifyModal.type} OTP Sent!
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
