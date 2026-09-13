import React from "react";
import { IconClose } from "./Icons";
import { KEYBOARD_SHORTCUTS } from "../hooks/useKeyboardShortcuts";

type KeyboardShortcutsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Modal displaying available keyboard shortcuts
 * Press "?" to open
 */
export function KeyboardShortcutsModal({
  isOpen,
  onClose,
}: KeyboardShortcutsModalProps) {
  React.useEffect(() => {
    if (!isOpen) return;

    // Close on Escape
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const groupedShortcuts = KEYBOARD_SHORTCUTS.reduce(
    (acc, shortcut) => {
      const category = shortcut.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(shortcut);
      return acc;
    },
    {} as Record<string, typeof KEYBOARD_SHORTCUTS>
  );

  return (
    <div
      className="keyboard-shortcuts-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="keyboard-shortcuts-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
      >
        <div className="keyboard-shortcuts-header">
          <h2 id="shortcuts-title">Keyboard Shortcuts</h2>
          <button
            className="keyboard-shortcuts-close"
            onClick={onClose}
            aria-label="Close shortcuts"
            type="button"
          >
            <IconClose size={20} />
          </button>
        </div>

        <div className="keyboard-shortcuts-content">
          {Object.entries(groupedShortcuts).map(([category, shortcuts]) => (
            <div key={category} className="shortcuts-group">
              <h3 className="shortcuts-category">{category}</h3>
              <div className="shortcuts-list">
                {shortcuts.map((shortcut) => (
                  <div key={shortcut.key} className="shortcut-item">
                    <kbd className="shortcut-key">{shortcut.key}</kbd>
                    <span className="shortcut-action">{shortcut.action}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="keyboard-shortcuts-footer">
          <p className="shortcuts-hint">
            Press <kbd>?</kbd> anytime to open this help
          </p>
        </div>
      </div>
    </div>
  );
}
