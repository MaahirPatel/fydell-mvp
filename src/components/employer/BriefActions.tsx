"use client";

import { Download, Printer } from "lucide-react";

/** Print (or save as PDF) and Markdown download for a decision brief. */
export default function BriefActions({ exportHref }: { exportHref: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex h-9 items-center gap-2 rounded-[8px] bg-[var(--control-solid)] px-3.5 text-[14px] font-medium text-[var(--control-solid-ink)] hover:bg-[var(--control-solid-hover)]"
      >
        <Printer className="h-4 w-4" aria-hidden /> Print or save as PDF
      </button>
      <a
        href={exportHref}
        className="inline-flex h-9 items-center gap-2 rounded-[8px] border border-[var(--border-default)] px-3 text-[14px] font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
      >
        <Download className="h-4 w-4" aria-hidden /> Download Markdown
      </a>
    </div>
  );
}
