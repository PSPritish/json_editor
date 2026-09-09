"use client";

interface StatusBarProps {
  stats: {
    keys: number;
    arrays: number;
    maxDepth: number;
    totalNodes: number;
  };
  hasSchema: boolean;
  validationStatus: "valid" | "invalid" | "checking" | "none";
}

export default function StatusBar({
  stats,
  hasSchema,
  validationStatus,
}: StatusBarProps) {
  return (
    <footer
      className="app-statusbar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 12px",
        borderTop: "1px solid var(--border)",
        background: "var(--bg-elevated)",
        fontSize: 11,
        color: "var(--text-secondary)",
        zIndex: 50,
      }}
    >
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <span>Nodes: {stats.totalNodes.toLocaleString()}</span>
        <span>Keys: {stats.keys.toLocaleString()}</span>
        <span>Arrays: {stats.arrays.toLocaleString()}</span>
        <span>Depth: {stats.maxDepth}</span>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        {hasSchema && (
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span>Schema: </span>
            {validationStatus === "checking" && (
              <span style={{ color: "var(--warning)" }}>Checking...</span>
            )}
            {validationStatus === "valid" && (
              <span style={{ color: "var(--success)" }}>Valid</span>
            )}
            {validationStatus === "invalid" && (
              <span style={{ color: "var(--error)" }}>Invalid</span>
            )}
          </div>
        )}
        <div
          style={{
            width: 1,
            height: 12,
            background: "var(--border)",
          }}
        />
        <span style={{ fontWeight: 500, color: "var(--text-muted)" }}>
          © Pritish Mahali 2026
        </span>
      </div>
    </footer>
  );
}
