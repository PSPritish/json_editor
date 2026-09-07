"use client";

import { useTheme } from "@/lib/theme-context";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      id="theme-toggle"
      onClick={toggleTheme}
      className="tooltip btn-icon btn-ghost"
      data-tooltip={theme === "dark" ? "Switch to light" : "Switch to dark"}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      style={{
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Sun icon */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          position: "absolute",
          transform:
            theme === "dark"
              ? "rotate(0deg) scale(1)"
              : "rotate(90deg) scale(0)",
          opacity: theme === "dark" ? 1 : 0,
          transition:
            "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease",
          color: "var(--accent)",
        }}
      >
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>

      {/* Moon icon */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          position: "absolute",
          transform:
            theme === "light"
              ? "rotate(0deg) scale(1)"
              : "rotate(-90deg) scale(0)",
          opacity: theme === "light" ? 1 : 0,
          transition:
            "transform 500ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 300ms ease",
          color: "var(--accent)",
        }}
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    </button>
  );
}
