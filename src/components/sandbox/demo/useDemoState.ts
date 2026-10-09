"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { DemoScenario } from "@/lib/sandbox-demo/catalog-types";
import {
  browserStorage,
  loadState,
  progressOf,
  saveState,
  STORAGE_KEY,
  withProgress,
  withoutProgress,
  type DemoState,
  type KeyValueStorage,
  type ScenarioProgress,
} from "@/lib/sandbox-demo/state";

export type Update = (recipe: (state: DemoState) => DemoState) => void;
export type UpdateProgress = (recipe: (progress: ScenarioProgress) => ScenarioProgress) => void;

const subscribeNothing = () => () => {};

/** True once rendering in the browser, where the demo's state lives. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );
}

/**
 * Local storage for one account's drafts. The employer demo passes the user id
 * so two people sharing a browser never see each other's sample task.
 */
function scopedStorage(scope: string | undefined): KeyValueStorage | null {
  const base = browserStorage();
  if (!base || !scope) return base;
  const k = (key: string) => `${key}:${scope}`;
  return {
    getItem: (key) => base.getItem(k(key)),
    setItem: (key, value) => base.setItem(k(key), value),
    removeItem: (key) => base.removeItem(k(key)),
  };
}

/** Removes one account's local task drafts, for the employer demo's reset. */
export function clearScopedDrafts(scope: string): void {
  scopedStorage(scope)?.removeItem(STORAGE_KEY);
}

/**
 * The demo's state, mirrored to localStorage on every change. Call only after
 * hydration: the first render reads storage directly.
 */
export function useDemoState(scope?: string) {
  const [state, setState] = useState<DemoState>(() => loadState(scopedStorage(scope)));

  useEffect(() => {
    saveState(scopedStorage(scope), state);
  }, [state, scope]);

  const update = useCallback<Update>((recipe) => setState((prev) => recipe(prev)), []);
  return { state, update };
}

/** One scenario's progress, with an updater and a reset that leaves other scenarios alone. */
export function useScenarioProgress(scenario: DemoScenario, scope?: string) {
  const { state, update } = useDemoState(scope);
  const progress = progressOf(state, scenario);
  const updateProgress = useCallback<UpdateProgress>((recipe) => update((st) => withProgress(st, scenario, recipe)), [scenario, update]);
  const reset = useCallback(() => update((st) => withoutProgress(st, scenario.key)), [scenario.key, update]);
  return { progress, started: scenario.key in state.scenarios, updateProgress, reset };
}

/** The current time, refreshed on an interval, for elapsed-time labels and timers. */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
