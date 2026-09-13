import { useEffect, useRef } from "react";

type SwipeDirection = "left" | "right" | "up" | "down";

type SwipeGestureOptions = {
  onSwipe?: (direction: SwipeDirection) => void;
  threshold?: number; // Min pixels to detect swipe (default: 50)
  preventDefault?: boolean; // Prevent default touch behavior (default: true)
};

/**
 * Hook to detect swipe gestures on touch devices
 * Useful for mobile navigation (swipe between posts, tabs, etc.)
 */
export function useSwipeGesture(ref: React.RefObject<HTMLElement>, options: SwipeGestureOptions = {}) {
  const { onSwipe, threshold = 50, preventDefault = true } = options;
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const { x: startX, y: startY, time: startTime } = touchStartRef.current;
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const endTime = Date.now();

      const distX = endX - startX;
      const distY = endY - startY;
      const absDist = Math.sqrt(distX * distX + distY * distY);
      const duration = endTime - startTime;

      // Detect swipe: at least threshold distance, less than 500ms
      if (absDist > threshold && duration < 500) {
        const direction = Math.abs(distX) > Math.abs(distY) 
          ? (distX > 0 ? "right" : "left")
          : (distY > 0 ? "down" : "up");

        if (preventDefault) {
          e.preventDefault();
        }

        onSwipe?.(direction);
      }
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: true });
    element.addEventListener("touchend", handleTouchEnd, { passive: !preventDefault });

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchend", handleTouchEnd);
    };
  }, [ref, onSwipe, threshold, preventDefault]);
}

/**
 * Hook for detecting horizontal swipes specifically (left/right)
 * Common for post/tab navigation
 */
export function useHorizontalSwipe(
  ref: React.RefObject<HTMLElement>,
  onLeft: () => void,
  onRight: () => void,
  threshold = 50
) {
  useSwipeGesture(ref, {
    onSwipe: (direction) => {
      if (direction === "left") onLeft();
      if (direction === "right") onRight();
    },
    threshold,
  });
}

/**
 * Hook for detecting vertical swipes specifically (up/down)
 * Common for dismiss/expand gestures
 */
export function useVerticalSwipe(
  ref: React.RefObject<HTMLElement>,
  onUp: () => void,
  onDown: () => void,
  threshold = 50
) {
  useSwipeGesture(ref, {
    onSwipe: (direction) => {
      if (direction === "up") onUp();
      if (direction === "down") onDown();
    },
    threshold,
  });
}
