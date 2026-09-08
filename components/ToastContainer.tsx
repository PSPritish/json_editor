"use client";

import { useToast, type ToastMessage } from "@/lib/toast-context";

const ICON_MAP: Record<string, React.ReactNode> = {
  success: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

const COLOR_MAP: Record<string, string> = {
  success: "var(--success)",
  error: "var(--error)",
  info: "var(--accent)",
};

const BG_MAP: Record<string, string> = {
  success: "var(--success-bg)",
  error: "var(--error-bg)",
  info: "var(--info-bg)",
};

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 40,
        right: 16,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="scale-in"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 16px",
            borderRadius: "var(--radius-lg)",
            background: "var(--bg-elevated)",
            border: `1px solid ${COLOR_MAP[toast.type]}`,
            boxShadow: "var(--shadow-lg)",
            fontSize: 13,
            color: "var(--text-primary)",
            pointerEvents: "auto",
            maxWidth: 400,
            cursor: "pointer",
          }}
          onClick={() => removeToast(toast.id)}
        >
          <span style={{ color: COLOR_MAP[toast.type], flexShrink: 0 }}>
            {ICON_MAP[toast.type]}
          </span>
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
}
