"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

type Os = "windows" | "unix";

/** A copyable terminal command with Windows and macOS/Linux variants. */
export function CommandBlock({ commands, label }: { commands: { windows: string; unix: string }; label: string }) {
  const [os, setOs] = useState<Os>("windows");
  const [copied, setCopied] = useState<"idle" | "ok" | "failed">("idle");
  const command = commands[os];
  return (
    <div className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-default)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface-panel)] px-2 py-1">
        <div role="tablist" aria-label={`${label}: operating system`} className="flex gap-1">
          {(["windows", "unix"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={os === key}
              onClick={() => {
                setOs(key);
                setCopied("idle");
              }}
              className={cn(
                "h-7 rounded-[var(--radius-control)] px-2.5 text-app-meta",
                os === key ? "bg-[var(--surface-selected)] font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {key === "windows" ? "Windows" : "macOS / Linux"}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(command);
              setCopied("ok");
            } catch {
              setCopied("failed");
            }
          }}
          className="h-7 rounded-[var(--radius-control)] px-2.5 text-app-meta text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          {copied === "ok" ? "Copied" : copied === "failed" ? "Copy blocked; select the command below" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto bg-[var(--surface-raised)] px-3 py-2.5 font-mono text-[13px] text-[var(--text-primary)]">
        <code aria-label={label}>{command}</code>
      </pre>
    </div>
  );
}
