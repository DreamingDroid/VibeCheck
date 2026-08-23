"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PhoneVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: () => void;
  email: string;
}

export function PhoneVerificationModal({
  isOpen,
  onClose,
  onVerified,
  email,
}: PhoneVerificationModalProps) {
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFailedPhone, setLastFailedPhone] = useState("");

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/verify/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, email }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("code");
      } else {
        setError(data.error || "Failed to send code");
        if (data.error?.includes("already registered")) {
          setLastFailedPhone(phoneNumber);
        }
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/verify/confirm-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, code: verificationCode, email }),
      });
      const data = await res.json();
      if (data.success) {
        onVerified();
      } else {
        setError(data.error || "Invalid verification code");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="top-6 sm:top-12 translate-y-0 sm:max-w-md bg-white/95 backdrop-blur-2xl border-black/5 text-black rounded-[40px] shadow-2xl p-8 fixed">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-black/5 transition-all text-zinc-400 hover:text-black z-10"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-3xl font-black italic tracking-tighter uppercase leading-none">
            {step === "phone" ? "Verify Phone" : "Enter Code"}
          </DialogTitle>
          <DialogDescription className="text-zinc-500 text-sm font-bold leading-relaxed">
            {step === "phone"
              ? "Organizers need your number to reach out. We'll send a code to your WhatsApp."
              : `Enter the 6-digit code sent to your WhatsApp number.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <div className="p-4 bg-red-50 text-red-500 text-xs font-black uppercase tracking-widest rounded-2xl border border-red-100 animate-in shake">
              {error}
            </div>
          )}

          {step === "phone" ? (
            <div className="space-y-3">
              <Label htmlFor="phone" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Phone Number</Label>
              <Input
                id="phone"
                placeholder="E.G. 9876543210"
                value={phoneNumber}
                onChange={(e) => {
                  setPhoneNumber(e.target.value);
                  if (e.target.value !== lastFailedPhone) {
                    setError("");
                  }
                }}
                className="bg-zinc-50 border-black/5 h-14 rounded-2xl text-sm font-black focus:ring-primary shadow-sm"
              />
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight ml-1">Includes country code (default 91 for India)</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Label htmlFor="code" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 ml-1">Verification Code</Label>
              <Input
                id="code"
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="bg-zinc-50 border-black/5 h-14 rounded-2xl text-center tracking-[0.5em] text-xl font-black focus:ring-primary shadow-sm"
              />
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4">
          <Button
            variant="ghost"
            onClick={onClose}
            className="ringer-button border-2 border-black/5 bg-transparent text-black hover:bg-black/5 h-12 text-[10px]"
          >
            CANCEL
          </Button>
          {step === "phone" ? (
            <Button
              onClick={handleSendCode}
              disabled={loading || phoneNumber.replace(/\D/g, "").length !== 10 || (!!error && phoneNumber === lastFailedPhone)}
              className="ringer-button bg-primary text-black hover:scale-[1.02] h-12 text-[10px]"
            >
              {loading ? "SENDING..." : "SEND CODE"}
            </Button>
          ) : (
            <Button
              onClick={handleVerifyCode}
              disabled={loading}
              className="ringer-button bg-primary text-black hover:scale-[1.02] h-12 text-[10px]"
            >
              {loading ? "VERIFYING..." : "VERIFY & RSVP"}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
