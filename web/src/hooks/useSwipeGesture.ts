import { useRef, useCallback, useEffect } from "react";

export interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  maxDuration?: number;
  directionalRatio?: number;
  disabled?: boolean;
}

export function useSwipeGesture<T extends HTMLElement = HTMLDivElement>(
  options: SwipeGestureOptions
) {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 40,
    maxDuration = 600,
    directionalRatio = 1.2,
    disabled = false,
  } = options;

  const elementRef = useRef<T | null>(null);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);

  // Keep options in a ref to avoid stale closures in event handlers
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent | TouchEvent) => {
      if (disabled) return;
      if (e.touches.length !== 1) {
        touchStartRef.current = null;
        touchEndRef.current = null;
        return;
      }
      const touch = e.touches[0];
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
      };
      touchEndRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
    },
    [disabled]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent | TouchEvent) => {
      if (disabled || !touchStartRef.current) return;
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      touchEndRef.current = {
        x: touch.clientX,
        y: touch.clientY,
      };
    },
    [disabled]
  );

  const handleTouchEnd = useCallback(() => {
    if (disabled || !touchStartRef.current || !touchEndRef.current) {
      touchStartRef.current = null;
      touchEndRef.current = null;
      return;
    }

    const { x: startX, y: startY, time: startTime } = touchStartRef.current;
    const { x: endX, y: endY } = touchEndRef.current;
    const duration = Date.now() - startTime;

    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    const currentThreshold = optionsRef.current.threshold ?? threshold;
    const currentMaxDuration = optionsRef.current.maxDuration ?? maxDuration;
    const currentRatio = optionsRef.current.directionalRatio ?? directionalRatio;

    if (duration <= currentMaxDuration) {
      // Check horizontal swipe
      if (absX >= currentThreshold && absX > absY * currentRatio) {
        if (deltaX < 0) {
          optionsRef.current.onSwipeLeft?.();
        } else {
          optionsRef.current.onSwipeRight?.();
        }
      }
      // Check vertical swipe
      else if (absY >= currentThreshold && absY > absX * currentRatio) {
        if (deltaY < 0) {
          optionsRef.current.onSwipeUp?.();
        } else {
          optionsRef.current.onSwipeDown?.();
        }
      }
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  }, [disabled, threshold, maxDuration, directionalRatio]);

  const handleTouchCancel = useCallback(() => {
    touchStartRef.current = null;
    touchEndRef.current = null;
  }, []);

  // DOM listeners for ref attachment
  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchmove", handleTouchMove, { passive: true });
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("touchcancel", handleTouchCancel);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchcancel", handleTouchCancel);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  return {
    ref: elementRef,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onTouchCancel: handleTouchCancel,
    },
  };
}
