/* ============================================================
   Diff Web Worker
   Semantic JSON diffing using jsondiffpatch.
   Returns diffs annotated with JSONPath notation.
   ============================================================ */
import * as Comlink from "comlink";
import { create, type Delta } from "jsondiffpatch";

const diffpatcher = create({
  objectHash: (obj: object) => {
    // Better object matching inside arrays
    const rObj = obj as Record<string, unknown>;
    return (rObj.id || rObj._id || rObj.name || rObj.key || JSON.stringify(rObj)) as string;
  },
  arrays: {
    detectMove: true,
    includeValueOnMove: false,
  },
});

export interface DiffEntry {
  path: string; // JSONPath, e.g. $.fraud_rules[2].threshold
  type: "added" | "removed" | "modified" | "moved";
  oldValue?: unknown;
  newValue?: unknown;
  movedFrom?: string;
}

function buildJsonPath(segments: (string | number)[]): string {
  let path = "$";
  for (const seg of segments) {
    if (typeof seg === "number") {
      path += `[${seg}]`;
    } else {
      path += `.${seg}`;
    }
  }
  return path;
}

function flattenDelta(
  delta: Delta,
  parentPath: (string | number)[] = []
): DiffEntry[] {
  const entries: DiffEntry[] = [];

  if (!delta || typeof delta !== "object") return entries;

  for (const [key, value] of Object.entries(delta)) {
    // Skip internal jsondiffpatch metadata
    if (key === "_t") continue;

    const isArrayIndex = key.startsWith("_");
    const actualKey = isArrayIndex ? parseInt(key.slice(1), 10) : key;
    const currentPath = [...parentPath, actualKey];
    const jsonPath = buildJsonPath(currentPath);

    if (Array.isArray(value)) {
      if (value.length === 1) {
        // Added
        entries.push({ path: jsonPath, type: "added", newValue: value[0] });
      } else if (value.length === 2) {
        // Modified
        entries.push({
          path: jsonPath,
          type: "modified",
          oldValue: value[0],
          newValue: value[1],
        });
      } else if (value.length === 3) {
        if (value[2] === 0) {
          // Deleted
          entries.push({
            path: jsonPath,
            type: "removed",
            oldValue: value[0],
          });
        } else if (value[2] === 2) {
          // Text diff — treat as modified
          entries.push({
            path: jsonPath,
            type: "modified",
            oldValue: "(text diff)",
            newValue: "(text diff)",
          });
        } else if (value[2] === 3) {
          // Moved
          entries.push({
            path: jsonPath,
            type: "moved",
            movedFrom: String(value[1]),
          });
        }
      }
    } else if (typeof value === "object" && value !== null) {
      // Nested object — recurse
      entries.push(...flattenDelta(value as Delta, currentPath));
    }
  }

  return entries;
}

export interface DiffResult {
  entries: DiffEntry[];
  hasDifferences: boolean;
  timeMs: number;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
}

const diffApi = {
  computeDiff(left: unknown, right: unknown): DiffResult {
    const start = performance.now();

    const delta = diffpatcher.diff(left, right);

    if (!delta) {
      return {
        entries: [],
        hasDifferences: false,
        timeMs: Math.round(performance.now() - start),
        addedCount: 0,
        removedCount: 0,
        modifiedCount: 0,
      };
    }

    const entries = flattenDelta(delta);

    return {
      entries,
      hasDifferences: entries.length > 0,
      timeMs: Math.round(performance.now() - start),
      addedCount: entries.filter((e) => e.type === "added").length,
      removedCount: entries.filter((e) => e.type === "removed").length,
      modifiedCount: entries.filter((e) => e.type === "modified").length,
    };
  },
};

export type DiffApi = typeof diffApi;

Comlink.expose(diffApi);
