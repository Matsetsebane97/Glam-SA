import { useEffect, useRef, useState } from "react";

type LazyImageProps = {
  src: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
  width?: number;
  height?: number;
  /**
   * Responsive image sizes for different viewports
   * Example: "(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 33vw"
   */
  sizes?: string;
  /**
   * Responsive image source set
   * Example: "image-480.jpg 480w, image-768.jpg 768w, image-1200.jpg 1200w"
   */
  srcSet?: string;
  /**
   * Placeholder or blur hash while loading
   * Used as initial src before actual image loads
   */
  placeholder?: string;
  /**
   * Root margin for intersection observer
   * When to start loading before image enters viewport
   */
  rootMargin?: string;
};

/**
 * LazyImage component with Intersection Observer
 * Loads images only when they become visible in viewport
 * Supports responsive srcset for different screen sizes
 */
export function LazyImage({
  src,
  alt,
  className,
  onLoad,
  onError,
  width,
  height,
  sizes,
  srcSet,
  placeholder,
  rootMargin = "50px",
}: LazyImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // Check if image is already loaded (cached)
    if (img.complete && img.currentSrc) {
      setIsLoaded(true);
      onLoad?.();
      return;
    }

    // Create Intersection Observer to lazy-load image
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLImageElement;

            // Set actual src and srcset
            if (srcSet) {
              target.srcset = srcSet;
            }
            if (sizes) {
              target.sizes = sizes;
            }
            target.src = src;

            // Stop observing
            observer.unobserve(target);
          }
        });
      },
      {
        rootMargin,
        threshold: 0.01,
      }
    );

    observer.observe(img);

    // Handle load and error events
    const handleLoad = () => {
      setIsLoaded(true);
      onLoad?.();
    };

    const handleError = () => {
      setHasError(true);
      onError?.();
    };

    img.addEventListener("load", handleLoad);
    img.addEventListener("error", handleError);

    return () => {
      observer.disconnect();
      img.removeEventListener("load", handleLoad);
      img.removeEventListener("error", handleError);
    };
  }, [src, srcSet, sizes, rootMargin, onLoad, onError]);

  return (
    <img
      ref={imgRef}
      src={placeholder || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect fill='%23f0f0f0'/%3E%3C/svg%3E"}
      alt={alt}
      className={className}
      width={width}
      height={height}
      data-loaded={isLoaded}
      data-error={hasError}
      style={{
        opacity: isLoaded ? 1 : 0.7,
        transition: "opacity 0.3s ease-in-out",
      }}
    />
  );
}
