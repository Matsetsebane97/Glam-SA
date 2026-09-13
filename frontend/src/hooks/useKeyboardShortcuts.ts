import { useEffect } from "react";

type KeyboardShortcuts = {
  focusSearch?: () => void;
  nextPost?: () => void;
  previousPost?: () => void;
  toggleBookmark?: () => void;
  toggleLike?: () => void;
  openBooking?: () => void;
  toggleTheme?: () => void;
  showHelp?: () => void;
};

/**
 * Hook for global keyboard shortcuts
 * Use standard keybinds:
 * - "/" : focus search
 * - "j" : next post
 * - "k" : previous post
 * - "s" : toggle save/bookmark
 * - "l" : toggle like
 * - "b" : open booking modal
 * - "t" : toggle theme
 * - "?" : show help
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcuts) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const isInput =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement;

      if (isInput && !["?"].includes(e.key)) {
        return;
      }

      // "/" : focus search
      if (e.key === "/" && !isInput) {
        e.preventDefault();
        shortcuts.focusSearch?.();
      }

      // "j" : next post (j for "jump down")
      if (e.key === "j" && !isInput) {
        e.preventDefault();
        shortcuts.nextPost?.();
      }

      // "k" : previous post (k for "keep up")
      if (e.key === "k" && !isInput) {
        e.preventDefault();
        shortcuts.previousPost?.();
      }

      // "s" : toggle save (s for "save")
      if (e.key === "s" && !isInput) {
        e.preventDefault();
        shortcuts.toggleBookmark?.();
      }

      // "l" : toggle like (l for "love")
      if (e.key === "l" && !isInput) {
        e.preventDefault();
        shortcuts.toggleLike?.();
      }

      // "b" : open booking (b for "book")
      if (e.key === "b" && !isInput) {
        e.preventDefault();
        shortcuts.openBooking?.();
      }

      // "t" : toggle theme (t for "theme")
      if (e.key === "t" && !isInput) {
        e.preventDefault();
        shortcuts.toggleTheme?.();
      }

      // "?" : show help
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        shortcuts.showHelp?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

/**
 * Get keyboard shortcut help text
 */
export const KEYBOARD_SHORTCUTS = [
  { key: "/", action: "Focus search", category: "Navigation" },
  { key: "j", action: "Next post", category: "Navigation" },
  { key: "k", action: "Previous post", category: "Navigation" },
  { key: "l", action: "Like post", category: "Actions" },
  { key: "s", action: "Save post", category: "Actions" },
  { key: "b", action: "Book appointment", category: "Actions" },
  { key: "t", action: "Toggle theme", category: "Settings" },
  { key: "?", action: "Show this help", category: "Help" },
];
