"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function CopyBriefButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" variant="secondary" size="sm" onClick={() => void copy()}>
        Copy brief as text
      </Button>
      <span role="status" className="text-app-meta text-[var(--text-secondary)]">
        {state === "copied" ? "Copied. Paste it into your ATS or panel notes." : state === "failed" ? "Your browser blocked the clipboard. Select the brief and copy it instead." : ""}
      </span>
    </div>
  );
}
