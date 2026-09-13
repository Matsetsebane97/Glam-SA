/**
 * Lightweight pathname-based router
 * Keeps navigation client-side to avoid reloading app state
 */

/**
 * Navigate to a path without full page reload
 */
export function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Get current pathname
 */
export function getCurrentPathname(): string {
  return window.location.pathname;
}

/**
 * Listen for pathname changes (back button, navigate calls)
 */
export function onPathnameChange(callback: (pathname: string) => void): () => void {
  const handlePopState = () => callback(window.location.pathname);
  window.addEventListener("popstate", handlePopState);
  return () => window.removeEventListener("popstate", handlePopState);
}
