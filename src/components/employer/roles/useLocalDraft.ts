"use client";

import { useEffect, useSyncExternalStore } from "react";

type Stored<T> = { savedAt: string; base: string | null; value: T };

const subscribeNothing = () => () => {};

/** False during server render and hydration, true afterwards. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}

export function clearLocalDraft(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Storage disabled: nothing was kept.
  }
}

/**
 * A draft kept in this browser for `key`, if it was made against the same
 * server version (`base`). A draft made against another version is dropped,
 * never applied, so it cannot overwrite someone else's saved edits.
 */
export function readLocalDraft<T>(key: string, base: string | null): Stored<T> | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Stored<T>>;
    if (typeof parsed.savedAt !== "string" || parsed.value === undefined || (parsed.base ?? null) !== base) {
      clearLocalDraft(key);
      return null;
    }
    return { savedAt: parsed.savedAt, base, value: parsed.value };
  } catch {
    return null;
  }
}

/** Mirrors unsaved input to this browser; input equal to `pristine` removes the copy. */
export function useKeepLocalDraft<T>(key: string, base: string | null, value: T, pristine: T, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const json = JSON.stringify(value);
    const t = window.setTimeout(() => {
      if (json === JSON.stringify(pristine)) return clearLocalDraft(key);
      try {
        window.localStorage.setItem(key, JSON.stringify({ savedAt: new Date().toISOString(), base, value } satisfies Stored<T>));
      } catch {
        // Storage full or disabled: the form still works, it just is not kept.
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [key, base, value, pristine, enabled]);
}
