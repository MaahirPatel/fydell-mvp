/**
 * In-app work communication (DESK-14).
 *
 * Persistent brief, teammates, task updates and handoff live in the app;
 * unread changes are discoverable without covering code. Keyboard shortcuts
 * must never prevent normal editor commands: shortcuts reserved by the
 * editor (copy/paste/undo/find/...) cannot be registered by app chrome.
 */

export interface WorkBrief {
  objectives: string[];
  constraints: string[];
  updatedAt: string;
  version: number;
}

export interface TeammateUpdate {
  id: string;
  author: string;
  body: string;
  at: string;
  read: boolean;
}

export interface HandoffNote {
  summary: string;
  openQuestions: string[];
  at: string;
}

export interface WorkComms {
  brief: WorkBrief;
  updates: TeammateUpdate[];
  handoff: HandoffNote | null;
}

export function emptyWorkComms(brief: WorkBrief): WorkComms {
  return { brief, updates: [], handoff: null };
}

/** Number of unread teammate updates (drives the discoverable badge). */
export function unreadCount(comms: WorkComms): number {
  return comms.updates.filter((u) => !u.read).length;
}

/** Append a teammate update; it starts unread. */
export function addUpdate(comms: WorkComms, update: Omit<TeammateUpdate, "read">): WorkComms {
  return { ...comms, updates: [...comms.updates, { ...update, read: false }] };
}

/** Mark a single update read. Unknown ids leave state unchanged. */
export function markUpdateRead(comms: WorkComms, id: string): WorkComms {
  return {
    ...comms,
    updates: comms.updates.map((u) => (u.id === id ? { ...u, read: true } : u)),
  };
}

/** Mark every update read. */
export function markAllUpdatesRead(comms: WorkComms): WorkComms {
  return { ...comms, updates: comms.updates.map((u) => ({ ...u, read: true })) };
}

/** Replace the brief; version increments so the UI can surface "brief updated". */
export function updateBrief(comms: WorkComms, brief: Omit<WorkBrief, "version">): WorkComms {
  return { ...comms, brief: { ...brief, version: comms.brief.version + 1 } };
}

export function setHandoff(comms: WorkComms, handoff: HandoffNote): WorkComms {
  return { ...comms, handoff };
}

/**
 * Shortcuts the editor owns. App chrome (panels, comms, navigation) must
 * never register these — normal editor commands always win.
 */
export const EDITOR_RESERVED_SHORTCUTS: readonly string[] = [
  "mod+c",
  "mod+v",
  "mod+x",
  "mod+z",
  "mod+shift+z",
  "mod+y",
  "mod+f",
  "mod+h",
  "mod+a",
  "mod+s",
  "ctrl+`",
  "escape",
];

/** False when the shortcut belongs to the editor and cannot be overridden. */
export function canRegisterShortcut(shortcut: string): boolean {
  return !EDITOR_RESERVED_SHORTCUTS.includes(shortcut.toLowerCase());
}
