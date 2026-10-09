"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { OsIcon, useDesktopOs } from "./DownloadButton";
import { BUILDS, type DesktopOs } from "./releases";

const ORDER: readonly DesktopOs[] = ["windows", "macos"];

/** A black pill that downloads for the detected system, with a round toggle listing every build. */
export default function NavDownload() {
  const detected = useDesktopOs();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const primaryHref = detected ? BUILDS[detected].primary.file : "/download";

  return (
    <div ref={wrap} className="relative ml-1.5 flex items-center">
      <a
        href={primaryHref}
        className="inline-flex h-9 items-center rounded-l-full bg-[var(--control-solid)] pl-4 pr-3 text-[14px] font-medium tracking-[-0.006em] text-[var(--control-solid-ink)] transition-colors hover:bg-[var(--control-solid-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        Download
      </a>
      <button
        type="button"
        aria-label="Choose a platform"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className="ml-px inline-flex h-9 w-9 items-center justify-center rounded-r-full bg-[var(--control-solid)] text-[var(--control-solid-ink)] transition-colors hover:bg-[var(--control-solid-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
          <ChevronDown aria-hidden className={`h-3.5 w-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`} strokeWidth={2.2} />
        </span>
      </button>
      {open ? (
        <div role="menu" className="absolute right-0 top-full mt-2 w-[240px] overflow-hidden rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-1.5 shadow-[0_1px_2px_rgba(17,18,20,0.05),0_18px_40px_-18px_rgba(17,18,20,0.25)]">
          {ORDER.map((os) => (
            <a
              key={os}
              role="menuitem"
              href={BUILDS[os].primary.file}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-[14px] text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
            >
              <OsIcon os={os} size={14} />
              <span className="flex-1">{BUILDS[os].name}</span>
              {detected === os ? <span className="text-app-meta text-[var(--text-tertiary)]">Your system</span> : null}
            </a>
          ))}
          <Link
            role="menuitem"
            href="/download"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-[8px] border-t border-[var(--border-subtle)] px-3 py-2.5 text-[13.5px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
          >
            All downloads
          </Link>
        </div>
      ) : null}
    </div>
  );
}
