"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { engFetch } from "@/components/eng/api";
import type { AuthoredCandidateView, AuthoredFile } from "@/lib/eng/authored/types";
import type { WorkspaceFile } from "./lib";

export type SaveState = "saved" | "saving" | "unsaved" | "offline" | "error" | "conflict";

export interface ServerCopy {
  files: AuthoredFile[];
  revision: number;
}

function isFileList(v: unknown): v is AuthoredFile[] {
  return Array.isArray(v) && v.every((f) => f && typeof f === "object" && typeof (f as AuthoredFile).path === "string" && typeof (f as AuthoredFile).content === "string");
}

function readServerCopy(body: Record<string, unknown> | null): ServerCopy | null {
  const current = body?.current;
  if (!current || typeof current !== "object") return null;
  const { files, revision } = current as { files?: unknown; revision?: unknown };
  if (!isFileList(files) || typeof revision !== "number") return null;
  return { files, revision };
}

const strip = (files: WorkspaceFile[]): AuthoredFile[] => files.map((f) => ({ path: f.path, content: f.content }));

export type SaveEvent = { kind: "saved"; revision: number } | { kind: "conflict" } | { kind: "error"; message: string };

export type SaveResult = { ok: true; revision: number; files: AuthoredFile[] } | { ok: false; reason: "offline" | "conflict" | "error"; message: string | null };

/**
 * Editor buffers for the candidate workspace and their autosave. Buffers stay
 * in memory until the server confirms a save; a conflicting save never
 * overwrites the server copy, it is offered back instead.
 */
