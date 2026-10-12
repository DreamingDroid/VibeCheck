"use client";

import { useState, useEffect, useRef } from "react";

export interface CountdownResult {
  hours: string;
  minutes: string;
  seconds: string;
  totalSeconds: number;
  isExpired: boolean;
  formatted: string;
}

export function useCountdown(
  expiresAt: string | null | undefined,
  onExpire?: () => void
): CountdownResult {
  const [totalSeconds, setTotalSeconds] = useState<number>(() => {
    if (!expiresAt) return 0;
    const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
    return Math.max(0, diff);
  });

  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const hasTriggeredExpire = useRef(false);

  useEffect(() => {
    if (!expiresAt) {
      setTotalSeconds(0);
      return;
    }

    const calculateRemaining = () => {
      const diff = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
      if (diff <= 0) {
        setTotalSeconds(0);
        if (!hasTriggeredExpire.current) {
          hasTriggeredExpire.current = true;
          onExpireRef.current?.();
        }
      } else {
        setTotalSeconds(diff);
      }
    };

    // Calculate immediately
    calculateRemaining();

    const intervalId = setInterval(calculateRemaining, 1000);

    return () => clearInterval(intervalId);
  }, [expiresAt]);

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");

  const formattedHours = pad(hours);
  const formattedMinutes = pad(minutes);
  const formattedSeconds = pad(seconds);

  return {
    hours: formattedHours,
    minutes: formattedMinutes,
    seconds: formattedSeconds,
    totalSeconds,
    isExpired: totalSeconds <= 0,
    formatted: `${formattedHours}h : ${formattedMinutes}m : ${formattedSeconds}s`,
  };
}
