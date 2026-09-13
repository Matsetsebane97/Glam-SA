import React from "react";

type SkeletonProps = {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  variant?: "line" | "circle" | "rect" | "card";
  animated?: boolean;
};

/**
 * Reusable skeleton loader component for showing placeholder content while loading.
 * Supports different variants and automatic shimmer animation.
 */
export function Skeleton({
  width = "100%",
  height = "12px",
  borderRadius = "4px",
  className = "",
  variant = "line",
  animated = true,
}: SkeletonProps) {
  const variantClasses = {
    line: "skeleton-line",
    circle: "skeleton-circle",
    rect: "skeleton-rect",
    card: "skeleton-card",
  };

  const style: React.CSSProperties = {
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius:
      typeof borderRadius === "number" ? `${borderRadius}px` : borderRadius,
  };

  return (
    <div
      className={`skeleton ${variantClasses[variant]} ${
        animated ? "skeleton-animated" : ""
      } ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

type SkeletonGroupProps = {
  count?: number;
  gap?: string;
  children?: React.ReactNode;
};

/**
 * Group multiple skeletons with consistent spacing.
 */
export function SkeletonGroup({
  count = 3,
  gap = "12px",
  children,
}: SkeletonGroupProps) {
  return (
    <div
      className="skeleton-group"
      style={{
        display: "flex",
        flexDirection: "column",
        gap,
      }}
    >
      {children || Array.from({ length: count }).map((_, i) => <Skeleton key={i} />)}
    </div>
  );
}

/**
 * Skeleton for profile header with avatar and bio.
 */
export function ProfileSkeleton() {
  return (
    <div className="skeleton-profile">
      <Skeleton variant="circle" width="80px" height="80px" className="skeleton-avatar" />
      <Skeleton height="20px" width="60%" className="skeleton-name" />
      <Skeleton height="14px" width="80%" className="skeleton-bio" />
      <div className="skeleton-actions">
        <Skeleton height="40px" width="45%" borderRadius="12px" />
        <Skeleton height="40px" width="45%" borderRadius="12px" />
      </div>
    </div>
  );
}

/**
 * Skeleton for a grid of post cards.
 */
export function PostCardSkeleton() {
  return (
    <div className="skeleton-post-card">
      <Skeleton
        variant="rect"
        height="280px"
        borderRadius="8px"
        className="skeleton-image"
      />
      <Skeleton height="16px" width="70%" className="skeleton-title" />
      <Skeleton height="12px" width="50%" className="skeleton-subtitle" />
    </div>
  );
}

/**
 * Skeleton for booking modal content.
 */
export function BookingModalSkeleton() {
  return (
    <div className="skeleton-booking-modal">
      <Skeleton height="18px" width="80%" className="skeleton-label" />
      <div className="skeleton-chips">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            height="48px"
            width="32%"
            borderRadius="8px"
          />
        ))}
      </div>
      <Skeleton height="18px" width="80%" className="skeleton-label" style={{ marginTop: "20px" }} />
      <Skeleton height="200px" borderRadius="8px" className="skeleton-calendar" />
      <Skeleton
        height="40px"
        width="100%"
        borderRadius="8px"
        className="skeleton-button"
        style={{ marginTop: "20px" }}
      />
    </div>
  );
}

/**
 * Skeleton for message thread.
 */
export function MessageThreadSkeleton() {
  return (
    <div className="skeleton-message-thread">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`skeleton-message ${i % 2 === 0 ? "own" : "other"}`}>
          <Skeleton
            height="40px"
            width={`${60 + Math.random() * 30}%`}
            borderRadius="12px"
          />
        </div>
      ))}
    </div>
  );
}
