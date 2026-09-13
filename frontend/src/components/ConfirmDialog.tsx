import React from "react";
import { IconClose, IconAlert } from "./Icons";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  isDangerous?: boolean; // Red confirm button
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Modal confirmation dialog for important actions
 * Prevents accidental submissions (booking, delete, etc.)
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDangerous = false,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="confirm-dialog-backdrop" onClick={onCancel} role="presentation">
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
      >
        <button
          className="confirm-dialog-close"
          onClick={onCancel}
          type="button"
          aria-label="Close dialog"
        >
          <IconClose size={18} />
        </button>

        <div className="confirm-dialog-icon">
          <IconAlert size={24} />
        </div>

        <h2 id="confirm-title" className="confirm-dialog-title">
          {title}
        </h2>

        <p id="confirm-message" className="confirm-dialog-message">
          {message}
        </p>

        <div className="confirm-dialog-actions">
          <button
            className="btn-ghost"
            onClick={onCancel}
            disabled={isLoading}
            type="button"
          >
            {cancelText}
          </button>
          <button
            className={`btn-primary ${isDangerous ? "btn-danger" : ""}`}
            onClick={onConfirm}
            disabled={isLoading}
            type="button"
          >
            {isLoading ? "Please wait..." : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
