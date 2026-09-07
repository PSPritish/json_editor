/* ============================================================
   Keyboard Shortcuts Registry
   Centralized key binding management.
   ============================================================ */

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: string; // action identifier
}

export const SHORTCUTS: Shortcut[] = [
  { key: "o", ctrl: true, description: "Open file", action: "open" },
  { key: "s", ctrl: true, description: "Save file", action: "save" },
  {
    key: "s",
    ctrl: true,
    shift: true,
    description: "Save file as...",
    action: "saveAs",
  },
  {
    key: "d",
    ctrl: true,
    shift: true,
    description: "Toggle diff panel",
    action: "toggleDiff",
  },
  {
    key: "h",
    ctrl: true,
    shift: true,
    description: "Toggle time machine",
    action: "toggleTimeMachine",
  },
  {
    key: "e",
    ctrl: true,
    shift: true,
    description: "Toggle validation panel",
    action: "toggleValidation",
  },
  {
    key: "j",
    ctrl: true,
    description: "Format / prettify JSON",
    action: "format",
  },
  {
    key: "m",
    ctrl: true,
    shift: true,
    description: "Toggle editor mode",
    action: "toggleMode",
  },
  {
    key: "\\",
    ctrl: true,
    description: "Toggle theme",
    action: "toggleTheme",
  },
];

export function matchShortcut(e: KeyboardEvent): string | null {
  for (const sc of SHORTCUTS) {
    const ctrlMatch = sc.ctrl ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
    const shiftMatch = sc.shift ? e.shiftKey : !e.shiftKey;
    const altMatch = sc.alt ? e.altKey : !e.altKey;

    if (
      e.key.toLowerCase() === sc.key.toLowerCase() &&
      ctrlMatch &&
      shiftMatch &&
      altMatch
    ) {
      return sc.action;
    }
  }
  return null;
}

export function formatShortcut(sc: Shortcut): string {
  const parts: string[] = [];
  if (sc.ctrl) parts.push("Ctrl");
  if (sc.shift) parts.push("Shift");
  if (sc.alt) parts.push("Alt");
  parts.push(sc.key.toUpperCase());
  return parts.join("+");
}
