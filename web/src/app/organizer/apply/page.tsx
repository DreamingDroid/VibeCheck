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
        toast.success(`${type} OTP sent!`);
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
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center py-20 px-4">
      <div className="max-w-2xl w-full">
        <h1 className="text-5xl font-black italic tracking-tighter uppercase mb-4 text-center">Become a Guardian</h1>
        <p className="text-zinc-500 text-sm font-bold text-center mb-12 uppercase tracking-widest">Apply to organize events on VibeCheck</p>

        <Card className="ringer-card border-none bg-white shadow-xl">
          <CardHeader className="border-b border-black/5 bg-zinc-50/50 pb-8">
            <CardTitle className="text-xl font-black uppercase tracking-tight">Organization Profile</CardTitle>
            <CardDescription className="text-zinc-400 font-bold text-xs uppercase tracking-widest mt-2">Tell us about your brand</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-black mb-2 block">Brand Name *</label>
                  <Input name="brandName" required value={formData.brandName} onChange={handleChange} className="bg-zinc-50 font-bold border-black/5" placeholder="e.g. Techno Vibe Collectives" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-black mb-2 block">Description *</label>
                  <Textarea name="description" required value={formData.description} onChange={handleChange} className="bg-zinc-50 font-bold border-black/5 h-32" placeholder="What kind of events do you curate?" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-black mb-2 block">Instagram URL</label>
                    <Input name="instagramUrl" value={formData.instagramUrl} onChange={handleChange} className="bg-zinc-50 font-bold border-black/5 text-xs" placeholder="https://instagram.com/..." />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-black mb-2 block">Facebook URL</label>
                    <Input name="facebookUrl" value={formData.facebookUrl} onChange={handleChange} className="bg-zinc-50 font-bold border-black/5 text-xs" placeholder="https://facebook.com/..." />
                  </div>
                </div>
              </div>

              <div className="border-t border-black/5 pt-8 space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest mb-6">Contact & Verification</h3>
                
                {/* Email Verification Row */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-black mb-2 block">Email Address *</label>
                  <div className="flex gap-2">
                    <Input 
                      name="email" 
                      required 
                      disabled={emailVerified} 
                      value={formData.email} 
                      onChange={handleChange} 
                      className={`bg-zinc-50 font-bold border-black/5 ${emailVerified ? 'text-primary' : ''}`} 
                      placeholder="guardian@vibecheck.com" 
                      type="email" 
                    />
                    {emailVerified ? (
                      <Button type="button" disabled className="bg-primary/20 text-primary border-none text-[10px] uppercase font-black px-6"><CheckCircle2 className="h-4 w-4 mr-2" /> Verified</Button>
                    ) : (
                      <Button type="button" onClick={() => handleSendOtp("email")} disabled={loading || !formData.email} className="bg-black text-white text-[10px] uppercase font-black px-6 hover:bg-primary hover:text-black transition-colors">Verify</Button>
                    )}
                  </div>
                </div>

                {/* Phone Verification Row */}
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-black mb-2 block">WhatsApp Number *</label>
                  <div className="flex gap-2">
                    <Input 
                      name="phone" 
                      required 
                      disabled={phoneVerified} 
                      value={formData.phone} 
                      onChange={handleChange} 
                      className={`bg-zinc-50 font-bold border-black/5 ${phoneVerified ? 'text-primary' : ''}`} 
                      placeholder="+91 99999 99999" 
                    />
                    {phoneVerified ? (
                      <Button type="button" disabled className="bg-primary/20 text-primary border-none text-[10px] uppercase font-black px-6"><CheckCircle2 className="h-4 w-4 mr-2" /> Verified</Button>
                    ) : (
                      <Button type="button" onClick={() => handleSendOtp("phone")} disabled={loading || !formData.phone} className="bg-black text-white text-[10px] uppercase font-black px-6 hover:bg-primary hover:text-black transition-colors">Verify</Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-8">
                <Button type="submit" disabled={loading || !emailVerified || !phoneVerified} className="w-full bg-primary text-black font-black italic tracking-tighter uppercase text-xl py-8 hover:bg-primary/80 transition-colors shadow-lg">
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
              <p className="text-zinc-500 text-xs font-bold mt-2">Enter the 6-digit code sent to your {verifyModal.type}</p>
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
