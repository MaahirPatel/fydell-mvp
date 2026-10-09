"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { AssistantInteractionView } from "@/lib/eng/authored/collaboration-types";
import { CodeDiff } from "./EditorArea";
import { languageFor, lineDiffCounts, type WorkspaceFile } from "./lib";
import type { SimTheme } from "./prefs";

/**
 * Review of an assistant proposal: the current buffer against the proposed
 * content, file by file. Accepting applies and saves; nothing happens until
 * the candidate decides.
 */
export function PatchReview({
  interaction,
  files,
  theme,
  fontSize,
  busy,
  error,
  onAccept,
  onReject,
  onClose,
}: {
  interaction: AssistantInteractionView;
  files: WorkspaceFile[];
  theme: SimTheme;
  fontSize: number;
  busy: "accept" | "reject" | null;
  error: string | null;
  onAccept: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const patch = interaction.patch ?? [];
  const [selected, setSelected] = useState(patch[0]?.path ?? "");
  const current = new Map(files.map((f) => [f.path, f]));
  const active = patch.find((p) => p.path === selected) ?? patch[0];
  const locked = patch.filter((p) => current.get(p.path)?.editable === false).map((p) => p.path);

  return (
    <section aria-labelledby="sim-patch-title" className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-[var(--border-default)] bg-[var(--surface-canvas)] px-4 py-2.5">
        <div className="min-w-0 flex-1">
          <h2 id="sim-patch-title" className="text-[14px] font-semibold text-[var(--text-primary)]">
            Proposed changes from the coding assistant
          </h2>
          <p className="text-app-meta text-[var(--text-secondary)]">Your current version on the left, the proposal on the right. Accepting replaces these files and saves them.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="quiet" onClick={onClose} disabled={busy !== null}>
            Decide later
          </Button>
          <Button size="sm" variant="secondary" onClick={onReject} loading={busy === "reject"} disabled={busy !== null}>
            Reject
          </Button>
          <Button size="sm" variant="primary" onClick={onAccept} loading={busy === "accept"} disabled={busy !== null || locked.length > 0}>
            Accept and save
          </Button>
        </div>
      </div>
      {locked.length ? (
        <p className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--sim-attention-bg)] px-4 py-2 text-[13px] text-[var(--sim-attention)]">
          This proposal changes read-only files ({locked.join(", ")}), so it cannot be accepted. You can reject it or copy what is useful by hand.
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="shrink-0 border-b border-[var(--border-subtle)] bg-[var(--sim-error-bg)] px-4 py-2 text-[13px] text-[var(--sim-error)]">
          {error}
        </p>
      ) : null}
      {patch.length > 1 ? (
        <div role="tablist" aria-label="Files in this proposal" className="sim-scroll flex shrink-0 gap-1 overflow-x-auto border-b border-[var(--border-subtle)] px-3 py-1.5">
          {patch.map((p) => {
            const before = current.get(p.path)?.content;
            const counts = lineDiffCounts(before ?? "", p.content);
            const isSel = p.path === active?.path;
            return (
              <button
                key={p.path}
                type="button"
                role="tab"
                aria-selected={isSel}
                onClick={() => setSelected(p.path)}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-[6px] px-2 py-1 font-mono text-app-meta",
                  isSel ? "bg-[var(--surface-selected)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
                )}
              >
                {p.path}
                {before === undefined ? <span className="font-sans text-app-meta text-[var(--text-tertiary)]">new</span> : null}
                <span className="tabular-nums">
                  <span className="text-[var(--sim-success)]">+{counts.added}</span> <span className="text-[var(--sim-error)]">-{counts.removed}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
      <div className="min-h-0 flex-1">
        {active ? (
          <CodeDiff
            id={`assistant/${interaction.id}/${active.path}`}
            original={current.get(active.path)?.content ?? ""}
            modified={active.content}
            language={languageFor(active.path)}
            theme={theme}
            fontSize={fontSize}
            label={`Proposed changes to ${active.path}`}
          />
        ) : (
          <p className="p-5 text-[14px] text-[var(--text-secondary)]">This proposal has no file changes.</p>
        )}
      </div>
    </section>
  );
}
