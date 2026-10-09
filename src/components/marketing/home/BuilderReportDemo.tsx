"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import { SAMPLE_PASSPORT, SAMPLE_REQUIREMENT_FIT, SAMPLE_ROLE } from "@/lib/marketing/sample-passport";

const CATEGORY: Record<string, string> = {
  reliability: "Reliability",
  correctness: "Correctness",
  testing: "Testing",
};

/**
 * The homepage story in one surface: pick a finding, read the lines it cites
 * and its limits, then see how a reviewer could read it against a role.
 * Built from the sample fixture and the same CodeBlock the product uses.
 */
export default function BuilderReportDemo() {
  const project = SAMPLE_PASSPORT.projects[0];
  const [selectedId, setSelectedId] = useState(project.evidence[0].id);
  const selected = project.evidence.find((e) => e.id === selectedId) ?? project.evidence[0];
  const fit = SAMPLE_REQUIREMENT_FIT[selected.id];

  return (
    <div className="text-left">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="font-mono text-[14px] font-medium text-[var(--text-primary)]">{project.repoFullName}</p>
          <p className="mt-0.5 text-[13px] text-[var(--text-tertiary)]">
            <span className="font-mono">{project.revisionRef} @ {project.commitSha.slice(0, 7)}</span> · {project.coverage.analyzedFiles} of{" "}
            {project.coverage.totalFiles} files read · {project.coverage.skippedFiles} skipped (vendored, lockfile, binary)
          </p>
        </div>
        <p className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--status-positive-ink)]">
          <Check className="h-4 w-4" strokeWidth={2} aria-hidden />
          Report ready
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div className="border-b border-[var(--border-subtle)] p-3 sm:p-4 lg:border-b-0 lg:border-r">
          <p className="px-2 pb-2 text-[13px] font-medium text-[var(--text-tertiary)]">Findings</p>
          <ul className="space-y-1">
            {project.evidence.map((e) => {
              const active = e.id === selected.id;
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setSelectedId(e.id)}
                    className={`w-full rounded-[8px] px-3 py-2.5 text-left transition-colors duration-100 ${
                      active ? "bg-[var(--surface-selected)]" : "hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <span className="block text-[13px] text-[var(--text-tertiary)]">{CATEGORY[e.category] ?? e.category}</span>
                    <span className="mt-0.5 block text-[15px] leading-[1.4] text-[var(--text-primary)]">{e.finding}</span>
                    <span className="mt-1 block truncate font-mono text-app-meta text-[var(--text-tertiary)]">
                      {e.path}:{e.startLine}-{e.endLine}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div aria-live="polite" className="min-w-0 p-5 sm:p-6">
          <p className="text-[13px] text-[var(--text-tertiary)]">Observed in the code · authorship not checked</p>
          <p className="mt-2 text-[18px] font-semibold leading-[1.35] tracking-[-0.012em] text-[var(--text-primary)]">{selected.finding}</p>
          <div className="mt-4">
            <CodeBlock
              path={selected.path}
              meta={project.commitSha.slice(0, 7)}
              lines={selected.excerpt.map((text, i) => ({ n: selected.startLine + i, text, mark: "cited" as const }))}
            />
          </div>
          <div className="mt-4 space-y-1 text-[14px] leading-[1.55] text-[var(--text-secondary)]">
            <p className="font-medium text-[var(--text-primary)]">What this doesn&apos;t show</p>
            {selected.limitations.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </div>
          {fit ? (
            <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
              <p className="text-[13px] text-[var(--text-tertiary)]">Reviewer reading for {SAMPLE_ROLE}</p>
              <p className="mt-1 text-[15px] font-medium text-[var(--text-primary)]">{fit.requirement}</p>
              <p className="mt-1 text-[14px] leading-[1.55] text-[var(--text-body)]">{fit.reading}</p>
              <p className="mt-2 text-[14px] leading-[1.55] text-[var(--text-secondary)]">Follow-up: {fit.open}</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
