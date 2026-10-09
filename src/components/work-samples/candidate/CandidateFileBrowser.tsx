"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import type { ScenarioPackage } from "@/lib/eng/authoring/package";
import { cn } from "@/lib/cn";

/** The starter project as the candidate receives it, public tests included. */
export function CandidateFileBrowser({ pkg }: { pkg: ScenarioPackage }) {
  const files = [...pkg.starterFiles].sort((a, b) => a.path.localeCompare(b.path));
  const testFiles = new Set(pkg.publicTests.map((t) => t.file));
  const fixtures = new Set(pkg.fixturePaths);
  const [selected, setSelected] = useState(files[0]?.path ?? "");
  const file = files.find((f) => f.path === selected) ?? files[0];
  if (!file) return <p className="text-[14px] text-[var(--text-secondary)]">The starter project has no files.</p>;
  return (
    <div className="grid overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-default)] md:grid-cols-[220px_minmax(0,1fr)]">
      <ul aria-label="Starter files" className="max-h-[420px] overflow-y-auto border-b border-[var(--border-subtle)] bg-[var(--surface-panel)] py-1 md:border-b-0 md:border-r">
        {files.map((f) => (
          <li key={f.path}>
            <button
              type="button"
              aria-current={f.path === file.path ? "true" : undefined}
              onClick={() => setSelected(f.path)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-left font-mono text-app-meta",
                f.path === file.path ? "bg-[var(--surface-selected)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]",
              )}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="min-w-0 truncate">{f.path}</span>
              {testFiles.has(f.path) ? <span className="ml-auto shrink-0 font-sans text-app-meta text-[var(--text-tertiary)]">test</span> : fixtures.has(f.path) ? <span className="ml-auto shrink-0 font-sans text-app-meta text-[var(--text-tertiary)]">fixture</span> : null}
            </button>
          </li>
        ))}
      </ul>
      <div className="min-w-0">
        <p className="border-b border-[var(--border-subtle)] px-3.5 py-2 font-mono text-app-meta text-[var(--text-secondary)]">{file.path}</p>
        <pre className="max-h-[420px] overflow-auto bg-[var(--surface-code)] px-3.5 py-3 font-mono text-app-meta leading-[1.6] text-[var(--text-primary)]">{file.content}</pre>
      </div>
    </div>
  );
}

export default CandidateFileBrowser;
