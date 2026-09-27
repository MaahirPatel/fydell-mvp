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

/**
 * Server-backed drafts, saved as the candidate types. Each save is a
 * compare-and-swap on the revision, so a second tab gets a conflict instead of
 * silently overwriting, and a refresh or sign-in recovery reloads the text.
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

  const change = useCallback(
    (key: DraftKey, body: string) => {
      setDrafts((prev) => ({ ...prev, [key]: { ...prev[key], body, status: prev[key].status === "conflict" ? "conflict" : "idle" } }));
      window.clearTimeout(timers.current[key]);
      timers.current[key] = window.setTimeout(() => {
        if (draftsRef.current[key].status !== "conflict") void save(key);
      }, 900);
    },
    [save]
  );

  const resolve = useCallback(
    (key: DraftKey, keep: "mine" | "theirs") => {
      const field = draftsRef.current[key];
      if (!field.conflict) return;
      if (keep === "theirs") {
        const theirs = field.conflict;
        setDrafts((prev) => ({ ...prev, [key]: { body: theirs.body, revision: theirs.revision, saved: theirs.body, status: "idle" } }));
      } else {
        void save(key, field.conflict.revision);
      }
    },
    [save]
  );

  const retryAll = useCallback(() => {
    for (const k of keys) {
      const f = draftsRef.current[k];
      if (f.status === "error" || (f.body !== f.saved && f.status !== "conflict" && f.status !== "saving")) void save(k);
    }
  }, [keys, save]);

  const dirtyKeys = keys.filter((k) => drafts[k].body !== drafts[k].saved);
  return { drafts, change, resolve, retryAll, dirtyKeys };
}
