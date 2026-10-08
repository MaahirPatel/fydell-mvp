"use client";

import { useEffect, useId } from "react";

const dirtySources = new Set<string>();

function warnBeforeUnload(e: BeforeUnloadEvent) {
  e.preventDefault();
}

/**
 * Registers a page's unsaved edits. While any registered source is dirty the
 * browser warns before unloading, and the workspace switcher asks before it
 * navigates away.
 */
export function useUnsavedChanges(dirty: boolean): void {
  const id = useId();
  useEffect(() => {
    if (!dirty) return;
    if (dirtySources.size === 0) window.addEventListener("beforeunload", warnBeforeUnload);
    dirtySources.add(id);
    return () => {
      dirtySources.delete(id);
      if (dirtySources.size === 0) window.removeEventListener("beforeunload", warnBeforeUnload);
    };
  }, [dirty, id]);
}

export function hasUnsavedChanges(): boolean {
  return dirtySources.size > 0;
}

/** True when it is fine to leave: nothing is unsaved, or the person agreed to discard it. */
export function confirmLeave(): boolean {
  if (!hasUnsavedChanges()) return true;
  return window.confirm("You have unsaved changes on this page. Leave without saving?");
}
