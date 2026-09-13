import { IconCheck, IconClose, IconZap } from "./Icons";
import type { Toast, ToastType } from "../context/ToastContext";

type ToastProps = Toast & {
  onClose: () => void;
};

/**
 * Individual toast notification component
 */
export function ToastItem({ id, message, type, onClose }: ToastProps) {
  const getIcon = (toastType: ToastType) => {
    switch (toastType) {
      case "success":
        return <IconCheck size={16} />;
      case "error":
        return <IconZap size={16} />;
      case "info":
      default:
        return <IconZap size={16} />;
    }
  };

  return (
    <div
      key={id}
      className={`toast toast-${type}`}
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="toast-icon">{getIcon(type)}</span>
      <span className="toast-message">{message}</span>
      <button
        className="toast-close"
        onClick={onClose}
        aria-label="Close notification"
        type="button"
      >
        <IconClose size={14} />
      </button>
    </div>
  );
}

type ToasterProps = {
  toasts: Toast[];
  onClose: (id: string) => void;
};

/**
 * Toast container that displays all active toasts
 */
export function Toaster({ toasts, onClose }: ToasterProps) {
  return (
    <div className="toaster-container" role="region" aria-label="Notifications">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} onClose={() => onClose(toast.id)} />
      ))}
    </div>
  );
}
