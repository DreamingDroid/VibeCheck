import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSwipeGesture } from "@/hooks/useSwipeGesture";

describe("useSwipeGesture", () => {
  it("triggers onSwipeLeft when swiping left horizontally beyond threshold", () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();

    const { result } = renderHook(() =>
      useSwipeGesture({
        onSwipeLeft,
        onSwipeRight,
        threshold: 40,
        maxDuration: 500,
      })
    );

    act(() => {
      // Touch start at (200, 100)
      result.current.handlers.onTouchStart({
        touches: [{ clientX: 200, clientY: 100 }],
      } as any);

      // Touch move to (100, 105)
      result.current.handlers.onTouchMove({
        touches: [{ clientX: 100, clientY: 105 }],
      } as any);

      // Touch end
      result.current.handlers.onTouchEnd();
    });

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it("triggers onSwipeRight when swiping right horizontally beyond threshold", () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();

    const { result } = renderHook(() =>
      useSwipeGesture({
        onSwipeLeft,
        onSwipeRight,
        threshold: 40,
      })
    );

    act(() => {
      // Touch start at (100, 100)
      result.current.handlers.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as any);

      // Touch move to (220, 95)
      result.current.handlers.onTouchMove({
        touches: [{ clientX: 220, clientY: 95 }],
      } as any);

      // Touch end
      result.current.handlers.onTouchEnd();
    });

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
    expect(onSwipeLeft).not.toHaveBeenCalled();
  });

  it("does not trigger swipe if distance is below threshold", () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();

    const { result } = renderHook(() =>
      useSwipeGesture({
        onSwipeLeft,
        onSwipeRight,
        threshold: 50,
      })
    );

    act(() => {
      // Minor movement of 20px
      result.current.handlers.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as any);

      result.current.handlers.onTouchMove({
        touches: [{ clientX: 80, clientY: 100 }],
      } as any);

      result.current.handlers.onTouchEnd();
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it("does not trigger horizontal swipe if movement is predominantly vertical (e.g. scrolling)", () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();

    const { result } = renderHook(() =>
      useSwipeGesture({
        onSwipeLeft,
        onSwipeRight,
        threshold: 40,
        directionalRatio: 1.2,
      })
    );

    act(() => {
      // Swiping vertically (scrolling down page) with small horizontal drift
      result.current.handlers.onTouchStart({
        touches: [{ clientX: 100, clientY: 100 }],
      } as any);

      result.current.handlers.onTouchMove({
        touches: [{ clientX: 50, clientY: 250 }],
      } as any);

      result.current.handlers.onTouchEnd();
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it("does not trigger if disabled", () => {
    const onSwipeLeft = vi.fn();

    const { result } = renderHook(() =>
      useSwipeGesture({
        onSwipeLeft,
        disabled: true,
      })
    );

    act(() => {
      result.current.handlers.onTouchStart({
        touches: [{ clientX: 200, clientY: 100 }],
      } as any);
      result.current.handlers.onTouchMove({
        touches: [{ clientX: 50, clientY: 100 }],
      } as any);
      result.current.handlers.onTouchEnd();
    });

    expect(onSwipeLeft).not.toHaveBeenCalled();
  });
});
