"use client";

import { useEffect, useRef, memo } from "react";
import { useTheme } from "@/lib/theme-context";
import { Mode, createJSONEditor } from "vanilla-jsoneditor";
import type { Content } from "vanilla-jsoneditor";

interface EditorProps {
  content: string;
  mode: "text" | "tree";
  onChange: (content: string) => void;
}

const Editor = memo(function Editor({ content, mode, onChange }: EditorProps) {
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
        mode: mode === "tree" ? Mode.tree : Mode.text,
        content: { text: content },
        onChange: (updatedContent: Content, previousContent: Content, patchResult: unknown) => {
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
        mode: mode === "tree" ? Mode.tree : Mode.text,
      });
    }
  }, [mode]);

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
