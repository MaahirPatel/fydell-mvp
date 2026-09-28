/**
 * Multi-file editing state (DESK-07).
 *
 * Pure state machine for the workspace editor, shared by the web and desktop
 * clients. Covers: file tree model, tabs, undo/redo, find/replace, save
 * (dirty tracking), protected read-only files, and scenario rules for
 * create/rename/delete.
 *
 * Syntax highlighting is a renderer concern (Monaco); the state machine owns
 * the document model it highlights. Actual keystroke wiring is NEEDS-LIVE.
 */

export type FileAction = "create" | "rename" | "delete" | "write";

export interface EditorBuffer {
  path: string;
  content: string;
  /** True when the buffer has unsaved changes. */
  dirty: boolean;
  /** Protected files are visibly read-only: writes are rejected. */
  readOnly: boolean;
  /** Undo history (past contents, most recent last). */
  past: string[];
  /** Redo history. */
  future: string[];
}

export interface EditorState {
  /** Open tabs in order. */
  tabs: string[];
  /** Active tab path, or null when nothing is open. */
  activePath: string | null;
  buffers: Record<string, EditorBuffer>;
}

export interface EditorRules {
  /** Scenario rule: may this action be performed on this path? */
  canModifyFile: (path: string, action: FileAction) => boolean;
  /** Paths that are protected (read-only) in this scenario. */
  protectedPaths: readonly string[];
}

export const MAX_UNDO_DEPTH = 100;

export function emptyEditorState(): EditorState {
  return { tabs: [], activePath: null, buffers: {} };
}

function isProtected(path: string, rules: EditorRules): boolean {
  return rules.protectedPaths.includes(path);
}

function cloneState(s: EditorState): EditorState {
  return {
    tabs: [...s.tabs],
    activePath: s.activePath,
    buffers: Object.fromEntries(
      Object.entries(s.buffers).map(([k, b]) => [
        k,
        { ...b, past: [...b.past], future: [...b.future] },
      ])
    ),
  };
}

export type EditorResult =
  | { ok: true; state: EditorState }
  | { ok: false; error: string };

/** Open a file (creates the tab/buffer if needed). Fails closed on rules. */
export function openFile(
  state: EditorState,
  path: string,
  content: string,
  rules: EditorRules
): EditorResult {
  if (!rules.canModifyFile(path, "write") && !state.buffers[path]) {
    return { ok: false, error: `Scenario rules do not allow opening ${path}` };
  }
  const next = cloneState(state);
  if (!next.buffers[path]) {
    next.buffers[path] = {
      path,
      content,
      dirty: false,
      readOnly: isProtected(path, rules),
      past: [],
      future: [],
    };
  }
  if (!next.tabs.includes(path)) next.tabs.push(path);
  next.activePath = path;
  return { ok: true, state: next };
}

/** Edit the active buffer. Records undo; clears redo; marks dirty. */
export function editBuffer(
  state: EditorState,
  path: string,
  content: string,
  rules: EditorRules
): EditorResult {
  const buf = state.buffers[path];
  if (!buf) return { ok: false, error: `No open buffer for ${path}` };
  if (buf.readOnly || isProtected(path, rules)) {
    return { ok: false, error: `${path} is read-only in this scenario` };
  }
  if (!rules.canModifyFile(path, "write")) {
    return { ok: false, error: `Scenario rules do not allow writing ${path}` };
  }
  const next = cloneState(state);
  const nb = next.buffers[path];
  nb.past.push(nb.content);
  if (nb.past.length > MAX_UNDO_DEPTH) nb.past.shift();
  nb.future = [];
  nb.content = content;
  nb.dirty = true;
  return { ok: true, state: next };
}

export function undo(state: EditorState, path: string): EditorResult {
  const buf = state.buffers[path];
  if (!buf) return { ok: false, error: `No open buffer for ${path}` };
  if (buf.past.length === 0) return { ok: false, error: "Nothing to undo" };
  const next = cloneState(state);
  const nb = next.buffers[path];
  nb.future.push(nb.content);
  nb.content = nb.past.pop() as string;
  nb.dirty = true;
  return { ok: true, state: next };
}

