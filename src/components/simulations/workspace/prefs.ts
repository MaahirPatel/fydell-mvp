"use client";

import { useMemo, useSyncExternalStore } from "react";

export type SimTheme = "dark" | "light";

export interface SimLayoutPrefs {
  fontSize: number;
  leftWidth: number;
  rightWidth: number;
  bottomHeight: number;
  leftOpen: boolean;
  rightOpen: boolean;
  bottomOpen: boolean;
}

export interface SimPrefs extends SimLayoutPrefs {
  theme: SimTheme;
}

const THEME_KEY = "fydell.sim.theme";
const LAYOUT_KEY = "fydell.sim.layout";

export const FONT_MIN = 12;
export const FONT_MAX = 20;

export const DEFAULT_PREFS: SimPrefs = {
  theme: "dark",
  fontSize: 14,
  leftWidth: 220,
  rightWidth: 340,
  bottomHeight: 240,
  leftOpen: true,
  rightOpen: true,
  bottomOpen: true,
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function num(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === "number" && Number.isFinite(v) ? clamp(Math.round(v), min, max) : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function readPrefs(): SimPrefs {
  let theme: SimTheme = DEFAULT_PREFS.theme;
  let layout: Record<string, unknown> = {};
  try {
    const t = window.localStorage.getItem(THEME_KEY);
    if (t === "light" || t === "dark") theme = t;
    const raw = window.localStorage.getItem(LAYOUT_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) layout = parsed as Record<string, unknown>;
  } catch {
    /* Storage can be unavailable (private mode); defaults apply. */
  }
  return {
    theme,
    fontSize: num(layout.fontSize, DEFAULT_PREFS.fontSize, FONT_MIN, FONT_MAX),
    leftWidth: num(layout.leftWidth, DEFAULT_PREFS.leftWidth, 180, 480),
    rightWidth: num(layout.rightWidth, DEFAULT_PREFS.rightWidth, 280, 640),
    bottomHeight: num(layout.bottomHeight, DEFAULT_PREFS.bottomHeight, 120, 640),
    leftOpen: bool(layout.leftOpen, DEFAULT_PREFS.leftOpen),
    rightOpen: bool(layout.rightOpen, DEFAULT_PREFS.rightOpen),
    bottomOpen: bool(layout.bottomOpen, DEFAULT_PREFS.bottomOpen),
  };
}

let snapshot: SimPrefs | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_KEY || e.key === LAYOUT_KEY) {
      snapshot = readPrefs();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): SimPrefs {
  if (!snapshot) snapshot = readPrefs();
  return snapshot;
}

function getServerSnapshot(): SimPrefs {
  return DEFAULT_PREFS;
}

export function setSimPrefs(patch: Partial<SimPrefs>) {
  const next = { ...getSnapshot(), ...patch };
  next.fontSize = clamp(next.fontSize, FONT_MIN, FONT_MAX);
  snapshot = next;
  try {
    window.localStorage.setItem(THEME_KEY, next.theme);
    const layout: SimLayoutPrefs = {
      fontSize: next.fontSize,
      leftWidth: next.leftWidth,
      rightWidth: next.rightWidth,
      bottomHeight: next.bottomHeight,
      leftOpen: next.leftOpen,
      rightOpen: next.rightOpen,
      bottomOpen: next.bottomOpen,
    };
    window.localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
  } catch {
    /* Preferences still apply for this page view. */
  }
  emit();
}

/** Theme, editor text size and panel layout, persisted in localStorage. */
export function useSimPrefs(): SimPrefs {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

const noopSubscribe = () => () => {};

/** True once rendering on the client, so browser-only state can be read safely. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function subscribeMedia(query: string) {
  return (listener: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener("change", listener);
    return () => mql.removeEventListener("change", listener);
  };
}

/** Media query match. Server rendering assumes a desktop viewport. */
export function useMediaQuery(query: string): boolean {
  const subscribeQuery = useMemo(() => subscribeMedia(query), [query]);
  return useSyncExternalStore(
    subscribeQuery,
    () => window.matchMedia(query).matches,
    () => true,
  );
}
