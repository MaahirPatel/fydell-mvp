"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { engFetch } from "@/components/eng/api";
import type { CollaborationView } from "@/lib/eng/authored/collaboration-types";

export function isCollaborationView(v: unknown): v is CollaborationView {
  if (!v || typeof v !== "object") return false;
  const c = v as Partial<Record<keyof CollaborationView, unknown>>;
  const a = c.assistant as Partial<Record<keyof CollaborationView["assistant"], unknown>> | undefined;
  return (
    Array.isArray(c.teammates) &&
    Array.isArray(c.messages) &&
    Array.isArray(c.events) &&
    typeof c.open === "boolean" &&
    typeof c.eventDisclosure === "string" &&
    !!a &&
    typeof a.enabled === "boolean" &&
    Array.isArray(a.interactions) &&
    typeof a.used === "number" &&
    typeof a.limit === "number"
  );
}

export function readCollaboration(data: unknown): CollaborationView | null {
  if (!data || typeof data !== "object") return null;
  const c = (data as { collaboration?: unknown }).collaboration;
  return isCollaborationView(c) ? c : null;
}

export type CollaborationState =
  | { status: "loading"; view: null }
  | { status: "unavailable"; view: null }
  | { status: "ready"; view: CollaborationView; stale: boolean };

const POLL_MS = 10_000;

/**
 * Teammates, assistant and scenario events for the attempt. Polls while
 * `poll` is true. A 404 means the task has no collaboration features (or the
 * route is not deployed yet) and is shown as unavailable rather than an error.
 */
export function useCollaboration(base: string, poll: boolean) {
  const [state, setState] = useState<CollaborationState>({ status: "loading", view: null });
  const stopped = useRef(false);

  const refresh = useCallback(async () => {
    if (stopped.current) return;
    const res = await engFetch<unknown>(`${base}/collaboration`);
    if (res.ok === false) {
      if (res.status === 404 || res.status === 501) {
        stopped.current = true;
        setState({ status: "unavailable", view: null });
        return;
      }
      const offline = res.status === 0;
      setState((s) => (s.status === "ready" ? { ...s, stale: true } : s.status === "loading" && !offline ? { status: "unavailable", view: null } : s));
      return;
    }
    const view = readCollaboration(res.data);
    if (view) setState({ status: "ready", view, stale: false });
    else setState((s) => (s.status === "ready" ? { ...s, stale: true } : { status: "unavailable", view: null }));
  }, [base]);

  useEffect(() => {
    const first = window.setTimeout(() => void refresh(), 0);
    if (!poll) return () => window.clearTimeout(first);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [refresh, poll]);

  const setView = useCallback((view: CollaborationView) => setState({ status: "ready", view, stale: false }), []);

  const updateView = useCallback((update: (view: CollaborationView) => CollaborationView) => {
    setState((s) => (s.status === "ready" ? { ...s, view: update(s.view) } : s));
  }, []);

  return { state, view: state.view, refresh, setView, updateView };
}

export type CollaborationApi = ReturnType<typeof useCollaboration>;
