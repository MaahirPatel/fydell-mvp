"use client";

import { useEffect, useRef } from "react";
import Editor, { DiffEditor, loader, type Monaco, type OnMount } from "@monaco-editor/react";
import type { SimTheme } from "./prefs";

loader.config({ paths: { vs: "/monaco/vs" } });

type MonacoEditor = Parameters<OnMount>[0];

const MONO_STACK = 'ui-monospace, SFMono-Regular, "Cascadia Code", "Cascadia Mono", Menlo, Consolas, monospace';

const DARK = {
  bg: "#16191D",
  raised: "#1D2127",
  line: "#2B313A",
  text: "#ECEFF4",
  muted: "#6f7886",
  secondary: "#A6AFBD",
  selection: "#353c66",
};

const LIGHT = {
  bg: "#FFFFFF",
  raised: "#F6F7F9",
  line: "#E6E8EC",
  text: "#14161B",
  muted: "#8A919E",
  secondary: "#4F5562",
  selection: "#DADCF7",
};

type DiagnosticsTarget = { setDiagnosticsOptions: (options: { noSemanticValidation: boolean; noSyntaxValidation: boolean }) => void };

function isDiagnosticsTarget(v: unknown): v is DiagnosticsTarget {
  return !!v && typeof v === "object" && typeof (v as { setDiagnosticsOptions?: unknown }).setDiagnosticsOptions === "function";
}

let prepared = false;

/**
 * Registers the Fydell editor themes once and turns off JavaScript and
 * TypeScript semantic checks: the browser cannot see the project's modules,
 * so those squiggles would be wrong. Syntax errors still show.
 */
function prepare(monaco: Monaco) {
  if (prepared) return;
  prepared = true;
  const theme = (base: "vs" | "vs-dark", c: typeof DARK) => ({
    base,
    inherit: true,
    rules: [],
    colors: {
      "editor.background": c.bg,
      "editor.foreground": c.text,
      "editorGutter.background": c.bg,
      "editor.lineHighlightBackground": c.raised,
      "editor.lineHighlightBorder": c.raised,
      "editorLineNumber.foreground": c.muted,
      "editorLineNumber.activeForeground": c.secondary,
      "editor.selectionBackground": c.selection,
      "editor.inactiveSelectionBackground": c.selection,
      "editorIndentGuide.background1": c.line,
      "editorWidget.background": c.raised,
      "editorWidget.border": c.line,
      "editorStickyScroll.background": c.bg,
      "scrollbarSlider.background": base === "vs-dark" ? "#ffffff1f" : "#0000001f",
      "diffEditor.insertedTextBackground": base === "vs-dark" ? "#7fbf9530" : "#2f7d5426",
      "diffEditor.removedTextBackground": base === "vs-dark" ? "#ef7b7b30" : "#c2405a24",
      "diffEditor.insertedLineBackground": base === "vs-dark" ? "#7fbf9518" : "#2f7d5412",
      "diffEditor.removedLineBackground": base === "vs-dark" ? "#ef7b7b18" : "#c2405a12",
    },
  });
  monaco.editor.defineTheme("fydell-dark", theme("vs-dark", DARK));
  monaco.editor.defineTheme("fydell-light", theme("vs", LIGHT));
  const holders: unknown[] = [(monaco as unknown as { typescript?: unknown }).typescript, (monaco.languages as unknown as { typescript?: unknown }).typescript];
  for (const holder of holders) {
    if (!holder || typeof holder !== "object") continue;
    for (const key of ["javascriptDefaults", "typescriptDefaults"]) {
      const target: unknown = (holder as Record<string, unknown>)[key];
      if (isDiagnosticsTarget(target)) target.setDiagnosticsOptions({ noSemanticValidation: true, noSyntaxValidation: false });
    }
  }
}

const themeName = (t: SimTheme) => (t === "dark" ? "fydell-dark" : "fydell-light");

export const modelPath = (path: string) => `file:///workspace/${path}`;

export interface RevealRequest {
  path: string;
  line: number;
  column: number;
  nonce: number;
}

function applyReveal(editor: MonacoEditor, r: RevealRequest) {
  const model = editor.getModel();
  if (!model) return;
  const line = Math.min(Math.max(1, r.line), model.getLineCount());
  editor.setPosition({ lineNumber: line, column: Math.max(1, r.column) });
  editor.revealLineInCenter(line);
  editor.focus();
}

