import { useEffect, useRef, useState } from "react";

/**
 * Hook for lazy-loading images using Intersection Observer
 * Loads images when they become visible in the viewport
 * Supports srcset for responsive images
 */
export function useLazyLoadImage() {
  const ref = useRef<HTMLImageElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const img = ref.current;
    if (!img) return;

    // Check if image is already loaded (e.g., cached)
    if (img.complete) {
      setIsLoaded(true);
      return;
    }

    // Create intersection observer to load image when visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const target = entry.target as HTMLImageElement;

            // Load the image
            const dataSrc = target.dataset.src;
            const dataSrcset = target.dataset.srcset;

            if (dataSrc) {
              target.src = dataSrc;
            }
            if (dataSrcset) {
              target.srcset = dataSrcset;
            }

            // Listen for load and error events
            const onLoad = () => {
              setIsLoaded(true);
              target.removeEventListener("load", onLoad);
              target.removeEventListener("error", onError);
            };

            const onError = () => {
              setError(true);
              target.removeEventListener("load", onLoad);
              target.removeEventListener("error", onError);
            };

            target.addEventListener("load", onLoad);
            target.addEventListener("error", onError);

            // Stop observing this image
            observer.unobserve(target);
          }
        });
      },
      {
        rootMargin: "50px", // Start loading 50px before image comes into view
        threshold: 0.01,
      }
    );

    observer.observe(img);

    return () => {
      observer.disconnect();
    };
  }, []);

  return { ref, isLoaded, error };
}

/**
 * Preload images above the fold
 * Useful for hero images or cards at top of page
 */
export function preloadImage(src: string) {
  const img = new Image();
  img.src = src;
}

/**
 * Generate responsive image srcset
 * @param baseUrl - Image URL without size parameters
 * @param sizes - Array of sizes to generate (e.g., [480, 768, 1200])
 * @param quality - Image quality for srcset (default: 80)
 * @returns srcset string for use in img tag
 */
export function generateSrcSet(
  baseUrl: string,
  sizes = [480, 768, 1200],
  quality = 80
): string {
  // If using Cloudinary or similar service, adjust accordingly
  // This is a generic approach; adjust based on your image service
  return sizes.map((size) => `${baseUrl}?w=${size}&q=${quality} ${size}w`).join(", ");
}

/**
 * Generate sizes attribute for responsive images
 * Helps browser choose best image size based on viewport
 */
export function generateSizes(): string {
  return "(max-width: 480px) 100vw, (max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 33vw, (max-width: 1920px) 33vw, 25vw";
}