export function redo(state: EditorState, path: string): EditorResult {
  const buf = state.buffers[path];
  if (!buf) return { ok: false, error: `No open buffer for ${path}` };
  if (buf.future.length === 0) return { ok: false, error: "Nothing to redo" };
  const next = cloneState(state);
  const nb = next.buffers[path];
  nb.past.push(nb.content);
  nb.content = nb.future.pop() as string;
  nb.dirty = true;
  return { ok: true, state: next };
}

/** Save clears the dirty flag. Persistence itself is the sync layer's job. */
export function saveBuffer(state: EditorState, path: string): EditorResult {
  const buf = state.buffers[path];
  if (!buf) return { ok: false, error: `No open buffer for ${path}` };
  const next = cloneState(state);
  next.buffers[path].dirty = false;
  return { ok: true, state: next };
}

export function closeTab(state: EditorState, path: string): EditorState {
  const next = cloneState(state);
  next.tabs = next.tabs.filter((t) => t !== path);
  if (next.activePath === path) {
    next.activePath = next.tabs.length > 0 ? next.tabs[next.tabs.length - 1] : null;
  }
  return next;
}

export function createFile(
  state: EditorState,
  path: string,
  rules: EditorRules
): EditorResult {
  if (state.buffers[path]) return { ok: false, error: `${path} is already open` };
  if (!rules.canModifyFile(path, "create")) {
    return { ok: false, error: `Scenario rules do not allow creating ${path}` };
  }
  const next = cloneState(state);
  next.buffers[path] = { path, content: "", dirty: true, readOnly: false, past: [], future: [] };
  next.tabs.push(path);
  next.activePath = path;
  return { ok: true, state: next };
}

export function renameFile(
  state: EditorState,
  from: string,
  to: string,
  rules: EditorRules
): EditorResult {
  const buf = state.buffers[from];
  if (!buf) return { ok: false, error: `No open buffer for ${from}` };
  if (buf.readOnly || isProtected(from, rules)) {
    return { ok: false, error: `${from} is read-only and cannot be renamed` };
  }
  if (!rules.canModifyFile(from, "rename") || !rules.canModifyFile(to, "create")) {
    return { ok: false, error: "Scenario rules do not allow this rename" };
  }
  const next = cloneState(state);
  delete next.buffers[from];
  next.buffers[to] = { ...buf, path: to };
  next.tabs = next.tabs.map((t) => (t === from ? to : t));
  if (next.activePath === from) next.activePath = to;
  return { ok: true, state: next };
}

export function deleteFile(
  state: EditorState,
  path: string,
  rules: EditorRules
): EditorResult {
  const buf = state.buffers[path];
  if (!buf) return { ok: false, error: `No open buffer for ${path}` };
  if (buf.readOnly || isProtected(path, rules)) {
    return { ok: false, error: `${path} is read-only and cannot be deleted` };
  }
  if (!rules.canModifyFile(path, "delete")) {
    return { ok: false, error: `Scenario rules do not allow deleting ${path}` };
  }
  const next = closeTab(state, path);
  delete next.buffers[path];
  return { ok: true, state: next };
}

export interface FindMatch {
  line: number;
  column: number;
}

/** Find all occurrences of a query. Case-sensitive plain-text search. */
export function findInBuffer(content: string, query: string): FindMatch[] {
  if (!query) return [];
  const matches: FindMatch[] = [];
  const lines = content.split("\n");
  lines.forEach((line, i) => {
    let from = 0;
    for (;;) {
      const col = line.indexOf(query, from);
      if (col === -1) break;
      matches.push({ line: i + 1, column: col + 1 });
      from = col + query.length;
    }
  });
  return matches;
}

/** Replace all occurrences; returns the new content and replacement count. */
export function replaceAll(content: string, query: string, replacement: string): {
  content: string;
  count: number;
} {
  if (!query) return { content, count: 0 };
  const count = content.split(query).length - 1;
  return { content: content.split(query).join(replacement), count };
}

/** Permissive default rules for tests and scenarios without restrictions. */
export function openRules(protectedPaths: readonly string[] = []): EditorRules {
  return { canModifyFile: () => true, protectedPaths };
}
