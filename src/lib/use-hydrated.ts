"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** False during server render and before hydration, true once client handlers are attached. */
export function useHydrated(): boolean {
  return useSyncExternalStore(subscribe, () => true, () => false);
}
