"use client";

import { useState, useEffect, useCallback, useRef, type MouseEvent as ReactMouseEvent } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import StatusBar from "@/components/StatusBar";
import WelcomeScreen from "@/components/WelcomeScreen";
import ValidationPanel from "@/components/ValidationPanel";
import DiffPanel from "@/components/DiffPanel";
import TimeMachine from "@/components/TimeMachine";
import { useWorker } from "@/lib/use-worker";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/lib/toast-context";
import { type ParserApi } from "@/workers/json-parser.worker";
import { type ValidatorApi, type ValidationError } from "@/workers/schema-validator.worker";
import { type DiffApi, type DiffResult } from "@/workers/diff.worker";
import { openJsonFile, saveJsonFile, saveAsJsonFile, verifyPermission } from "@/lib/file-system";
import { saveFileRecord, updateFileRecord, createSnapshot, getSnapshots, type FileRecord, type SnapshotRecord } from "@/lib/db";
import { matchShortcut } from "@/lib/keyboard-shortcuts";

const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

type AppView = "dual" | "home" | "main";

export default function AppShell() {
  const { toggleTheme } = useTheme();
  const { addToast } = useToast();

  // --- Navigation ---
  const [view, setView] = useState<AppView>("dual");
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"text" | "tree" | "table">("text");

  // --- Per-pane modes ---
  type PaneMode = "text" | "tree" | "table";
  const [leftMode, setLeftMode] = useState<PaneMode>("text");
  const [rightMode, setRightMode] = useState<PaneMode>("text");

  // --- Fullscreen pane ---
  const [fullscreenPane, setFullscreenPane] = useState<"left" | "right" | null>(null);

  // --- Resizer state ---
  const [splitPercent, setSplitPercent] = useState(50);
  const isResizingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Main Editor (Single File) State ---
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null);
  const [fileRecordId, setFileRecordId] = useState<number | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileSizeBytes, setFileSizeBytes] = useState<number>(0);
  const [isDirty, setIsDirty] = useState(false);
  const [parseTimeMs, setParseTimeMs] = useState(0);
  const [stats, setStats] = useState({ keys: 0, arrays: 0, maxDepth: 0, totalNodes: 0 });

  // --- Dual Pane State ---
  const [leftContent, setLeftContent] = useState<string>("");
  const [rightContent, setRightContent] = useState<string>("");

  // --- Validation & Diff State ---
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [hasSchema, setHasSchema] = useState(false);
  const [validationStatus, setValidationStatus] = useState<"valid" | "invalid" | "checking" | "none">("none");
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);
  const [diffSnapshotId, setDiffSnapshotId] = useState<number | null>(null);
  const [isComputingDiff, setIsComputingDiff] = useState(false);

  // --- Debounce timer ref ---
  const validationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Workers ---
  const { api: parserApi, error: parserError } = useWorker<ParserApi>(
    () => new Worker(new URL("../workers/json-parser.worker.ts", import.meta.url))
  );
  const { api: validatorApi, error: validatorError } = useWorker<ValidatorApi>(
    () => new Worker(new URL("../workers/schema-validator.worker.ts", import.meta.url))
  );
  const { api: diffApi, error: diffError } = useWorker<DiffApi>(
    () => new Worker(new URL("../workers/diff.worker.ts", import.meta.url))
  );

  // Show worker initialization errors
  useEffect(() => {
    if (parserError) addToast(`Parser worker failed: ${parserError}`, "error");
    if (validatorError) addToast(`Validator worker failed: ${validatorError}`, "error");
    if (diffError) addToast(`Diff worker failed: ${diffError}`, "error");
  }, [parserError, validatorError, diffError, addToast]);

  // --- Helpers ---
  const loadSnapshots = useCallback(async (recordId: number) => {
    try {
      const snaps = await getSnapshots(recordId);
      setSnapshots(snaps);
    } catch (e) {
      console.error("Failed to load snapshots:", e);
    }
  }, []);

  // --- Main Editor Handlers ---
  const handleEditorChange = useCallback((newContent: string) => {
    setFileContent(newContent);
    setFileSizeBytes(new Blob([newContent]).size);
    setIsDirty(true);

    if (parserApi) {
      parserApi.getStats(newContent).then(setStats).catch(() => {});
    }

    if (validatorApi && hasSchema) {
      setValidationStatus("checking");
      if (validationTimerRef.current) clearTimeout(validationTimerRef.current);
      validationTimerRef.current = setTimeout(() => {
        try {
          const parsed = JSON.parse(newContent);
          validatorApi
            .validate(parsed)
            .then((res) => {
              setValidationErrors(res.errors);
              setValidationStatus(res.valid ? "valid" : "invalid");
            })
            .catch(() => setValidationStatus("invalid"));
        } catch {
          setValidationStatus("invalid");
        }
      }, 500);
    }
  }, [parserApi, validatorApi, hasSchema]);

  const handleOpen = useCallback(async () => {
    try {
      const result = await openJsonFile();
      if (!result) return;
      setFileHandle(result.handle);
      setFileName(result.name);
      setFileContent(result.content);
      setFileSizeBytes(result.sizeBytes);
      setIsDirty(false);
      setView("main");
      setActivePanel(null);

      try {
        const recordId = await saveFileRecord({
          name: result.name,
          handle: result.handle,
          lastOpened: Date.now(),
          sizeBytes: result.sizeBytes,
        });
        setFileRecordId(recordId);
        await createSnapshot(recordId, result.content, "Opened");
        loadSnapshots(recordId);
      } catch (dbErr) {
        console.error("IndexedDB error:", dbErr);
        addToast("Could not save to recent files (IndexedDB error)", "error");
      }

      if (parserApi) {
        try {
          const parseRes = await parserApi.parse(result.content);
          setParseTimeMs(parseRes.parseTimeMs);
          if (parseRes.success) {
            const s = await parserApi.getStats(result.content);
            setStats(s);
          }
        } catch (workerErr) {
          console.error("Parser worker error:", workerErr);
        }
      }

      addToast(`Opened ${result.name}`, "success");
    } catch (e) {
      console.error("Failed to open file:", e);
      addToast(`Failed to open file: ${e instanceof Error ? e.message : "Unknown error"}`, "error");
    }
  }, [parserApi, loadSnapshots, addToast]);

  const handleOpenRecent = useCallback(async (record: FileRecord) => {
    if (!record.handle) {
      addToast("Cannot reopen this file — file handle is missing", "error");
      return;
    }
    try {
      const hasPerm = await verifyPermission(record.handle);
      if (!hasPerm) {
        addToast("Permission denied — please reopen the file manually", "error");
        return;
      }

      const file = await record.handle.getFile();
      const content = await file.text();

      setFileHandle(record.handle);
      setFileName(file.name);
      setFileContent(content);
      setFileSizeBytes(file.size);
      setIsDirty(false);
      setView("main");
      setActivePanel(null);

      if (record.id) {
        setFileRecordId(record.id);
        updateFileRecord(record.id, { lastOpened: Date.now(), sizeBytes: file.size });
        loadSnapshots(record.id);
      }
      if (parserApi) {
        parserApi.getStats(content).then(setStats).catch(() => {});
      }

      addToast(`Opened ${file.name}`, "success");
    } catch (e) {
      console.error("Failed to open recent file:", e);
      addToast(`Failed to open file: ${e instanceof Error ? e.message : "Unknown error"}`, "error");
    }
  }, [parserApi, loadSnapshots, addToast]);

  const handleSaveAs = useCallback(async () => {
    try {
      const handle = await saveAsJsonFile(fileContent, fileName || "document.json");
      if (handle) {
        setFileHandle(handle);
        setFileName(handle.name);
        setIsDirty(false);
        try {
          const recordId = await saveFileRecord({
            name: handle.name,
            handle,
            lastOpened: Date.now(),
            sizeBytes: fileSizeBytes,
          });
          setFileRecordId(recordId);
          await createSnapshot(recordId, fileContent, "Save As");
          loadSnapshots(recordId);
        } catch (dbErr) {
          console.error("IndexedDB error:", dbErr);
        }
        addToast(`Saved as ${handle.name}`, "success");
      }
    } catch (e) {
      console.error("Save As failed:", e);
      addToast(`Save As failed: ${e instanceof Error ? e.message : "Unknown error"}`, "error");
    }
  }, [fileContent, fileName, fileSizeBytes, loadSnapshots, addToast]);

  const handleSave = useCallback(async () => {
    if (!fileHandle) {
      return handleSaveAs();
    }
    try {
      const success = await saveJsonFile(fileHandle, fileContent);
      if (success) {
        setIsDirty(false);
        if (fileRecordId) {
          await updateFileRecord(fileRecordId, { lastOpened: Date.now(), sizeBytes: fileSizeBytes });
          await createSnapshot(fileRecordId, fileContent, "Manual save");
          loadSnapshots(fileRecordId);
        }
        addToast("File saved", "success");
      } else {
        addToast("Save failed — could not write to file", "error");
      }
    } catch (e) {
      console.error("Save failed:", e);
      addToast(`Save failed: ${e instanceof Error ? e.message : "Unknown error"}`, "error");
    }
  }, [fileHandle, fileContent, fileRecordId, fileSizeBytes, loadSnapshots, addToast, handleSaveAs]);

  const handleLoadSchema = useCallback(async () => {
    try {
      const result = await openJsonFile();
      if (!result) return;
      if (validatorApi) {
        let schema;
        try {
          schema = JSON.parse(result.content);
        } catch {
          addToast("Invalid JSON schema file", "error");
          return;
        }
        await validatorApi.setSchema(schema);
        setHasSchema(true);
        addToast(`Schema loaded: ${result.name}`, "success");
        // Trigger validation
        handleEditorChange(fileContent);
      }
    } catch (e) {
      console.error("Schema load error:", e);
      addToast(`Failed to load schema: ${e instanceof Error ? e.message : "Unknown error"}`, "error");
    }
  }, [validatorApi, fileContent, handleEditorChange, addToast]);

  const handleFormat = useCallback(async (contentToFormat: string, setter: (val: string) => void) => {
    if (!parserApi) {
      addToast("Parser not ready yet — try again", "info");
      return;
    }
    try {
      JSON.parse(contentToFormat); // validate first
    } catch {
      addToast("Cannot format — JSON is invalid", "error");
      return;
    }
    try {
      const res = await parserApi.stringify(JSON.parse(contentToFormat), 2);
      if (res.success && res.text) {
        setter(res.text);
        addToast("Formatted", "success");
      }
    } catch (e) {
      console.error("Format error:", e);
      addToast("Format failed", "error");
    }
  }, [parserApi, addToast]);

  const handleCompareSnapshot = useCallback(async (snapshotId: number | null) => {
    setDiffSnapshotId(snapshotId);
    if (!snapshotId || !diffApi) {
      setDiffResult(null);
      return;
    }
    setIsComputingDiff(true);
    try {
      const snap = snapshots.find(s => s.id === snapshotId);
      if (snap) {
        let leftObj, rightObj;
        try { leftObj = JSON.parse(snap.content); } catch { leftObj = snap.content; }
        try { rightObj = JSON.parse(fileContent); } catch { rightObj = fileContent; }
        const diff = await diffApi.computeDiff(leftObj, rightObj);
        setDiffResult(diff);
      }
    } catch (e) {
      console.error("Diff error:", e);
      addToast("Diff computation failed", "error");
    } finally {
      setIsComputingDiff(false);
    }
  }, [diffApi, snapshots, fileContent, addToast]);

  // --- Dual Pane Handlers ---
  const handleDualCompare = useCallback(async () => {
    if (!diffApi) {
      addToast("Diff engine not ready yet", "info");
      return;
    }
    try {
      const leftObj = JSON.parse(leftContent || "{}");
      const rightObj = JSON.parse(rightContent || "{}");
      const result = await diffApi.computeDiff(leftObj, rightObj);
      setDiffResult(result);
      setActivePanel("diff");
      addToast("Diff computed", "success");
    } catch {
      addToast("Invalid JSON in one or both panes — fix before comparing", "error");
    }
  }, [diffApi, leftContent, rightContent, addToast]);

  // --- Sidebar Navigation ---
  const handleSidebarPanelChange = useCallback((panel: string | null) => {
    if (panel === "home") {
      setView("home");
      setActivePanel(null);
    } else if (panel === "editor") {
      // "Editor" icon always goes back to dual pane if no file is open
      if (fileName) {
        setView("main");
      } else {
        setView("dual");
      }
      setActivePanel(null);
    } else {
      // Panel toggles (timeMachine, diff, validation, shortcuts)
      if (view === "home") {
        setView(fileName ? "main" : "dual");
      }
      setActivePanel((prev) => (prev === panel ? null : panel));
    }
  }, [view, fileName]);

  // --- Resizer drag logic ---
  const handleResizerMouseDown = useCallback((e: ReactMouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    const target = e.currentTarget as HTMLElement;
    target.classList.add("dragging");

    const onMouseMove = (ev: globalThis.MouseEvent) => {
      if (!isResizingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const pct = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitPercent(Math.max(15, Math.min(85, pct)));
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      target.classList.remove("dragging");
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, []);

  // --- Keyboard Shortcuts ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Escape exits fullscreen pane
      if (e.key === "Escape" && fullscreenPane) {
        setFullscreenPane(null);
        return;
      }

      const action = matchShortcut(e);
      if (!action) return;
      e.preventDefault();
      switch (action) {
        case "open": handleOpen(); break;
        case "save": handleSave(); break;
        case "saveAs": handleSaveAs(); break;
        case "format":
          handleFormat(
            view === "dual" ? leftContent : fileContent,
            view === "dual" ? setLeftContent : setFileContent
          );
          break;
        case "toggleTheme": toggleTheme(); break;
        default: break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleOpen, handleSave, handleSaveAs, handleFormat, toggleTheme, view, leftContent, fileContent]);

  // Determine sidebar highlight
  const sidebarActivePanel = view === "home" ? "home" : (view === "dual" || view === "main") ? (activePanel || "editor") : activePanel;

  // --- Pane toolbar renderer ---
  const renderPaneToolbar = (side: "left" | "right", paneMode: PaneMode, setPaneMode: (m: PaneMode) => void, content: string, setContent: (c: string) => void) => {
    const isFs = fullscreenPane === side;
    return (
      <div className="pane-toolbar">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="pane-label">{side === "left" ? "Document A" : "Document B"}</span>
          <div className="mode-switch">
            <button
              className={paneMode === "text" ? "active" : ""}
              onClick={() => setPaneMode("text")}
              title="Code editor"
            >
              Code
            </button>
            <button
              className={paneMode === "tree" ? "active" : ""}
              onClick={() => setPaneMode("tree")}
              title="Tree view — click values to edit, right-click for context menu"
            >
              Tree
            </button>
            <button
              className={paneMode === "table" ? "active" : ""}
              onClick={() => setPaneMode("table")}
              title="Table view — for arrays of objects"
            >
              Table
            </button>
          </div>
        </div>
        <div className="pane-actions">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => handleFormat(content, setContent)}
            title="Format JSON"
          >
            Format
          </button>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => setFullscreenPane(isFs ? null : side)}
            title={isFs ? "Exit fullscreen (Esc)" : "Fullscreen this pane"}
          >
            {isFs ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="4 14 10 14 10 20" />
                <polyline points="20 10 14 10 14 4" />
                <line x1="14" y1="10" x2="21" y2="3" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="15 3 21 3 21 9" />
                <polyline points="9 21 3 21 3 15" />
                <line x1="21" y1="3" x2="14" y2="10" />
                <line x1="3" y1="21" x2="10" y2="14" />
              </svg>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="app-layout">
      <Header
        fileName={view === "dual" ? "Compare Mode" : (fileName || null)}
        fileSize={view === "dual" ? 0 : fileSizeBytes}
        parseTimeMs={view === "dual" ? 0 : parseTimeMs}
        isDirty={view === "dual" ? false : isDirty}
        validationCount={validationErrors.length}
        editorMode={editorMode}
        onToggleMode={() => setEditorMode(m => m === "text" ? "tree" : "text")}
        onOpen={handleOpen}
        onSave={view === "dual" ? () => {} : handleSave}
        onSaveAs={view === "dual" ? () => {} : handleSaveAs}
        onFormat={() =>
          handleFormat(
            view === "dual" ? leftContent : fileContent,
            view === "dual" ? setLeftContent : setFileContent
          )
        }
        onLoadSchema={view === "dual" ? () => {} : handleLoadSchema}
      />

      <Sidebar activePanel={sidebarActivePanel} onPanelChange={handleSidebarPanelChange} />

      <main className="app-main">
        {view === "home" && (
          <WelcomeScreen onOpen={handleOpen} onOpenRecent={handleOpenRecent} />
        )}

        {view === "dual" && (
          <div ref={containerRef} style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden", position: "relative" }}>

            {/* Left Pane */}
            {fullscreenPane !== "right" && (
              <div
                className={fullscreenPane === "left" ? "pane-fullscreen" : ""}
                style={fullscreenPane === "left"
                  ? undefined
                  : { width: `${splitPercent}%`, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }
                }
              >
                {renderPaneToolbar("left", leftMode, setLeftMode, leftContent, setLeftContent)}
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <Editor content={leftContent} mode={leftMode} onChange={setLeftContent} />
                </div>
              </div>
            )}

            {/* Drag-to-resize handle */}
            {!fullscreenPane && (
              <div
                className="pane-resizer"
                onMouseDown={handleResizerMouseDown}
                title="Drag to resize panes"
              />
            )}

            {/* Right Pane */}
            {fullscreenPane !== "left" && (
              <div
                className={fullscreenPane === "right" ? "pane-fullscreen" : ""}
                style={fullscreenPane === "right"
                  ? undefined
                  : { width: `${100 - splitPercent}%`, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }
                }
              >
                {renderPaneToolbar("right", rightMode, setRightMode, rightContent, setRightContent)}
                <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                  <Editor content={rightContent} mode={rightMode} onChange={setRightContent} />
                  {/* Compare button overlay */}
                  {!fullscreenPane && (
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={handleDualCompare}
                      style={{
                        position: "absolute",
                        bottom: 12,
                        right: 12,
                        zIndex: 10,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        boxShadow: "var(--shadow-lg)",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="2" y="3" width="8" height="18" rx="1" />
                        <rect x="14" y="3" width="8" height="18" rx="1" />
                      </svg>
                      Compare
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Diff side panel */}
            {activePanel === "diff" && (
              <DiffPanel
                diffResult={diffResult}
                snapshots={[]}
                currentSnapshotId={null}
                isComputing={false}
                onSelectSnapshot={() => {}}
                onClose={() => setActivePanel(null)}
              />
            )}
          </div>
        )}

        {view === "main" && (
          <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
            {activePanel === "timeMachine" && (
              <TimeMachine
                snapshots={snapshots}
                onClose={() => setActivePanel(null)}
                onRevert={(c) => { setFileContent(c); setIsDirty(true); addToast("Reverted to snapshot", "info"); }}
                onCompare={(id) => { setDiffSnapshotId(id); setActivePanel("diff"); }}
              />
            )}

            <div className="split-horizontal" style={{ flex: 1 }}>
              <div className="editor-area">
                <Editor content={fileContent} mode={editorMode} onChange={handleEditorChange} />
              </div>

              {activePanel === "validation" && (
                <ValidationPanel
                  errors={validationErrors}
                  onClose={() => setActivePanel(null)}
                />
              )}
            </div>

            {activePanel === "diff" && (
              <DiffPanel
                diffResult={diffResult}
                snapshots={snapshots}
                currentSnapshotId={diffSnapshotId}
                isComputing={isComputingDiff}
                onSelectSnapshot={handleCompareSnapshot}
                onClose={() => setActivePanel(null)}
              />
            )}
          </div>
        )}
      </main>

      <StatusBar
        stats={view === "main" ? stats : { keys: 0, arrays: 0, maxDepth: 0, totalNodes: 0 }}
        hasSchema={view === "main" ? hasSchema : false}
        validationStatus={view === "main" ? validationStatus : "none"}
      />
    </div>
  );
}
