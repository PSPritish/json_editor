"use client";

import { useEffect, useState } from "react";
import { getRecentFiles, type FileRecord } from "@/lib/db";
import { formatFileSize } from "@/lib/file-system";
import { SHORTCUTS, formatShortcut } from "@/lib/keyboard-shortcuts";

interface WelcomeScreenProps {
  onOpen: () => void;
  onOpenRecent: (record: FileRecord) => void;
}

export default function WelcomeScreen({
  onOpen,
  onOpenRecent,
}: WelcomeScreenProps) {
  const [recentFiles, setRecentFiles] = useState<FileRecord[]>([]);

  useEffect(() => {
    getRecentFiles().then(setRecentFiles);
  }, []);

  return (
    <div
      className="fade-in"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        background: "var(--bg-primary)",
        color: "var(--text-primary)",
        padding: 40,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: "var(--radius-xl)",
          background:
            "linear-gradient(135deg, var(--accent), var(--accent-hover))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          fontWeight: 800,
          color: "var(--text-inverse)",
          boxShadow: "var(--shadow-lg)",
          marginBottom: 24,
        }}
      >
        R
      </div>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 700,
          marginBottom: 8,
          letterSpacing: "-0.02em",
        }}
      >
        RiskJSON Editor
      </h1>
      <p
        style={{
          fontSize: 16,
          color: "var(--text-secondary)",
          marginBottom: 32,
          maxWidth: 400,
          textAlign: "center",
          lineHeight: 1.5,
        }}
      >
        High-performance, local-first JSON editor tailored for Risk Analysts.
      </p>

      <button className="btn btn-primary btn-lg" onClick={onOpen}>
        Open JSON File
      </button>

      <div
        style={{
          display: "flex",
          gap: 64,
          marginTop: 64,
          width: "100%",
          maxWidth: 800,
        }}
      >
        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-tertiary)",
              fontWeight: 600,
              marginBottom: 16,
              borderBottom: "1px solid var(--border)",
              paddingBottom: 8,
            }}
          >
            Recent Files
          </h3>
          {recentFiles.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              No recent files.
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {recentFiles.map((file) => (
                <li key={file.id}>
                  <button
                    className="btn btn-ghost"
                    style={{
                      width: "100%",
                      justifyContent: "flex-start",
                      textAlign: "left",
                      padding: "8px 12px",
                      borderRadius: "var(--radius-md)",
                    }}
                    onClick={() => onOpenRecent(file)}
                  >
                    <div style={{ flex: 1, overflow: "hidden" }}>
                      <div
                        style={{
                          fontWeight: 500,
                          color: "var(--text-primary)",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {file.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginTop: 2,
                        }}
                      >
                        {formatFileSize(file.sizeBytes)} •{" "}
                        {new Date(file.lastOpened).toLocaleString()}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h3
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: "var(--text-tertiary)",
              fontWeight: 600,
              marginBottom: 16,
              borderBottom: "1px solid var(--border)",
              paddingBottom: 8,
            }}
          >
            Keyboard Shortcuts
          </h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {SHORTCUTS.slice(0, 6).map((sc, i) => (
              <li
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  fontSize: 13,
                  color: "var(--text-secondary)",
                }}
              >
                <span>{sc.description}</span>
                <div style={{ display: "flex", gap: 4 }}>
                  {formatShortcut(sc)
                    .split("+")
                    .map((key, j) => (
                      <kbd key={j}>{key}</kbd>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
