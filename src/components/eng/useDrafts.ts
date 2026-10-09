"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { engFetch } from "./api";

export type DraftKey = "what_changed" | "testing" | "risks" | "ai_use" | "message";

export interface DraftState {
  body: string;
  revision: number;
  saved: string;
  status: "idle" | "saving" | "error" | "conflict";
  conflict?: { body: string; revision: number };
}

type Backup = { body: string; baseRevision: number };

function backupKey(attemptId: string, key: DraftKey): string {
  return `fydell:eng-draft:${attemptId}:${key}`;
}

function readBackup(attemptId: string, key: DraftKey): Backup | null {
  try {
    const raw = window.localStorage.getItem(backupKey(attemptId, key));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const { body, baseRevision } = parsed as Record<string, unknown>;
    return typeof body === "string" && typeof baseRevision === "number" ? { body, baseRevision } : null;
  } catch {
    return null;
  }
}

function writeBackup(attemptId: string, key: DraftKey, backup: Backup | null) {
  try {
    if (backup) window.localStorage.setItem(backupKey(attemptId, key), JSON.stringify(backup));
    else window.localStorage.removeItem(backupKey(attemptId, key));
  } catch {
    // Storage full or blocked: the in-memory text and the server copy remain.
  }
}

/**
 * Server-backed drafts, saved as the candidate types. Each save is a
 * compare-and-swap on the revision, so a second tab gets a conflict instead of
 * silently overwriting, and a refresh or sign-in recovery reloads the text.
 *
 * Text the server has not confirmed is also kept on this device until it is
 * saved, so a session that ends mid-answer (signed out, expired, tab closed
 * while offline) loses nothing: the backup is restored on the next load and
 * saved once the candidate is signed in again.
 */
export function useDrafts(attemptId: string, initial: Record<string, { body: string; revision: number }>, keys: DraftKey[]) {
  const [drafts, setDrafts] = useState<Record<DraftKey, DraftState>>(() => {
    const out = {} as Record<DraftKey, DraftState>;
    for (const k of keys) {
      const d = initial[k];
      out[k] = { body: d?.body ?? "", revision: d?.revision ?? 0, saved: d?.body ?? "", status: "idle" };
    }
    return out;
  });
  const draftsRef = useRef(drafts);
  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);
  const timers = useRef<Partial<Record<DraftKey, number>>>({});

  const save = useCallback(
    async (key: DraftKey, overrideRevision?: number) => {
      const current = draftsRef.current[key];
      if (current.body === current.saved && overrideRevision === undefined) return;
      const body = current.body;
      const baseRevision = overrideRevision ?? current.revision;
      setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], status: "saving" } }));
      const res = await engFetch<{ revision: number }>(`/api/eng/attempts/${attemptId}/drafts`, { method: "PUT", body: { field: key, body, baseRevision } });
      if (res.ok === true && draftsRef.current[key].body === body) writeBackup(attemptId, key, null);
      setDrafts((prev) => {
        const field = prev[key];
        if (res.ok === true) return { ...prev, [key]: { ...field, revision: res.data.revision, saved: body, status: field.body === body ? "idle" : field.status, conflict: undefined } };
        if (res.ok === false && res.status === 409 && res.body && typeof res.body.current === "object" && res.body.current) {
          const c = res.body.current as { body: string; revision: number };
          return { ...prev, [key]: { ...field, status: "conflict", conflict: c } };
        }
        return { ...prev, [key]: { ...field, status: "error" } };
      });
    },
    [attemptId]
  );

  // Restore unsaved text from a session that ended before the server had it.
  // Runs after mount: the server render cannot see this device's storage.
  useEffect(() => {
    const restored: Partial<Record<DraftKey, DraftState>> = {};
    for (const k of keys) {
      const backup = readBackup(attemptId, k);
      const field = draftsRef.current[k];
      if (!backup) continue;
      if (backup.body === field.saved) {
        writeBackup(attemptId, k, null);
        continue;
      }
      restored[k] =
        backup.baseRevision === field.revision
          ? { ...field, body: backup.body, status: "idle" }
          : { ...field, body: backup.body, status: "conflict", conflict: { body: field.saved, revision: field.revision } };
    }
    const restoredKeys = Object.keys(restored) as DraftKey[];
    if (restoredKeys.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time merge of device storage after hydration
    setDrafts((prev) => ({ ...prev, ...restored }));
    for (const k of restoredKeys) {
      if (restored[k]?.status === "idle") window.setTimeout(() => void save(k), 0);
    }
    // Only on mount: later changes are handled by `change`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  const change = useCallback(
    (key: DraftKey, body: string) => {
      writeBackup(attemptId, key, { body, baseRevision: draftsRef.current[key].revision });
      setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], body, status: prev[key].status === "conflict" ? "conflict" : "idle" } }));
      window.clearTimeout(timers.current[key]);
      timers.current[key] = window.setTimeout(() => {
        if (draftsRef.current[key].status !== "conflict") void save(key);
      }, 900);
    },
    [attemptId, save]
  );

  const resolve = useCallback(
    (key: DraftKey, keep: "mine" | "theirs") => {
      const field = draftsRef.current[key];
      if (!field.conflict) return;
      if (keep === "theirs") {
        const theirs = field.conflict;
        writeBackup(attemptId, key, null);
        setDrafts((prev) => ({ ...prev, [key]: { body: theirs.body, revision: theirs.revision, saved: theirs.body, status: "idle" } }));
      } else {
        void save(key, field.conflict.revision);
      }
    },
    [attemptId, save]
  );

  const retryAll = useCallback(() => {
    for (const k of keys) {
      const f = draftsRef.current[k];
      if (f.status === "error" || (f.body !== f.saved && f.status !== "conflict" && f.status !== "saving")) void save(k);
    }
  }, [keys, save]);

  // Coming back to the tab (for example after signing in again elsewhere)
  // retries anything that failed while the session was gone.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") retryAll();
    };
    window.addEventListener("focus", retryAll);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", retryAll);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [retryAll]);

  const dirtyKeys = keys.filter((k) => drafts[k].body !== drafts[k].saved);
  return { drafts, change, resolve, retryAll, dirtyKeys };
}
