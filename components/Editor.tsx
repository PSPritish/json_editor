"use client";

import { useEffect, useRef, memo } from "react";
import { useTheme } from "@/lib/theme-context";
import { Mode, createJSONEditor } from "vanilla-jsoneditor";
import type { Content } from "vanilla-jsoneditor";

type EditorMode = "text" | "tree" | "table";

interface EditorProps {
  content: string;
  mode: EditorMode;
  onChange: (content: string) => void;
  readOnly?: boolean;
}

function toJseMode(mode: EditorMode): Mode {
  switch (mode) {
    case "tree": return Mode.tree;
    case "table": return Mode.table;
    default: return Mode.text;
  }
}

const Editor = memo(function Editor({ content, mode, onChange, readOnly = false }: EditorProps) {
  const { theme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ReturnType<typeof createJSONEditor> | null>(null);
  const internalUpdateRef = useRef(false);

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return;

    editorRef.current = createJSONEditor({
      target: containerRef.current,
      props: {
        mode: toJseMode(mode),
        content: { text: content },
        readOnly,
        onChange: (updatedContent: Content, previousContent: Content, patchResult: unknown) => {
          if (readOnly) return;
          // Prevent onChange feedback loop
          internalUpdateRef.current = true;
          if ("text" in updatedContent && typeof updatedContent.text === "string") {
            onChange(updatedContent.text);
          } else if ("json" in updatedContent) {
            onChange(JSON.stringify(updatedContent.json, null, 2));
          }
        },
      },
    });

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // Update mode
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateProps({
        mode: toJseMode(mode),
      });
    }
  }, [mode]);

  // Update readOnly
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateProps({ readOnly });
    }
  }, [readOnly]);

  // Update content externally (e.g., from time machine or open file)
  useEffect(() => {
    if (editorRef.current && !internalUpdateRef.current) {
      editorRef.current.updateProps({
        content: { text: content },
      });
    }
    // Reset the flag after processing the potential external update
    internalUpdateRef.current = false;
  }, [content]);

  return (
    <div 
      ref={containerRef} 
      className={`jse-main ${theme === "dark" ? "jse-theme-dark" : ""}`} 
      style={{ height: "100%", width: "100%" }} 
    />
  );
});

export default Editor;
