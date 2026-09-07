/* ============================================================
   File System Access API wrapper
   - Chrome-optimized (OPFS, createWritable)
   - Graceful fallback for non-Chrome browsers
   ============================================================ */

// Type declarations for File System Access API
declare global {
  interface Window {
    showOpenFilePicker(options?: any): Promise<FileSystemFileHandle[]>;
    showSaveFilePicker(options?: any): Promise<FileSystemFileHandle>;
  }
  interface FileSystemFileHandle {
    getFile(): Promise<File>;
    createWritable(options?: any): Promise<any>;
    queryPermission(options?: any): Promise<PermissionState>;
    requestPermission(options?: any): Promise<PermissionState>;
  }
}

export interface OpenFileResult {
  handle: FileSystemFileHandle;
  content: string;
  name: string;
  sizeBytes: number;
}

/**
 * Open a JSON file via the File System Access API.
 * Falls back to <input type="file"> if the API is not available.
 */
export async function openJsonFile(): Promise<OpenFileResult | null> {
  // Modern File System Access API (Chrome 86+)
  if ("showOpenFilePicker" in window) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [
          {
            description: "JSON files",
            accept: { "application/json": [".json", ".jsonl", ".geojson"] },
          },
        ],
        multiple: false,
      });

      const file = await handle.getFile();
      const content = await file.text();

      return {
        handle,
        content,
        name: file.name,
        sizeBytes: file.size,
      };
    } catch (err: unknown) {
      // User cancelled the picker
      if (err instanceof DOMException && err.name === "AbortError") {
        return null;
      }
      throw err;
    }
  }

  // Fallback: <input type="file">
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.jsonl,.geojson,application/json";

    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const content = await file.text();
      resolve({
        handle: null as unknown as FileSystemFileHandle,
        content,
        name: file.name,
        sizeBytes: file.size,
      });
    };

    input.oncancel = () => resolve(null);
    input.click();
  });
}

/**
 * Save to an existing file handle using createWritable()
 * for high-performance in-place writes (no save dialog).
 */
export async function saveJsonFile(
  handle: FileSystemFileHandle,
  content: string
): Promise<boolean> {
  try {
    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
    return true;
  } catch (err) {
    console.error("Failed to save file:", err);
    return false;
  }
}

/**
 * Save As — prompts user for a new file location.
 */
export async function saveAsJsonFile(
  content: string,
  suggestedName: string = "document.json"
): Promise<FileSystemFileHandle | null> {
  if ("showSaveFilePicker" in window) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: "JSON file",
            accept: { "application/json": [".json"] },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();

      return handle;
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        return null;
      }
      throw err;
    }
  }

  // Fallback: Blob download
  downloadAsBlob(content, suggestedName);
  return null;
}

/**
 * Fallback download via Blob + <a> element
 */
function downloadAsBlob(content: string, filename: string): void {
  const blob = new Blob([content], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Re-verify permission on a persisted handle (after tab reload).
 */
export async function verifyPermission(
  handle: FileSystemFileHandle,
  readWrite: boolean = true
): Promise<boolean> {
  const mode = readWrite ? "readwrite" : "read";

  if ((await handle.queryPermission({ mode })) === "granted") {
    return true;
  }

  if ((await handle.requestPermission({ mode })) === "granted") {
    return true;
  }

  return false;
}

/**
 * Format byte count to human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
