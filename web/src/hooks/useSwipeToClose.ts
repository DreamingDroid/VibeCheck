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
        // Dragging down
        element.style.transform = `translateY(${diff}px)`;
        if (e.cancelable) e.preventDefault(); // Prevent background scroll
      }
    };

    const handleTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      
      const diff = currentY - startY;
      element.style.transition = 'transform 0.3s ease-out';
      
      if (diff > threshold) {
        // Swipe successful, push it down out of view then close
        element.style.transform = `translateY(100vh)`;
        setTimeout(() => {
          onClose();
          // Reset for next open
          setTimeout(() => {
            if (element) element.style.transform = 'none';
          }, 100);
        }, 300);
      } else {
        // Snap back
        element.style.transform = 'translateY(0)';
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
