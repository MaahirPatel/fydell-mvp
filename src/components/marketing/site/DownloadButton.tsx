"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { AppleIcon, WindowsIcon } from "./OsIcons";
import { BUILDS, type DesktopOs } from "./releases";

const noSubscription = () => () => {};

export function detectDesktopOs(): DesktopOs | null {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const ua = `${nav.userAgentData?.platform ?? ""} ${nav.userAgent}`.toLowerCase();
  if (/iphone|ipad|android/.test(ua)) return null;
  if (/mac|darwin/.test(ua)) return "macos";
  if (/win/.test(ua)) return "windows";
  return null;
}

export function useDesktopOs(): DesktopOs | null {
  return useSyncExternalStore(noSubscription, detectDesktopOs, () => null);
}

export function OsIcon({ os, size }: { os: DesktopOs; size?: number }) {
  return os === "macos" ? <AppleIcon size={size} /> : <WindowsIcon size={size} />;
}

/**
 * A pill that downloads the installer for the visitor's system. `os` pins a
 * platform; without it the button follows the detected system and falls back
 * to the download page when there is no desktop build for it.
 */
export default function DownloadButton({
  os: pinned,
  variant = "solid",
  size = "lg",
  className = "",
}: {
  os?: DesktopOs;
  variant?: "solid" | "quiet";
  size?: "lg" | "md";
  className?: string;
}) {
  const detected = useDesktopOs();
  const os = pinned ?? detected;
  const cls = `l-btn ${size === "lg" ? "l-btn-lg" : ""} ${variant === "solid" ? "l-btn-solid" : "l-btn-quiet"} ${className}`;
  if (!os) {
    return (
      <Link href="/download" className={cls}>
        Download Fydell
      </Link>
    );
  }
  const build = BUILDS[os];
  return (
    <a href={build.primary.file} className={cls}>
      <OsIcon os={os} />
      {build.primary.label}
    </a>
  );
}
