"use client";

import { useEffect } from "react";

const LAUNCH_PAGES = new Set(["/", "/download"]);

function inAppWindow(): boolean {
  if (window.matchMedia("(display-mode: standalone)").matches || window.matchMedia("(display-mode: window-controls-overlay)").matches) return true;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

/**
 * Copies of the app installed before it had its own home still launch on the
 * homepage or the install page. When the installed window opens on one of
 * those, it goes to the app home instead. Only the first page of a launch is
 * redirected, so the website stays reachable from inside the app.
 */
export default function AppWindowHome() {
  useEffect(() => {
    if (LAUNCH_PAGES.has(window.location.pathname) && inAppWindow()) window.location.replace("/app/desk");
  }, []);
  return null;
}
