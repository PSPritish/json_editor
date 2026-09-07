"use client";

import type { ValidationError } from "@/workers/schema-validator.worker";

interface ValidationPanelProps {
  errors: ValidationError[];
  onClose: () => void;
  onNavigateToPath?: (path: string) => void;
}

export default function ValidationPanel({
  errors,
  onClose,
  onNavigateToPath,
}: ValidationPanelProps) {
  return (
    <div className="bottom-panel slide-in-bottom">
      <div className="panel-header" style={{ background: "var(--bg-secondary)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: "var(--error)" }}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          Validation Errors ({errors.length})
        </div>
        <button
          className="btn-icon btn-ghost"
          onClick={onClose}
          aria-label="Close panel"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div
        style={{
          height: "200px",
          overflowY: "auto",
          background: "var(--bg-primary)",
        }}
      >
        {errors.length === 0 ? (
          <div className="empty-state">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p>No validation errors detected.</p>
          </div>
        ) : (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: 13,
            }}
          >
            <thead>
              <tr
                style={{
                  textAlign: "left",
                  borderBottom: "1px solid var(--border)",
                  color: "var(--text-tertiary)",
                }}
              >
                <th style={{ padding: "8px 12px", fontWeight: 500 }}>Path</th>
                <th style={{ padding: "8px 12px", fontWeight: 500 }}>Message</th>
                <th style={{ padding: "8px 12px", fontWeight: 500 }}>Rule</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((error, idx) => (
                <tr
                  key={idx}
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    cursor: onNavigateToPath ? "pointer" : "default",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--bg-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                  onClick={() => onNavigateToPath?.(error.path)}
                >
                  <td
                    style={{
                      padding: "8px 12px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--accent)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {error.path}
                  </td>
                  <td style={{ padding: "8px 12px", color: "var(--text-primary)" }}>
                    {error.message}
                  </td>
                  <td
                    style={{
                      padding: "8px 12px",
                      color: "var(--text-secondary)",
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                    }}
                  >
                    {error.keyword}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
