"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import StatusBar from "@/components/StatusBar";
import WelcomeScreen from "@/components/WelcomeScreen";
import ValidationPanel from "@/components/ValidationPanel";
import DiffPanel from "@/components/DiffPanel";
import TimeMachine from "@/components/TimeMachine";
import { useWorker } from "@/lib/use-worker";
import { type ParserApi } from "@/workers/json-parser.worker";
import { type ValidatorApi, type ValidationError } from "@/workers/schema-validator.worker";
import { type DiffApi, type DiffResult } from "@/workers/diff.worker";
import { openJsonFile, saveJsonFile, saveAsJsonFile, verifyPermission } from "@/lib/file-system";
import { saveFileRecord, updateFileRecord, createSnapshot, getSnapshots, type FileRecord, type SnapshotRecord } from "@/lib/db";
import { matchShortcut } from "@/lib/keyboard-shortcuts";

const Editor = dynamic(() => import("@/components/Editor"), { ssr: false });

export default function AppShell() {
  // Navigation State
  // view: "dual" (default), "home" (welcome screen), "main" (single file editor)
  const [view, setView] = useState<"dual" | "home" | "main">("dual");
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<"text" | "tree">("text");

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

  // --- Workers ---
  const { api: parserApi } = useWorker<ParserApi>(() => new Worker(new URL("../workers/json-parser.worker.ts", import.meta.url)));
  const { api: validatorApi } = useWorker<ValidatorApi>(() => new Worker(new URL("../workers/schema-validator.worker.ts", import.meta.url)));
  const { api: diffApi } = useWorker<DiffApi>(() => new Worker(new URL("../workers/diff.worker.ts", import.meta.url)));

  const loadSnapshots = useCallback(async (recordId: number) => {
    const snaps = await getSnapshots(recordId);
    setSnapshots(snaps);
  }, []);

  // --- Main Editor Handlers ---
  const handleEditorChange = useCallback((newContent: string) => {
    setFileContent(newContent);
    setFileSizeBytes(new Blob([newContent]).size);
    setIsDirty(true);

    if (parserApi) {
      parserApi.getStats(newContent).then(setStats);
    }

    if (validatorApi && hasSchema) {
      setValidationStatus("checking");
      const timer = setTimeout(() => {
        try {
          const parsed = JSON.parse(newContent);
          validatorApi.validate(parsed).then((res) => {
            setValidationErrors(res.errors);
            setValidationStatus(res.valid ? "valid" : "invalid");
          });
        } catch {
          setValidationStatus("invalid");
        }
      }, 500);
      return () => clearTimeout(timer);
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

      const recordId = await saveFileRecord({
        name: result.name,
        handle: result.handle,
        lastOpened: Date.now(),
        sizeBytes: result.sizeBytes,
      });
      setFileRecordId(recordId);
      await createSnapshot(recordId, result.content, "Opened");
      loadSnapshots(recordId);

      if (parserApi) {
        const parseRes = await parserApi.parse(result.content);
        setParseTimeMs(parseRes.parseTimeMs);
        if (parseRes.success) {
          const s = await parserApi.getStats(result.content);
          setStats(s);
        }
      }
    } catch (e) {
      console.error("Failed to open file", e);
    }
  }, [parserApi, loadSnapshots]);

  const handleOpenRecent = useCallback(async (record: FileRecord) => {
    if (!record.handle) return;
    try {
      const hasPerm = await verifyPermission(record.handle);
      if (!hasPerm) return;

      const file = await record.handle.getFile();
      const content = await file.text();

      setFileHandle(record.handle);
      setFileName(file.name);
      setFileContent(content);
      setFileSizeBytes(file.size);
      setIsDirty(false);
      setView("main");
      
      if (record.id) {
        setFileRecordId(record.id);
        updateFileRecord(record.id, { lastOpened: Date.now(), sizeBytes: file.size });
        loadSnapshots(record.id);
      }
      if (parserApi) {
        const s = await parserApi.getStats(content);
        setStats(s);
      }
    } catch (e) {
      console.error("Failed to open recent file", e);
    }
  }, [parserApi, loadSnapshots]);

  const handleSave = useCallback(async () => {
    if (!fileHandle) return handleSaveAs();
    const success = await saveJsonFile(fileHandle, fileContent);
    if (success) {
      setIsDirty(false);
      if (fileRecordId) {
        await updateFileRecord(fileRecordId, { lastOpened: Date.now(), sizeBytes: fileSizeBytes });
        await createSnapshot(fileRecordId, fileContent, "Manual save");
        loadSnapshots(fileRecordId);
      }
    }
  }, [fileHandle, fileContent, fileRecordId, fileSizeBytes, loadSnapshots]);

  const handleSaveAs = useCallback(async () => {
    const handle = await saveAsJsonFile(fileContent, fileName || "document.json");
    if (handle) {
      setFileHandle(handle);
      setFileName(handle.name);
      setIsDirty(false);
      const recordId = await saveFileRecord({
        name: handle.name,
        handle,
        lastOpened: Date.now(),
        sizeBytes: fileSizeBytes,
      });
      setFileRecordId(recordId);
      await createSnapshot(recordId, fileContent, "Save As");
      loadSnapshots(recordId);
    }
  }, [fileContent, fileName, fileSizeBytes, loadSnapshots]);

  const handleLoadSchema = useCallback(async () => {
    try {
      const result = await openJsonFile();
      if (!result) return;
      if (validatorApi) {
        const schema = JSON.parse(result.content);
        await validatorApi.setSchema(schema);
        setHasSchema(true);
        handleEditorChange(fileContent);
      }
    } catch (e) {
      alert("Invalid schema file.");
    }
  }, [validatorApi, fileContent, handleEditorChange]);

  const handleFormat = useCallback(async (contentToFormat: string, setter: (val: string) => void) => {
    if (!parserApi) return;
    try {
      const parsed = JSON.parse(contentToFormat);
      const res = await parserApi.stringify(parsed, 2);
      if (res.success && res.text) {
        setter(res.text);
      }
    } catch (e) {
      console.error("Cannot format invalid JSON");
    }
  }, [parserApi]);

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
    } finally {
      setIsComputingDiff(false);
    }
  }, [diffApi, snapshots, fileContent]);

  // --- Dual Pane Handlers ---
  const handleDualCompare = useCallback(async () => {
    if (!diffApi) return;
    try {
      const leftObj = JSON.parse(leftContent || "{}");
      const rightObj = JSON.parse(rightContent || "{}");
      const result = await diffApi.computeDiff(leftObj, rightObj);
      setDiffResult(result);
      setActivePanel("diff");
    } catch (e) {
      alert("Invalid JSON in one of the panes. Please fix before comparing.");
    }
  }, [diffApi, leftContent, rightContent]);

  // Sidebar changes view
  const handleSidebarPanelChange = (panel: string | null) => {
    if (panel === "home") {
      setView("home");
      setActivePanel(null);
    } else {
      if (view === "home") {
        setView("main"); // Go back to main if leaving home
      }
      setActivePanel(panel);
    }
  };

  return (
    <div className="app-layout">
      {/* Dynamic Header based on view */}
      <Header
        fileName={view === "dual" ? "Compare Mode" : (fileName || "Untitled")}
        fileSize={view === "dual" ? 0 : fileSizeBytes}
        parseTimeMs={view === "dual" ? 0 : parseTimeMs}
        isDirty={view === "dual" ? false : isDirty}
        validationCount={validationErrors.length}
        editorMode={editorMode}
        onToggleMode={() => setEditorMode(m => m === "text" ? "tree" : "text")}
        onOpen={handleOpen}
        onSave={view === "dual" ? () => {} : handleSave}
        onSaveAs={view === "dual" ? () => {} : handleSaveAs}
        onFormat={() => handleFormat(view === "dual" ? leftContent : fileContent, view === "dual" ? setLeftContent : setFileContent)}
        onLoadSchema={view === "dual" ? () => {} : handleLoadSchema}
      />

      <Sidebar activePanel={view === "home" ? "home" : activePanel} onPanelChange={handleSidebarPanelChange} />

      <main className="app-main">
        {view === "home" && (
          <WelcomeScreen onOpen={handleOpen} onOpenRecent={handleOpenRecent} />
        )}

        {view === "dual" && (
          <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
            <div style={{ flex: 1, borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
              <div style={{ padding: 8, background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>LEFT PANE</span>
                <button className="btn btn-ghost btn-sm" onClick={() => handleFormat(leftContent, setLeftContent)}>Format</button>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <Editor content={leftContent} mode={editorMode} onChange={setLeftContent} />
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ padding: 8, background: "var(--bg-secondary)", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)" }}>RIGHT PANE</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button className="btn btn-ghost btn-sm" onClick={() => handleFormat(rightContent, setRightContent)}>Format</button>
                  <button className="btn btn-primary btn-sm" onClick={handleDualCompare}>Compare with Left</button>
                </div>
              </div>
              <div style={{ flex: 1, overflow: "hidden" }}>
                <Editor content={rightContent} mode={editorMode} onChange={setRightContent} />
              </div>
            </div>

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
                onRevert={(c) => { setFileContent(c); setIsDirty(true); }}
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