export function useWorkspaceFiles({
  base,
  initial,
  readOnly,
  onSaveEvent,
}: {
  base: string;
  initial: { files: WorkspaceFile[]; revision: number; filesSha256: string };
  readOnly: boolean;
  onSaveEvent?: (event: SaveEvent) => void;
}) {
  const [files, setFiles] = useState<WorkspaceFile[]>(initial.files);
  const [saved, setSaved] = useState<WorkspaceFile[]>(initial.files);
  const [revision, setRevision] = useState(initial.revision);
  const [savedSha, setSavedSha] = useState<string | null>(initial.filesSha256);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ServerCopy | null>(null);

  const filesRef = useRef(files);
  const savedRef = useRef(saved);
  const revisionRef = useRef(revision);
  const dirtyRef = useRef(false);
  const inFlightRef = useRef<Promise<SaveResult> | null>(null);
  const eventRef = useRef(onSaveEvent);
  useEffect(() => {
    eventRef.current = onSaveEvent;
  }, [onSaveEvent]);

  const markDirty = useCallback((next: WorkspaceFile[]) => {
    filesRef.current = next;
    dirtyRef.current = true;
    setFiles(next);
    setSaveState((s) => (s === "conflict" || s === "saving" || s === "offline" ? s : "unsaved"));
  }, []);

  const performSave = useCallback(async (): Promise<SaveResult> => {
    dirtyRef.current = false;
    const sending = filesRef.current;
    setSaveState("saving");
    const res = await engFetch<{ revision: number; filesSha256?: unknown }>(`${base}/files`, {
      method: "PUT",
      body: { files: strip(sending), baseRevision: revisionRef.current },
    });
    if (res.ok === false) {
      dirtyRef.current = true;
      if (res.status === 0) {
        setSaveState("offline");
        setSaveError(null);
        return { ok: false, reason: "offline", message: null };
      }
      if (res.status === 409) {
        setConflict(readServerCopy(res.body));
        setSaveState("conflict");
        setSaveError(null);
        eventRef.current?.({ kind: "conflict" });
        return { ok: false, reason: "conflict", message: res.error };
      }
      const message = res.problems.length ? `${res.error} ${res.problems.join(" ")}` : res.error;
      setSaveState("error");
      setSaveError(message);
      eventRef.current?.({ kind: "error", message });
      return { ok: false, reason: "error", message };
    }
    revisionRef.current = res.data.revision;
    setRevision(res.data.revision);
    setSavedSha(typeof res.data.filesSha256 === "string" ? res.data.filesSha256 : null);
    savedRef.current = sending;
    setSaved(sending);
    setSaveError(null);
    setSaveState(dirtyRef.current ? "unsaved" : "saved");
    eventRef.current?.({ kind: "saved", revision: res.data.revision });
    return { ok: true, revision: res.data.revision, files: strip(sending) };
  }, [base]);

  /** Saves now if anything is unsaved, waiting for a save already in flight. Resolves ok once the server has the buffers. */
  const flush = useCallback(async (): Promise<SaveResult> => {
    while (inFlightRef.current) await inFlightRef.current;
    if (!dirtyRef.current) return { ok: true, revision: revisionRef.current, files: strip(savedRef.current) };
    const p = performSave();
    inFlightRef.current = p;
    try {
      return await p;
    } finally {
      inFlightRef.current = null;
    }
  }, [performSave]);

  useEffect(() => {
    if (readOnly || saveState !== "unsaved") return;
    const id = window.setTimeout(() => void flush(), 1500);
    return () => window.clearTimeout(id);
  }, [files, saveState, flush, readOnly]);

  useEffect(() => {
    if (saveState !== "offline") return;
    const retry = () => void flush();
    const id = window.setInterval(retry, 5000);
    window.addEventListener("online", retry);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("online", retry);
    };
  }, [saveState, flush]);

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current && !inFlightRef.current) return;
      e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const updateFile = useCallback(
    (path: string, content: string) => {
      if (readOnly) return;
      const current = filesRef.current;
      const target = current.find((f) => f.path === path);
      if (!target || target.content === content || target.editable === false) return;
      markDirty(current.map((f) => (f.path === path ? { ...f, content } : f)));
    },
    [markDirty, readOnly],
  );

  /** Writes several files at once (assistant patch, folder sync). New paths are added. */
  const writeFiles = useCallback(
    (changes: AuthoredFile[], remove: string[] = []) => {
      const map = new Map(filesRef.current.map((f) => [f.path, f]));
      for (const c of changes) map.set(c.path, { ...(map.get(c.path) ?? {}), path: c.path, content: c.content });
      for (const r of remove) map.delete(r);
      markDirty([...map.values()]);
    },
    [markDirty],
  );

  /** Restores a whole snapshot of buffers, for undoing a sync the server refused. */
  const replaceAll = useCallback((next: WorkspaceFile[]) => markDirty(next), [markDirty]);

  const addFile = useCallback(
    (path: string) => {
      if (readOnly || filesRef.current.some((f) => f.path === path)) return;
      markDirty([...filesRef.current, { path, content: "" }]);
    },
    [markDirty, readOnly],
  );

  const deleteFile = useCallback(
    (path: string) => {
      if (readOnly) return;
      markDirty(filesRef.current.filter((f) => f.path !== path));
    },
    [markDirty, readOnly],
  );

  const retry = useCallback(() => {
    dirtyRef.current = true;
    void flush();
  }, [flush]);

  /** Drops local edits and continues from the server's copy. */
  const loadServerCopy = useCallback(async () => {
    if (!conflict) return;
    const next: WorkspaceFile[] = conflict.files.map((f) => ({ ...f }));
    filesRef.current = next;
    savedRef.current = next;
    revisionRef.current = conflict.revision;
    dirtyRef.current = false;
    setFiles(next);
    setSaved(next);
    setRevision(conflict.revision);
    setConflict(null);
    setSaveState("saved");
    setSavedSha(null);
    const res = await engFetch<{ view: AuthoredCandidateView }>(base);
    if (res.ok && res.data.view.workspace?.revision === conflict.revision) setSavedSha(res.data.view.workspace.filesSha256);
  }, [base, conflict]);

  /** Keeps the local buffers and saves them over the newer server copy. */
  const keepMine = useCallback(() => {
    if (!conflict) return;
    revisionRef.current = conflict.revision;
    setRevision(conflict.revision);
    setConflict(null);
    dirtyRef.current = true;
    setSaveState("unsaved");
    void flush();
  }, [conflict, flush]);

  const dirtyPaths = useMemo(() => {
    const before = new Map(saved.map((f) => [f.path, f.content]));
    const set = new Set<string>();
    for (const f of files) if (before.get(f.path) !== f.content) set.add(f.path);
    return set;
  }, [files, saved]);

  const removedSinceSave = useMemo(() => saved.filter((f) => !files.some((x) => x.path === f.path)).length, [files, saved]);
  const hasUnsaved = dirtyPaths.size > 0 || removedSinceSave > 0 || saveState === "saving";

  return {
    files,
    saved,
    revision,
    savedSha,
    saveState,
    saveError,
    conflict,
    dirtyPaths,
    hasUnsaved,
    updateFile,
    writeFiles,
    replaceAll,
    addFile,
    deleteFile,
    flush,
    retry,
    loadServerCopy,
    keepMine,
  };
}

export type WorkspaceFilesApi = ReturnType<typeof useWorkspaceFiles>;
