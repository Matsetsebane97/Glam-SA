import React from "react";

type StickyFooterProps = {
  children: React.ReactNode;
  className?: string;
};

/**
 * Sticky footer that remains visible while scrolling
 * Useful for booking buttons, action bars, etc.
 */
export function StickyFooter({ children, className = "" }: StickyFooterProps) {
  return (
    <div className={`sticky-footer ${className}`}>
      <div className="sticky-footer-content">{children}</div>
    </div>
  );
}

type StickyFooterButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  icon?: React.ReactNode;
};

/**
 * Button component for sticky footer
 */
export function StickyFooterButton({
  variant = "primary",
  icon,
  children,
  className = "",
  ...props
}: StickyFooterButtonProps) {
  return (
    <button className={`sticky-footer-button ${variant} ${className}`} {...props}>
      {icon}
      {children}
    </button>
  );
}

type StickyFooterInfoProps = {
  price?: number;
  duration?: number;
  details?: string;
};

/**
 * Info display component for sticky footer (price, duration, etc.)
 */
export function StickyFooterInfo({ price, duration, details }: StickyFooterInfoProps) {
  return (
    <div className="sticky-footer-info">
      {price && <span className="sticky-footer-price">R{price.toFixed(0)}</span>}
      {duration && <span>{duration} min</span>}
      {details && <span>{details}</span>}
    </div>
  );
}
