"use client";

import { useState, useSyncExternalStore } from "react";
import { Download } from "lucide-react";
import { BUILDS, LATEST, formatReleaseDate, type DesktopOs } from "./releases";
import s from "./download.module.css";

const ORDER: readonly DesktopOs[] = ["macos", "windows", "linux"];

const noSubscription = () => () => {};

function detectOs(): DesktopOs | null {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const ua = `${nav.userAgentData?.platform ?? ""} ${nav.userAgent}`.toLowerCase();
  if (/iphone|ipad|android/.test(ua)) return null;
  if (/mac|darwin/.test(ua)) return "macos";
  if (/win/.test(ua)) return "windows";
  if (/linux|x11/.test(ua)) return "linux";
  return null;
}

/** Suggests the visitor's platform and lets them pick another. Links only builds attached to the latest release. */
export default function DownloadPicker() {
  const detected = useSyncExternalStore(noSubscription, detectOs, () => null);
  const [chosen, setChosen] = useState<DesktopOs | null>(null);
  const os = chosen ?? detected ?? "macos";
  const build = BUILDS[os];

  return (
    <div className={s.picker}>
      <div className={s.tabs} role="group" aria-label="Operating system">
        {ORDER.map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={os === key}
            onClick={() => setChosen(key)}
            className={os === key ? s.tabOn : s.tab}
          >
            {BUILDS[key].name}
            {detected === key ? <span className={s.tabNote}>Your system</span> : null}
          </button>
        ))}
      </div>

      <div className={s.panel} aria-live="polite">
        <div className={s.panelMain}>
          <p className={s.panelTitle}>
            Fydell {LATEST.version} for {build.name}
          </p>
          <p className={s.panelMeta}>
            {build.arch} · {build.primary.note} · released {formatReleaseDate(LATEST.date)}
          </p>
          <a href={build.primary.file} className="l-btn l-btn-lg l-btn-solid mt-5">
            <Download aria-hidden className="h-4 w-4" strokeWidth={1.8} />
            {build.primary.label}
          </a>
          <p className={s.unavailable}>{build.unavailable}</p>
        </div>
        <div className={s.panelSide}>
          <p className={s.sideHeading}>Other formats</p>
          <ul className={s.sideList}>
            {build.others.map((o) => (
              <li key={o.file}>
                <a href={o.file} className={s.sideLink}>
                  {o.label}
                </a>
                <span className={s.sideNote}>{o.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
