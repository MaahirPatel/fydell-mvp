"use client";

import { useState } from "react";
import { BUILDS, LATEST, formatReleaseDate, type DesktopOs } from "./releases";
import { OsIcon, useDesktopOs } from "./DownloadButton";
import s from "./download.module.css";

const ORDER: readonly DesktopOs[] = ["macos", "windows"];

/** Suggests the visitor's platform and lets them pick the other one. */
export default function DownloadPicker() {
  const detected = useDesktopOs();
  const [chosen, setChosen] = useState<DesktopOs | null>(null);
  const os = chosen ?? detected ?? "windows";
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
            <OsIcon os={key} size={14} />
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
            <OsIcon os={os} />
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
