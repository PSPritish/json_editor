/* ============================================================
   JSON Parser Web Worker
   Off-thread JSON parse/stringify for large (20MB+) files.
   Uses comlink for clean RPC interface.
   ============================================================ */
import * as Comlink from "comlink";

export interface ParseResult {
  success: boolean;
  data?: unknown;
  error?: string;
  parseTimeMs: number;
  sizeBytes: number;
}

export interface StringifyResult {
  success: boolean;
  text?: string;
  error?: string;
  timeMs: number;
}

const parserApi = {
  parse(text: string): ParseResult {
    const start = performance.now();
    const sizeBytes = new Blob([text]).size;

    try {
      const data = JSON.parse(text);
      return {
        success: true,
        data,
        parseTimeMs: Math.round(performance.now() - start),
        sizeBytes,
      };
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : "Unknown parse error";
      return {
        success: false,
        error,
        parseTimeMs: Math.round(performance.now() - start),
        sizeBytes,
      };
    }
  },

  stringify(data: unknown, indent: number = 2): StringifyResult {
    const start = performance.now();
    try {
      const text = JSON.stringify(data, null, indent);
      return {
        success: true,
        text,
        timeMs: Math.round(performance.now() - start),
      };
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : "Unknown stringify error";
      return {
        success: false,
        error,
        timeMs: Math.round(performance.now() - start),
      };
    }
  },

  /**
   * Validate that a string is valid JSON without returning the parsed object
   * (lighter-weight for very large files)
   */
  validateSyntax(text: string): { valid: boolean; error?: string } {
    try {
      JSON.parse(text);
      return { valid: true };
    } catch (e: unknown) {
      const error = e instanceof Error ? e.message : "Invalid JSON";
      return { valid: false, error };
    }
  },

  /**
   * Count keys, arrays, depth — useful for status bar
   */
  getStats(
    text: string
  ): {
    keys: number;
    arrays: number;
    maxDepth: number;
    totalNodes: number;
  } {
    try {
      const data = JSON.parse(text);
      let keys = 0;
      let arrays = 0;
      let maxDepth = 0;
      let totalNodes = 0;

      function walk(node: unknown, depth: number) {
        totalNodes++;
        if (depth > maxDepth) maxDepth = depth;

        if (Array.isArray(node)) {
          arrays++;
          node.forEach((item) => walk(item, depth + 1));
        } else if (node !== null && typeof node === "object") {
          const entries = Object.entries(node as Record<string, unknown>);
          keys += entries.length;
          entries.forEach(([, value]) => walk(value, depth + 1));
        }
      }

      walk(data, 0);
      return { keys, arrays, maxDepth, totalNodes };
    } catch {
      return { keys: 0, arrays: 0, maxDepth: 0, totalNodes: 0 };
    }
  },
};

export type ParserApi = typeof parserApi;

Comlink.expose(parserApi);
