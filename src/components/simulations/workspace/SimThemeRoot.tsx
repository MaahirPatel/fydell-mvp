"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { useSimPrefs } from "./prefs";
import "./sim-theme.css";

/** Scopes the simulation theme (dark by default, light on request) to its children. */
export function SimThemeRoot({ children, className }: { children: ReactNode; className?: string }) {
  const { theme } = useSimPrefs();
  return (
    <div className={cn("sim-theme", className)} data-sim-theme={theme}>
      {children}
    </div>
  );
}
