"use client";

import { type SnapshotRecord } from "@/lib/db";
import { formatFileSize } from "@/lib/file-system";

interface TimeMachineProps {
  snapshots: SnapshotRecord[];
  onRevert: (content: string) => void;
  onCompare: (id: number) => void;
  onClose: () => void;
}

export default function TimeMachine({
  snapshots,
  onRevert,
  onCompare,
  onClose,
}: TimeMachineProps) {
  return (
    <div
      className="panel slide-in-left"
      style={{
        width: 320,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid var(--border)",
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
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          Time Machine
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

      <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
        {snapshots.length === 0 ? (
          <div className="empty-state">
            <p>No snapshots recorded yet. Auto-saves occur when you save the file.</p>
          </div>
        ) : (
          <div
            style={{
              position: "relative",
              paddingLeft: 16,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            {/* Timeline line */}
            <div
              style={{
                position: "absolute",
                left: 7,
                top: 8,
                bottom: 8,
                width: 2,
                background: "var(--border)",
                borderRadius: 1,
              }}
            />

            {snapshots.map((s, i) => (
              <div key={s.id} style={{ position: "relative" }}>
                {/* Node */}
                <div
                  style={{
                    position: "absolute",
                    left: -12,
                    top: 4,
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: i === 0 ? "var(--accent)" : "var(--bg-elevated)",
                    border: `2px solid ${
                      i === 0 ? "var(--accent)" : "var(--border-strong)"
                    }`,
                    zIndex: 2,
                  }}
                />

                <div
                  className="panel"
                  style={{
                    padding: 12,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    borderColor: i === 0 ? "var(--accent)" : "var(--border)",
                    boxShadow: i === 0 ? "var(--shadow-md)" : "var(--shadow-sm)",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                      {new Date(s.timestamp).toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {s.label} • {formatFileSize(s.sizeBytes)}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => onRevert(s.content)}
                      disabled={i === 0}
                    >
                      Restore
                    </button>
                    <button
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => s.id && onCompare(s.id)}
                    >
                      Compare
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
