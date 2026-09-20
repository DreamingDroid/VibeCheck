"use client";

import { useState, useRef, useEffect } from "react";
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
import { useSwipeToClose } from "@/hooks/useSwipeToClose";

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
  const [digits, setDigits] = useState<string[]>(Array(10).fill(""));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [verificationCode, setVerificationCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastFailedPhone, setLastFailedPhone] = useState("");

  const swipeRef = useSwipeToClose(onClose);
  const phoneNumber = digits.join("");

  // Focus the first digit input when opening modal in phone step
  useEffect(() => {
    if (isOpen && step === "phone") {
      const timer = setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, step]);

  const handleDigitChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    const char = rawValue.slice(-1); // Take the latest typed digit

    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (newDigits.join("") !== lastFailedPhone) {
      setError("");
    }

    // Auto-advance cursor/focus to the next box once current box has a value
    if (char && index < 9) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const newDigits = [...digits];
      if (digits[index]) {
        newDigits[index] = "";
        setDigits(newDigits);
      } else if (index > 0) {
        newDigits[index - 1] = "";
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < 9) {
      e.preventDefault();
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData("text").replace(/\D/g, "");
    let clean = pastedText;
    if (clean.length === 12 && clean.startsWith("91")) {
      clean = clean.slice(2);
    }
    clean = clean.slice(0, 10);
    if (!clean) return;

    const newDigits = [...digits];
    for (let i = 0; i < 10; i++) {
      if (i < clean.length) {
        newDigits[i] = clean[i];
      }
    }
    setDigits(newDigits);
    if (newDigits.join("") !== lastFailedPhone) {
      setError("");
    }
    const targetFocusIndex = Math.min(clean.length, 9);
    inputRefs.current[targetFocusIndex]?.focus();
  };

  const handleSendCode = async () => {
    const rawNumber = digits.join("");
    if (!rawNumber || rawNumber.length < 10) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      const res = await fetch(`${baseUrl}/api/verify/send-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber: rawNumber, email }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("code");
      } else {
        setError(data.error || "Failed to send code");
        if (data.error?.includes("already registered")) {
          setLastFailedPhone(rawNumber);
        }
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const rawNumber = digits.join("");
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
        body: JSON.stringify({ phoneNumber: rawNumber, code: verificationCode, email }),
      });
      const data = await res.json();
      if (data.success) {
        setError("");
        setVerificationCode("");
        setDigits(Array(10).fill(""));
        setStep("phone");
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
      <DialogContent showCloseButton={false} className="sm:max-w-md bg-white/95 backdrop-blur-2xl border-black/5 text-black rounded-[40px] shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
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
              <div className="flex items-center justify-between ml-1">
                <Label className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                  Phone Number
                </Label>
                <span className="text-[10px] font-black uppercase tracking-wider bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-md border border-black/5">
                  🇮🇳 +91
                </span>
              </div>
              <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    className={`h-12 w-full text-center text-base sm:text-lg font-black bg-zinc-50 border rounded-2xl focus:bg-white focus:ring-2 focus:ring-primary/30 outline-none transition-all p-0 ${
                      digit ? "border-black/30 bg-white text-black" : "border-black/10 text-zinc-800"
                    } focus:border-primary`}
                  />
                ))}
              </div>
              <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tight ml-1">
                Enter your 10-digit mobile number for WhatsApp verification
              </p>
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
              disabled={loading || phoneNumber.length !== 10 || (!!error && phoneNumber === lastFailedPhone)}
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
