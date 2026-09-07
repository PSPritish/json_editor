/* ============================================================
   Schema Validator Web Worker
   Ajv-based JSON Schema validation (Draft-07 + 2020-12)
   Off-thread to avoid blocking the editor during typing.
   ============================================================ */
import * as Comlink from "comlink";
import Ajv2020 from "ajv/dist/2020";
import Ajv from "ajv";
import addFormats from "ajv-formats";

export interface ValidationError {
  path: string; // JSONPath notation
  message: string;
  keyword: string;
  schemaPath: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  timeMs: number;
}

// Maintain two Ajv instances — one for each draft
let ajv2020: Ajv2020 | null = null;
let ajv07: Ajv | null = null;
let currentValidateFn: ReturnType<Ajv["compile"]> | null = null;
let currentDraft: "07" | "2020-12" | null = null;

function dataPathToJsonPath(dataPath: string): string {
  if (!dataPath) return "$";
  // Convert /foo/0/bar → $.foo[0].bar
  const parts = dataPath.replace(/^\//, "").split("/");
  let path = "$";
  for (const part of parts) {
    if (/^\d+$/.test(part)) {
      path += `[${part}]`;
    } else {
      path += `.${part}`;
    }
  }
  return path;
}

const validatorApi = {
  setSchema(schema: object): {
    success: boolean;
    error?: string;
    draft: string;
  } {
    try {
      // Detect the draft from the schema's $schema property
      const schemaObj = schema as Record<string, unknown>;
      const schemaUri =
        typeof schemaObj.$schema === "string" ? schemaObj.$schema : "";

      if (schemaUri.includes("2020-12") || schemaUri.includes("2019-09")) {
        // Use 2020-12 Ajv
        ajv2020 = new Ajv2020({ allErrors: true, verbose: true });
        addFormats(ajv2020 as unknown as Ajv);
        currentValidateFn = ajv2020.compile(schema);
        currentDraft = "2020-12";
      } else {
        // Default to Draft-07
        ajv07 = new Ajv({ allErrors: true, verbose: true });
        addFormats(ajv07);
        currentValidateFn = ajv07.compile(schema);
        currentDraft = "07";
      }

      return { success: true, draft: currentDraft };
    } catch (e: unknown) {
      const error =
        e instanceof Error ? e.message : "Failed to compile schema";
      currentValidateFn = null;
      currentDraft = null;
      return { success: false, error, draft: "unknown" };
    }
  },

  validate(data: unknown): ValidationResult {
    const start = performance.now();

    if (!currentValidateFn) {
      return {
        valid: true,
        errors: [],
        timeMs: Math.round(performance.now() - start),
      };
    }

    const valid = currentValidateFn(data) as boolean;

    const errors: ValidationError[] = (currentValidateFn.errors || []).map(
      (err) => ({
        path: dataPathToJsonPath(err.instancePath || ""),
        message: err.message || "Validation error",
        keyword: err.keyword,
        schemaPath: err.schemaPath,
      })
    );

    return {
      valid,
      errors,
      timeMs: Math.round(performance.now() - start),
    };
  },

  clearSchema(): void {
    currentValidateFn = null;
    currentDraft = null;
    ajv07 = null;
    ajv2020 = null;
  },

  getDraft(): string | null {
    return currentDraft;
  },
};

export type ValidatorApi = typeof validatorApi;

Comlink.expose(validatorApi);
