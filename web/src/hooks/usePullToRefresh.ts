import { useEffect, useState, useCallback } from 'react';

export function usePullToRefresh(onRefresh: () => Promise<void> | void, pullThreshold = 80) {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let startY = 0;
    let currentY = 0;
    let isAtTop = true;

    const handleTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0) {
        isAtTop = false;
        return;
      }
      isAtTop = true;
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isAtTop || isRefreshing) return;

      currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 0) {
        // Prevent default only if we are actively pulling down at the top of the page
        if (e.cancelable) {
          e.preventDefault();
        }
        setIsPulling(true);
        // Add some resistance to the pull
        const distance = Math.min(diff * 0.5, pullThreshold + 20);
        setPullDistance(distance);
      }
    };

    const handleTouchEnd = async () => {
      if (!isPulling || isRefreshing) return;

      if (pullDistance >= pullThreshold) {
        setIsRefreshing(true);
        setPullDistance(pullThreshold); // Hold at threshold while refreshing
        
        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
          setIsPulling(false);
        }
      } else {
        // Did not reach threshold, snap back
        setPullDistance(0);
        setIsPulling(false);
      }
    };

    // Use passive: false to allow e.preventDefault() during pull
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onRefresh, isRefreshing, pullDistance, pullThreshold]);

  return { isPulling, pullDistance, isRefreshing };
}
