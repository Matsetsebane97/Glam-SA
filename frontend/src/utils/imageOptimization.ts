/**
 * Image optimization utilities for responsive images
 * Helps generate srcset and sizes attributes for lazy-loaded images
 */

/**
 * Standard image sizes for responsive design
 * Covers common breakpoints and device pixel ratios
 */
export const RESPONSIVE_IMAGE_SIZES = [480, 768, 1024, 1200, 1600];

/**
 * Generate sizes attribute for responsive images
 * Helps browser choose best image size based on viewport width
 *
 * For feed layout:
 * - Mobile (≤480px): 100vw (full width)
 * - Tablet (≤768px): 100vw (full width)
 * - Desktop (≤1024px): 50vw (2-column grid)
 * - Wide desktop (≤1440px): 33vw (3-column on 1600px+, falls to 50vw)
 * - Ultra-wide: 33vw
 */
export function getFeedImageSizes(): string {
  return "(max-width: 480px) 100vw, (max-width: 768px) 100vw, (max-width: 1024px) 50vw, (max-width: 1440px) 50vw, 33vw";
}

/**
 * Generate srcset from base image URL
 * Assumes image service supports size parameters (e.g., ?w=480)
 *
 * @param baseUrl - Base image URL
 * @param sizes - Array of widths (default: RESPONSIVE_IMAGE_SIZES)
 * @param quality - Image quality 1-100 (default: 80)
 * @returns srcset string for img tag
 */
export function generateImageSrcSet(
  baseUrl: string,
  sizes = RESPONSIVE_IMAGE_SIZES,
  quality = 80
): string {
  return sizes
    .map((size) => {
      // Check if URL already has query params
      const separator = baseUrl.includes("?") ? "&" : "?";
      return `${baseUrl}${separator}w=${size}&q=${quality} ${size}w`;
    })
    .join(", ");
}

/**
 * Generate srcset for multiple device pixel ratios
 * Useful for high-DPI displays (retina)
 *
 * @param baseUrl - Base image URL
 * @param maxWidth - Maximum image width (default: 1200)
 * @param quality - Image quality 1-100 (default: 80)
 * @returns srcset with 1x, 2x, 3x variants
 */
export function generateDPRSrcSet(
  baseUrl: string,
  maxWidth = 1200,
  quality = 80
): string {
  const ratios = ["1x", "2x"];
  return ratios
    .map((ratio) => {
      const dpr = parseInt(ratio);
      const width = maxWidth * dpr;
      const separator = baseUrl.includes("?") ? "&" : "?";
      return `${baseUrl}${separator}w=${width}&q=${quality} ${ratio}`;
    })
    .join(", ");
}

/**
 * Get blur hash placeholder for image
 * This is a minimal SVG placeholder that can be shown while loading
 *
 * @param width - Image width
 * @param height - Image height
 * @param color - Placeholder color (default: light gray)
 * @returns Data URI for SVG placeholder
 */
export function getImagePlaceholder(
  width = 1,
  height = 1,
  color = "#e5e7eb"
): string {
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'%3E%3Crect fill='${encodeURIComponent(
    color
  )}' width='${width}' height='${height}'/%3E%3C/svg%3E`;
}

/**
 * Lock aspect ratio to prevent layout shift (CLS)
 * Returns CSS to apply aspect-ratio constraint
 *
 * @param width - Image width
 * @param height - Image height
 * @returns CSS aspect-ratio value
 */
export function getAspectRatioCss(width: number, height: number): string {
  return `${width} / ${height}`;
}

/**
 * Get optimal image width for container
 * @param containerWidth - Container width in pixels
 * @param columnCount - Number of columns in grid (default: 2)
 * @returns Optimal image width
 */
export function getOptimalImageWidth(
  containerWidth: number,
  columnCount = 2
): number {
  const gap = 16; // Default grid gap
  const padding = 32; // Default container padding
  const availableWidth = containerWidth - padding - gap * (columnCount - 1);
  const columnWidth = availableWidth / columnCount;
  return Math.round(columnWidth);
}

/**
 * Check if image URL is from a known CDN that supports optimization
 */
export function isOptimizedImageService(url: string): boolean {
  const optimizedServices = [
    "cloudinary.com",
    "imgix.com",
    "imagekit.io",
    "cdn.example.com",
  ];
  return optimizedServices.some((service) => url.includes(service));
}

/**
 * Preload image for above-the-fold content
 * Useful for hero images or critical cards
 */
export function preloadImage(src: string): void {
  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "image";
  link.href = src;
  document.head.appendChild(link);
}

/**
 * Prefetch image for likely-to-be-viewed content
 * Lower priority than preload
 */
export function prefetchImage(src: string): void {
  const link = document.createElement("link");
  link.rel = "prefetch";
  link.as = "image";
  link.href = src;
  document.head.appendChild(link);
}
