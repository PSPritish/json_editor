"use client";

interface SidebarProps {
  activePanel: string | null;
  onPanelChange: (panel: string | null) => void;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

const ITEMS: SidebarItem[] = [
  {
    id: "home",
    label: "Home",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    id: "editor",
    label: "Editor",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    id: "timeMachine",
    label: "Time Machine",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: "diff",
    label: "Diff",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="2" y="3" width="8" height="18" rx="1" />
        <rect x="14" y="3" width="8" height="18" rx="1" />
      </svg>
    ),
  },
  {
    id: "validation",
    label: "Validation",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    id: "shortcuts",
    label: "Shortcuts",
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="2" y="4" width="20" height="16" rx="2" ry="2" />
        <line x1="6" y1="8" x2="6.01" y2="8" />
        <line x1="10" y1="8" x2="10.01" y2="8" />
        <line x1="14" y1="8" x2="14.01" y2="8" />
        <line x1="18" y1="8" x2="18.01" y2="8" />
        <line x1="8" y1="12" x2="16" y2="12" />
        <line x1="6" y1="16" x2="6.01" y2="16" />
        <line x1="18" y1="16" x2="18.01" y2="16" />
      </svg>
    ),
  },
];

export default function Sidebar({ activePanel, onPanelChange }: SidebarProps) {
  return (
    <aside
      className="app-sidebar"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "8px 0",
        borderRight: "1px solid var(--border)",
        background: "var(--bg-secondary)",
        width: "var(--sidebar-width)",
      }}
    >
      {ITEMS.map((item) => {
        const isActive = activePanel === item.id;
        return (
          <button
            key={item.id}
            id={`sidebar-${item.id}`}
            className="tooltip"
            data-tooltip={item.label}
            onClick={() =>
              onPanelChange(isActive ? null : item.id)
            }
            style={{
              width: 36,
              height: 36,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "var(--radius-md)",
              border: "none",
              background: isActive ? "var(--accent-subtle)" : "transparent",
              color: isActive ? "var(--accent)" : "var(--text-muted)",
              cursor: "pointer",
              transition: "all var(--transition-fast)",
              position: "relative",
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "var(--bg-hover)";
                e.currentTarget.style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-muted)";
              }
            }}
          >
            {isActive && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 3,
                  height: 20,
                  borderRadius: "0 2px 2px 0",
                  background: "var(--accent)",
                }}
              />
            )}
            {item.icon}
          </button>
        );
      })}
    </aside>
  );
}
