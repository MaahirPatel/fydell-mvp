import { useEffect, useMemo, useRef, useState } from "react";
import { FileEntry } from "../lib/tauri";

/* ============================================================================
   Command palette — Cmd/Ctrl+K. Fuzzy file search plus workspace actions:
   open file, run tests, open brief, open team thread, review analysis,
   submit. Keyboard navigable (up/down/enter/esc).
   ========================================================================== */

export interface PaletteAction {
  id: string;
  label: string;
  hint: string;
  run: () => void;
}

function fuzzy(hay: string, needle: string): boolean {
  const h = hay.toLowerCase();
  const n = needle.toLowerCase();
  let hi = 0;
  for (let ni = 0; ni < n.length; ni++) {
    hi = h.indexOf(n[ni], hi);
    if (hi === -1) return false;
    hi++;
  }
  return true;
}

export default function CommandPalette({
  files,
  actions,
  onClose,
  onOpenFile,
}: {
  files: FileEntry[];
  actions: PaletteAction[];
  onClose: () => void;
  onOpenFile: (path: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const fileResults = useMemo(() => {
    if (!query.trim()) return files.slice(0, 8);
    return files.filter((f) => fuzzy(f.path, query)).slice(0, 8);
  }, [files, query]);

  const actionResults = useMemo(() => {
    if (!query.trim()) return actions;
    return actions.filter((a) => fuzzy(a.label + " " + a.hint, query));
  }, [actions, query]);

  const total = fileResults.length + actionResults.length;

  const choose = (i: number) => {
    if (i < fileResults.length) {
      onOpenFile(fileResults[i].path);
    } else {
      actionResults[i - fileResults.length]?.run();
    }
    onClose();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, total - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (total > 0) choose(index);
    }
  };

  return (
    <div className="palette-overlay" onClick={onClose} role="presentation">
      <div
        className="palette"
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          className="palette-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIndex(0);
          }}
          onKeyDown={onKey}
          placeholder="Type a file name or command…"
          aria-label="Search files and commands"
          spellCheck={false}
        />
        <div className="palette-results" role="listbox">
          {total === 0 && (
            <div className="palette-empty muted">No matches.</div>
          )}
          {fileResults.map((f, i) => (
            <button
              key={f.path}
              role="option"
              aria-selected={i === index}
              className={`palette-item ${i === index ? "active" : ""}`}
              onClick={() => choose(i)}
              onMouseEnter={() => setIndex(i)}
            >
              <span className="palette-file-icon">{fileIcon(f.path)}</span>
              <span className="mono">{f.path}</span>
            </button>
          ))}
          {actionResults.map((a, ai) => {
            const i = fileResults.length + ai;
            return (
              <button
                key={a.id}
                role="option"
                aria-selected={i === index}
                className={`palette-item ${i === index ? "active" : ""}`}
                onClick={() => choose(i)}
                onMouseEnter={() => setIndex(i)}
              >
                <span className="palette-action-dot" />
                <span>{a.label}</span>
                <span className="muted palette-hint">{a.hint}</span>
              </button>
            );
          })}
        </div>
        <div className="palette-foot muted">
          <span><kbd>↑↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}

export function fileIcon(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "py":
      return "🐍";
    case "ts":
    case "tsx":
      return "📘";
    case "js":
    case "jsx":
      return "📙";
    case "md":
      return "📝";
    case "json":
    case "yaml":
    case "yml":
      return "⚙️";
    default:
      return "📄";
  }
}
