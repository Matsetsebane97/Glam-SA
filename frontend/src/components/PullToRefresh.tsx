import type { ReactNode } from "react";

const REFRESH_THRESHOLD = 80;

type PullToRefreshProps = {
  pullDistance: number;
  isRefreshing: boolean;
  children: ReactNode;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
};

export function PullToRefresh({
  pullDistance,
  isRefreshing,
  children,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  scrollRef,
}: PullToRefreshProps) {
  // Calculate spinner rotation and opacity based on pull distance
  const rotation = Math.min((pullDistance / REFRESH_THRESHOLD) * 180, 180);
  const opacity = Math.min(pullDistance / REFRESH_THRESHOLD, 1);
  const readyToRefresh = pullDistance >= REFRESH_THRESHOLD;

  return (
    <div
      ref={scrollRef}
      className="pull-to-refresh-container"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="pull-to-refresh-indicator"
        style={{
          opacity: Math.max(opacity, 0.3),
          transform: `translateY(${Math.max(pullDistance - 60, 0)}px)`,
          transition: isRefreshing ? "none" : "all 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div
          className="pull-to-refresh-spinner"
          style={{
            transform: isRefreshing ? "rotate(360deg)" : `rotate(${rotation}deg)`,
            transition: isRefreshing
              ? "transform 0.6s linear infinite"
              : "transform 0.2s ease-out",
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
            <path d="M3 21v-5h5" />
          </svg>
        </div>
      </div>

      {/* Pull label */}
      {!isRefreshing && pullDistance > 20 && (
        <div
          className="pull-to-refresh-label"
          style={{
            opacity: Math.min((pullDistance / REFRESH_THRESHOLD) * 2, 1),
            transform: `translateY(${Math.max(pullDistance - 60, 0)}px)`,
          }}
        >
          <span>{readyToRefresh ? "Release to refresh" : "Pull to refresh"}</span>
        </div>
      )}

      {/* Refreshing label */}
      {isRefreshing && (
        <div
          className="pull-to-refresh-label refreshing"
          style={{ transform: "translateY(20px)" }}
        >
          <span>Refreshing...</span>
        </div>
      )}

      {/* Content */}
      <div className="pull-to-refresh-content">{children}</div>
    </div>
  );
}

export default PullToRefresh;
