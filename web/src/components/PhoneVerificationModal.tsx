"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      setError("Please enter a valid phone number");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("http://localhost:4000/api/verify/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, email }),
      });
      const data = await res.json();
      if (data.success) {
        setStep("code");
      } else {
        setError(data.error || "Failed to send code");
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
      const res = await fetch("http://localhost:4000/api/verify/confirm-code", {
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
      <DialogContent className="sm:max-w-md bg-zinc-900 border-zinc-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {step === "phone" ? "Verify Phone Number" : "Enter Verification Code"}
          </DialogTitle>
          <DialogDescription className="text-zinc-400">
            {step === "phone"
              ? "Organizers need your number to reach out. We'll send a code to your WhatsApp."
              : `Enter the 6-digit code sent to your WhatsApp number.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}

          {step === "phone" ? (
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="e.g. 9876543210"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="bg-zinc-800 border-zinc-700 focus:ring-indigo-500"
              />
              <p className="text-xs text-zinc-500">Includes country code (default 91 for India)</p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                className="bg-zinc-800 border-zinc-700 focus:ring-indigo-500 text-center tracking-widest text-lg font-bold"
              />
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2 border-t-0 bg-transparent">
          <Button
            variant="ghost"
            onClick={onClose}
            className="hover:bg-zinc-800 text-zinc-400"
          >
            Cancel
          </Button>
          {step === "phone" ? (
            <Button
              onClick={handleSendCode}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? "Sending..." : "Send Verification Code"}
            </Button>
          ) : (
            <Button
              onClick={handleVerifyCode}
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {loading ? "Verifying..." : "Verify & RSVP"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