export function CodeEditor({
  path,
  value,
  language,
  readOnly,
  theme,
  fontSize,
  label,
  reveal,
  onChange,
  onCursor,
  onSaveShortcut,
}: {
  path: string;
  value: string;
  language: string;
  readOnly: boolean;
  theme: SimTheme;
  fontSize: number;
  label: string;
  reveal: RevealRequest | null;
  onChange: (value: string) => void;
  onCursor?: (line: number, column: number) => void;
  onSaveShortcut?: () => void;
}) {
  const editorRef = useRef<MonacoEditor | null>(null);
  const pendingReveal = useRef<RevealRequest | null>(null);
  const saveRef = useRef(onSaveShortcut);
  const cursorRef = useRef(onCursor);
  useEffect(() => {
    saveRef.current = onSaveShortcut;
    cursorRef.current = onCursor;
  }, [onSaveShortcut, onCursor]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const model = editor.getModel();
    if (model && model.getValue() !== value) model.setValue(value);
  }, [path, value]);

  useEffect(() => {
    if (!reveal || reveal.path !== path) return;
    const editor = editorRef.current;
    if (editor) applyReveal(editor, reveal);
    else pendingReveal.current = reveal;
  }, [reveal, path]);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveRef.current?.());
    editor.onDidChangeCursorPosition((e) => cursorRef.current?.(e.position.lineNumber, e.position.column));
    if (pendingReveal.current) {
      applyReveal(editor, pendingReveal.current);
      pendingReveal.current = null;
    }
  };

  return (
    <Editor
      height="100%"
      path={modelPath(path)}
      value={value}
      language={language}
      theme={themeName(theme)}
      beforeMount={prepare}
      onMount={onMount}
      onChange={(next) => onChange(next ?? "")}
      loading={<p className="p-5 text-[13px] text-[var(--text-secondary)]" role="status">Loading the editor</p>}
      options={{
        readOnly,
        readOnlyMessage: { value: "This file is read-only here." },
        ariaLabel: label,
        fontSize,
        lineHeight: Math.round(fontSize * 1.6),
        fontFamily: MONO_STACK,
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        tabSize: language === "python" ? 4 : 2,
        padding: { top: 12, bottom: 12 },
        renderLineHighlight: "line",
        accessibilitySupport: "auto",
        smoothScrolling: false,
        cursorBlinking: "solid",
        stickyScroll: { enabled: false },
        fixedOverflowWidgets: true,
      }}
    />
  );
}

export function CodeDiff({
  id,
  original,
  modified,
  language,
  theme,
  fontSize,
  label,
}: {
  /** Distinguishes model paths so concurrent diffs never share a model. */
  id: string;
  original: string;
  modified: string;
  language: string;
  theme: SimTheme;
  fontSize: number;
  label: string;
}) {
  return (
    <DiffEditor
      height="100%"
      original={original}
      modified={modified}
      language={language}
      originalModelPath={`inmemory://diff/${id}/original`}
      modifiedModelPath={`inmemory://diff/${id}/modified`}
      keepCurrentOriginalModel
      keepCurrentModifiedModel
      theme={themeName(theme)}
      beforeMount={prepare}
      onMount={(editor) => {
        const model = editor.getModel();
        if (!model) return;
        if (model.original.getValue() !== original) model.original.setValue(original);
        if (model.modified.getValue() !== modified) model.modified.setValue(modified);
      }}
      loading={<p className="p-5 text-[13px] text-[var(--text-secondary)]" role="status">Loading the comparison</p>}
      options={{
        readOnly: true,
        originalEditable: false,
        ariaLabel: label,
        fontSize,
        lineHeight: Math.round(fontSize * 1.6),
        fontFamily: MONO_STACK,
        minimap: { enabled: false },
        automaticLayout: true,
        scrollBeyondLastLine: false,
        renderSideBySide: true,
        useInlineViewWhenSpaceIsLimited: true,
        renderOverviewRuler: false,
        padding: { top: 12, bottom: 12 },
        accessibilitySupport: "auto",
        fixedOverflowWidgets: true,
      }}
    />
  );
}
