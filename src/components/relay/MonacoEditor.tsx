"use client";

/**
 * Thin wrapper around @monaco-editor/react for the Project Relay workspace.
 * Kept dumb on purpose — no session wiring here. Language/theme mapping and
 * autosave live in the workspace shell (later checkpoint).
 */
import Editor, { type OnMount } from "@monaco-editor/react";

const EXTENSION_LANGUAGE: Record<string, string> = {
  py: "python",
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  md: "markdown",
  yaml: "yaml",
  yml: "yaml",
  txt: "plaintext",
};

function languageForPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_LANGUAGE[ext] ?? "plaintext";
}

export interface MonacoEditorProps {
  path: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  height?: string | number;
  onMount?: OnMount;
}

export default function MonacoEditor({
  path,
  value,
  onChange,
  readOnly = false,
  height = "100%",
  onMount,
}: MonacoEditorProps) {
  return (
    <Editor
      path={path}
      language={languageForPath(path)}
      value={value}
      theme="vs-dark"
      height={height}
      onChange={(next) => onChange?.(next ?? "")}
      onMount={onMount}
      options={{
        readOnly,
        fontSize: 13,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 4,
        wordWrap: "on",
      }}
    />
  );
}
