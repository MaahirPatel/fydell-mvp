"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { loader, type Monaco } from "@monaco-editor/react";

/** Same-origin copy of monaco-editor/min/vs, written by scripts/prepare-monaco.mjs at build time. */
export const MONACO_VS_PATH = "/monaco/vs";
export const MONACO_BOOT_TIMEOUT_MS = 20_000;

export type MonacoBootFailure = {
  kind: "missing_assets" | "timeout" | "script_error" | "offline";
  /** What failed, in words a candidate can pass to support. */
  detail: string;
};

export type MonacoBootState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "failed"; failure: MonacoBootFailure };

type AmdRequire = {
  (deps: string[], onLoad: (loaded: unknown) => void, onError: (error: unknown) => void): void;
  config: (config: { paths: Record<string, string> }) => void;
};

function isAmdRequire(v: unknown): v is AmdRequire {
  return typeof v === "function" && typeof (v as { config?: unknown }).config === "function";
}

function isMonaco(v: unknown): v is Monaco {
  return !!v && typeof v === "object" && typeof (v as { editor?: unknown }).editor === "object";
}

class BootError extends Error {
  constructor(readonly failure: MonacoBootFailure) {
    super(failure.detail);
  }
}

let monacoInstance: Monaco | null = null;
let pending: Promise<Monaco> | null = null;
let attempt = 0;
let state: MonacoBootState = { status: "loading" };
const listeners = new Set<() => void>();

function setState(next: MonacoBootState) {
  state = next;
  for (const l of listeners) l();
}

/** Asks the server for the loader directly so a failure names the HTTP status, not just "did not load". */
async function describeAssetFailure(fallback: MonacoBootFailure): Promise<MonacoBootFailure> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { kind: "offline", detail: "This browser reports that it is offline, so the editor files could not be downloaded." };
  }
  const url = `${MONACO_VS_PATH}/loader.js`;
  const abort = new AbortController();
  const timer = window.setTimeout(() => abort.abort(), 5_000);
  try {
    const res = await fetch(url, { cache: "no-store", signal: abort.signal });
    if (!res.ok) return { kind: "missing_assets", detail: `The editor files are not available: ${url} returned HTTP ${res.status}.` };
    return fallback;
  } catch {
    return {
      kind: fallback.kind,
      detail: `${fallback.detail} The editor files at ${url} could not be reached; a slow network, filter or extension may be blocking them.`,
    };
  } finally {
    window.clearTimeout(timer);
  }
}

function clearPreviousAttempt() {
  for (const el of document.querySelectorAll("script[data-monaco-boot]")) el.remove();
  // A failed AMD loader caches the module error, so a retry starts from a fresh loader.
  Reflect.deleteProperty(window, "require");
  Reflect.deleteProperty(window, "define");
}

function loadOnce(n: number): Promise<Monaco> {
  return new Promise<Monaco>((resolve, reject) => {
    const existing: unknown = Reflect.get(window, "monaco");
    if (isMonaco(existing)) return resolve(existing);
    if (n > 1) clearPreviousAttempt();
    const script = document.createElement("script");
    script.dataset.monacoBoot = String(n);
    script.src = n > 1 ? `${MONACO_VS_PATH}/loader.js?attempt=${n}` : `${MONACO_VS_PATH}/loader.js`;
    script.onerror = () =>
      reject(new BootError({ kind: "missing_assets", detail: `The editor loader at ${MONACO_VS_PATH}/loader.js did not load.` }));
    script.onload = () => {
      const amd: unknown = Reflect.get(window, "require");
      if (!isAmdRequire(amd)) {
        reject(new BootError({ kind: "script_error", detail: "The editor loader ran but did not register itself. Another script on the page may conflict with it." }));
        return;
      }
      amd.config({ paths: { vs: MONACO_VS_PATH } });
      amd(
        ["vs/editor/editor.main"],
        (loaded) => {
          const candidate = isMonaco((loaded as { m?: unknown } | null)?.m) ? (loaded as { m: unknown }).m : loaded;
          if (isMonaco(candidate)) resolve(candidate);
          else reject(new BootError({ kind: "script_error", detail: "The editor bundle loaded without an editor API." }));
        },
        (error) => {
          const message = error instanceof Error ? error.message : "unknown module error";
          reject(new BootError({ kind: "script_error", detail: `Part of the editor failed to load (${message.slice(0, 160)}).` }));
        },
      );
    };
    document.body.appendChild(script);
  });
}

function withTimeout(p: Promise<Monaco>, ms: number): Promise<Monaco> {
  return new Promise<Monaco>((resolve, reject) => {
    const timer = window.setTimeout(
      () =>
        reject(
          new BootError({
            kind: "timeout",
            detail: `The editor did not finish loading within ${Math.round(ms / 1000)} seconds.`,
          }),
        ),
      ms,
    );
    p.then(
      (m) => {
        window.clearTimeout(timer);
        resolve(m);
      },
      (e: unknown) => {
        window.clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Loads Monaco once per page with a deadline. @monaco-editor/loader keeps a
 * single promise that never settles again after a failure, so the editor
 * component is only mounted once this resolves and hands it the instance.
 */
export function bootMonaco(timeoutMs = MONACO_BOOT_TIMEOUT_MS): Promise<Monaco> {
  if (monacoInstance) return Promise.resolve(monacoInstance);
  if (pending) return pending;
  attempt += 1;
  setState({ status: "loading" });
  pending = withTimeout(loadOnce(attempt), timeoutMs).then(
    (monaco) => {
      monacoInstance = monaco;
      loader.config({ monaco });
      pending = null;
      setState({ status: "ready" });
      return monaco;
    },
    async (error: unknown) => {
      pending = null;
      const base: MonacoBootFailure =
        error instanceof BootError ? error.failure : { kind: "script_error", detail: "The editor failed to start." };
      const failure = base.kind === "missing_assets" || base.kind === "timeout" ? await describeAssetFailure(base) : base;
      setState({ status: "failed", failure });
      throw new BootError(failure);
    },
  );
  return pending;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverState: MonacoBootState = { status: "loading" };

/** Boot state shared by every editor on the page, plus a retry that leaves the caller's buffers alone. */
export function useMonacoBoot(): { state: MonacoBootState; retry: () => void } {
  const current = useSyncExternalStore(
    subscribe,
    () => state,
    () => serverState,
  );
  useEffect(() => {
    if (!monacoInstance && state.status === "loading") bootMonaco().catch(() => undefined);
  }, []);
  const retry = useCallback(() => {
    bootMonaco().catch(() => undefined);
  }, []);
  return { state: monacoInstance ? { status: "ready" } : current, retry };
}

let plainPreferred = false;
const plainListeners = new Set<() => void>();

/** Whether the person chose the plain text editor after a failed load; shared by every editor tab. */
export function usePlainEditorChoice(): [boolean, (next: boolean) => void] {
  const value = useSyncExternalStore(
    (l) => {
      plainListeners.add(l);
      return () => plainListeners.delete(l);
    },
    () => plainPreferred,
    () => false,
  );
  const set = useCallback((next: boolean) => {
    plainPreferred = next;
    for (const l of plainListeners) l();
  }, []);
  return [value, set];
}
