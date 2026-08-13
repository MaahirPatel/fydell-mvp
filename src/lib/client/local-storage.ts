"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * False on the server and during hydration, true afterwards. Lets a component
 * gate client-only content without copying a flag into state from an effect.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

/**
 * Reads a localStorage key as an external store rather than copying it into
 * state from an effect. The value is a raw string, so the snapshot stays
 * referentially stable between renders; parse it downstream with `useMemo`.
 *
 * Returns null while rendering on the server, which keeps the server output
 * and the hydration pass identical.
 */
export function useStoredString(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key);
      } catch {
        // Private mode and blocked storage both surface here.
        return null;
      }
    },
    () => null
  );
}
