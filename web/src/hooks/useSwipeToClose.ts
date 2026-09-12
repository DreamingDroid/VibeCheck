import { useEffect, useRef } from 'react';

export function useSwipeToClose(onClose: () => void, threshold = 100) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    let startY = 0;
    let currentY = 0;
    let isDragging = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only initiate drag if the modal content itself isn't scrolling down
      if (element.scrollTop > 0) return;
      startY = e.touches[0].clientY;
      isDragging = true;
      element.style.transition = 'none';
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      if (diff > 0) {
        // Dragging down: preserve -50% centering on both X and Y
        element.style.transform = `translate(-50%, calc(-50% + ${diff}px))`;
        if (e.cancelable) e.preventDefault(); // Prevent background scroll
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      
      const diff = currentY - startY;
      element.style.transition = 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)';
      
      if (diff > threshold) {
        // Swipe successful, push it down out of view then close
        element.style.transform = `translate(-50%, 100vh)`;
        setTimeout(() => {
          onClose();
          // Reset for next open
          setTimeout(() => {
            if (element) {
              element.style.transform = '';
              element.style.transition = '';
            }
          }, 150);
        }, 300);
      } else {
        // Snap back to centered position and clear inline transform
        element.style.transform = '';
        setTimeout(() => {
          if (element) {
            element.style.transition = '';
          }
        }, 300);
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd);

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onClose, threshold]);

  return ref;
}
