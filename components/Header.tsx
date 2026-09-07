"use client";

import { formatFileSize } from "@/lib/file-system";
import ThemeToggle from "./ThemeToggle";

interface HeaderProps {
  fileName: string | null;
  fileSize: number;
  parseTimeMs: number;
  isDirty: boolean;
  validationCount: number;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onLoadSchema: () => void;
  onFormat: () => void;
  editorMode: "text" | "tree";
  onToggleMode: () => void;
}

export default function Header({
  fileName,
  fileSize,
  parseTimeMs,
  isDirty,
  validationCount,
  onOpen,
  onSave,
  onSaveAs,
  onLoadSchema,
  onFormat,
  editorMode,
  onToggleMode,
}: HeaderProps) {
  return (
    <header
      className="app-header"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "0 12px",
        borderBottom: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        zIndex: 50,
        height: "var(--header-height)",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginRight: 8,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "var(--radius-md)",
            background:
              "linear-gradient(135deg, var(--accent), var(--accent-hover))",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 14,
            fontWeight: 800,
            color: "var(--text-inverse)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          R
        </div>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            color: "var(--text-primary)",
          }}
        >
          RiskJSON
        </span>
      </div>

      {/* Separator */}
      <div
        style={{
          width: 1,
          height: 20,
          background: "var(--border)",
          marginRight: 4,
        }}
      />

      {/* File info */}
      {fileName && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          <span
            style={{
              fontWeight: 500,
              color: "var(--text-primary)",
              maxWidth: 200,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {fileName}
            {isDirty && (
              <span
                style={{
                  color: "var(--accent)",
                  marginLeft: 2,
                }}
              >
                •
              </span>
            )}
          </span>
          <span className="badge badge-accent">{formatFileSize(fileSize)}</span>
          {parseTimeMs > 0 && (
            <span
              style={{ fontSize: 11, color: "var(--text-muted)" }}
            >
              {parseTimeMs}ms
            </span>
          )}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Mode toggle */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--border)",
          overflow: "hidden",
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        <button
          id="mode-code"
          onClick={() => editorMode !== "text" && onToggleMode()}
          style={{
            padding: "4px 12px",
            background:
              editorMode === "text" ? "var(--accent-subtle)" : "transparent",
            color:
              editorMode === "text"
                ? "var(--accent)"
                : "var(--text-tertiary)",
            border: "none",
            cursor: "pointer",
            transition: "all var(--transition-fast)",
          }}
        >
          Code
        </button>
        <button
          id="mode-tree"
          onClick={() => editorMode !== "tree" && onToggleMode()}
          style={{
            padding: "4px 12px",
            background:
              editorMode === "tree" ? "var(--accent-subtle)" : "transparent",
            color:
              editorMode === "tree"
                ? "var(--accent)"
                : "var(--text-tertiary)",
            border: "none",
            borderLeft: "1px solid var(--border)",
            cursor: "pointer",
            transition: "all var(--transition-fast)",
          }}
        >
          Tree
        </button>
      </div>

      {/* Action buttons */}
      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <button id="btn-open" className="btn btn-ghost btn-sm" onClick={onOpen}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          Open
        </button>

        <button
          id="btn-save"
          className="btn btn-primary btn-sm"
          onClick={onSave}
          disabled={!fileName}
          style={{ opacity: fileName ? 1 : 0.5 }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1-2 2h11l4 4v10a2 2 0 0 1-2 2z" />
            <polyline points="17 21 17 13 7 13 7 21" />
            <polyline points="7 3 7 8 15 8" />
          </svg>
          Save
        </button>

        <button
          id="btn-save-as"
          className="btn btn-ghost btn-sm"
          onClick={onSaveAs}
        >
          Save As
        </button>

        <button
          id="btn-format"
          className="btn btn-ghost btn-sm tooltip"
          data-tooltip="Ctrl+J"
          onClick={onFormat}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="21" y1="10" x2="3" y2="10" />
            <line x1="21" y1="6" x2="3" y2="6" />
            <line x1="21" y1="14" x2="3" y2="14" />
            <line x1="21" y1="18" x2="3" y2="18" />
          </svg>
          Format
        </button>

        <button
          id="btn-schema"
          className="btn btn-ghost btn-sm"
          onClick={onLoadSchema}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          Schema
        </button>
      </div>

      {/* Validation badge */}
      {validationCount > 0 && (
        <span className="badge badge-error">{validationCount} errors</span>
      )}

      {/* Theme toggle */}
      <ThemeToggle />
    </header>
  );
}
