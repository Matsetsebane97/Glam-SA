import { useRef, useState, useCallback } from "react";

const PULL_THRESHOLD = 80; // px — distance to pull before refresh triggers
const FRICTION = 0.6; // friction coefficient for resistance

type UsePullToRefreshOptions = {
  onRefresh: () => Promise<void>;
  threshold?: number;
};

export function usePullToRefresh({
  onRefresh,
  threshold = PULL_THRESHOLD,
}: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isScrolledRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only track pull if we're at the top of the scroll container
    const container = scrollContainerRef.current;
    if (container && container.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
      isScrolledRef.current = false;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isRefreshing) return;

    const container = scrollContainerRef.current;
    if (!container || container.scrollTop > 0) {
      isScrolledRef.current = true;
      setPullDistance(0);
      return;
    }

    if (isScrolledRef.current) {
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const delta = currentY - touchStartY.current;

    // Only allow downward pull
    if (delta > 0) {
      // Apply friction resistance as user pulls further
      const resistance = Math.pow(delta, FRICTION);
      setPullDistance(Math.min(resistance, threshold * 1.5));
    }
  }, [isRefreshing, threshold]);

  const handleTouchEnd = useCallback(async () => {
    if (isRefreshing || pullDistance < threshold) {
      setPullDistance(0);
      return;
    }

    setIsRefreshing(true);
    setPullDistance(0);

    try {
      await onRefresh();
    } catch (error) {
      // Error already handled by parent component via onRefresh callback
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, pullDistance, threshold, onRefresh]);

  return {
    pullDistance,
    isRefreshing,
    scrollContainerRef,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
  };
}
