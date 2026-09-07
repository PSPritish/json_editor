"use client";

import { useEffect, useState } from "react";
import type { DiffEntry, DiffResult } from "@/workers/diff.worker";
import { type SnapshotRecord } from "@/lib/db";

interface DiffPanelProps {
  diffResult: DiffResult | null;
  snapshots: SnapshotRecord[];
  currentSnapshotId: number | null;
  isComputing: boolean;
  onSelectSnapshot: (id: number | null) => void;
  onClose: () => void;
}

export default function DiffPanel({
  diffResult,
  snapshots,
  currentSnapshotId,
  isComputing,
  onSelectSnapshot,
  onClose,
}: DiffPanelProps) {
  return (
    <div
      className="panel slide-in-right"
      style={{
        width: 400,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        borderRadius: 0,
      }}
    >
      <div className="panel-header">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="3" width="8" height="18" rx="1" />
            <rect x="14" y="3" width="8" height="18" rx="1" />
          </svg>
          Semantic Diff
        </div>
        <button className="btn-icon btn-ghost" onClick={onClose}>
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

      <div style={{ padding: 12, borderBottom: "1px solid var(--border)" }}>
        <label
          style={{
            display: "block",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
            marginBottom: 6,
          }}
        >
          Compare current state with:
        </label>
        <select
          value={currentSnapshotId || ""}
          onChange={(e) =>
            onSelectSnapshot(e.target.value ? Number(e.target.value) : null)
          }
          style={{
            width: "100%",
            padding: "6px 8px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-strong)",
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
            fontSize: 13,
            outline: "none",
          }}
        >
          <option value="">Select a snapshot...</option>
          {snapshots.map((s) => (
            <option key={s.id} value={s.id}>
              {new Date(s.timestamp).toLocaleTimeString()} - {s.label}
            </option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {!currentSnapshotId ? (
          <div className="empty-state">
            <p>Select a snapshot to compare.</p>
          </div>
        ) : isComputing ? (
          <div className="empty-state">
            <div className="spinner" />
            <p>Computing semantic diff...</p>
          </div>
        ) : !diffResult?.hasDifferences ? (
          <div className="empty-state">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ color: "var(--success)" }}
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <p>No differences found.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 8, fontSize: 11 }}>
              <span className="badge badge-success">
                +{diffResult.addedCount}
              </span>
              <span className="badge badge-error">
                -{diffResult.removedCount}
              </span>
              <span className="badge badge-warning">
                ~{diffResult.modifiedCount}
              </span>
            </div>

            {diffResult.entries.map((entry, i) => (
              <div
                key={i}
                className={`panel diff-${entry.type}`}
                style={{
                  padding: 10,
                  fontSize: 12,
                  boxShadow: "none",
                  borderTop: "none",
                  borderRight: "none",
                  borderBottom: "none",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 600,
                    marginBottom: 4,
                    wordBreak: "break-all",
                    color: "var(--text-primary)",
                  }}
                >
                  {entry.path}
                </div>
                {entry.type === "added" && (
                  <div style={{ color: "var(--success)" }}>
                    Added: {JSON.stringify(entry.newValue)}
                  </div>
                )}
                {entry.type === "removed" && (
                  <div style={{ color: "var(--error)", textDecoration: "line-through" }}>
                    Removed: {JSON.stringify(entry.oldValue)}
                  </div>
                )}
                {entry.type === "modified" && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <div style={{ color: "var(--error)", textDecoration: "line-through" }}>
                      {JSON.stringify(entry.oldValue)}
                    </div>
                    <div style={{ color: "var(--success)" }}>
                      {JSON.stringify(entry.newValue)}
                    </div>
                  </div>
                )}
                {entry.type === "moved" && (
                  <div style={{ color: "var(--warning)" }}>
                    Moved from index {entry.movedFrom}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
