"use client";

import { createContext, useContext } from "react";

/**
 * Chrome supplied by whatever the workbench is embedded in.
 *
 * Standalone, the workbench is the whole page and carries the Fydell mark.
 * Inside the workspace the rail already says where you are, so repeating the
 * mark and stacking a second title bar above the command bar is noise. The
 * embedder describes what should replace the mark instead.
 *
 * Values are plain data so a server component can pass them straight in.
 */
export interface WorkbenchChrome {
  /** Replaces the mark with a way back out. */
  back?: { href: string; label: string };
  /** Secondary destinations shown before the submit action. */
  links?: { href: string; label: string }[];
  /** One short line saying what this attempt is, when that is not obvious. */
  note?: string;
}

const WorkbenchChromeContext = createContext<WorkbenchChrome | null>(null);

export function WorkbenchChromeProvider({
  chrome,
  children,
}: {
  chrome: WorkbenchChrome | null;
  children: React.ReactNode;
}) {
  return (
    <WorkbenchChromeContext.Provider value={chrome}>
      {children}
    </WorkbenchChromeContext.Provider>
  );
}

/** Null when the workbench owns the page. */
export function useWorkbenchChrome(): WorkbenchChrome | null {
  return useContext(WorkbenchChromeContext);
}
