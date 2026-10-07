"use client";

import { useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/Button";
import { FormSuccess } from "@/components/ui/Field";
import PassportConnectSection from "@/components/profile/PassportConnectSection";
import ImportJobsPanel from "@/components/passport/ImportJobsPanel";
import UploadProject from "@/components/passport/UploadProject";
import type { ImportJobView } from "@/lib/passport/import-jobs";
import ManualProjectForm from "./ManualProjectForm";

type PathKey = "github" | "upload" | "describe";

const PATHS: { key: PathKey; label: string; hint: string }[] = [
  { key: "github", label: "Public GitHub", hint: "Fydell reads a pinned commit and cites the code behind each finding." },
  { key: "upload", label: "Upload a ZIP", hint: "For code that isn't public. You review every file before it's read." },
  { key: "describe", label: "Describe it", hint: "For work you can't share. Shown as your description, not analyzed." },
];

/**
 * The three ways onto a Builder Profile, each wired to the endpoint the
 * Passport page uses. Imports already running are shown here too, so leaving
 * and coming back never hides work in progress.
 */
export default function ProjectPaths({
  jobs,
  hasProjects,
  initialLogin,
}: {
  jobs: ImportJobView[];
  hasProjects: boolean;
  initialLogin: string;
}) {
  const [open, setOpen] = useState(!hasProjects);
  const [path, setPath] = useState<PathKey>("github");
  const [uploaded, setUploaded] = useState<{ id: string; name: string } | null>(null);
  const tabs = useRef<Record<PathKey, HTMLButtonElement | null>>({ github: null, upload: null, describe: null });

  function onKey(e: React.KeyboardEvent, index: number) {
    const delta = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = PATHS[(index + delta + PATHS.length) % PATHS.length].key;
    setPath(next);
    tabs.current[next]?.focus();
  }

  const active = PATHS.find((p) => p.key === path) ?? PATHS[0];

  return (
    <div className="grid gap-5">
      <div className="empty:hidden">
        <ImportJobsPanel initialJobs={jobs} />
      </div>

      {!open ? (
        <div>
          <Button variant="secondary" size="md" onClick={() => setOpen(true)}>
            Add another project
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          <div
            role="tablist"
            aria-label="How to add a project"
            className="grid grid-cols-3 gap-1 rounded-[10px] bg-[var(--surface-hover)] p-1 sm:inline-grid sm:w-fit"
          >
            {PATHS.map((p, i) => (
              <button
                key={p.key}
                ref={(el) => {
                  tabs.current[p.key] = el;
                }}
                type="button"
                role="tab"
                id={`path-tab-${p.key}`}
                aria-selected={path === p.key}
                aria-controls={`path-panel-${p.key}`}
                tabIndex={path === p.key ? 0 : -1}
                onClick={() => setPath(p.key)}
                onKeyDown={(e) => onKey(e, i)}
                className={`h-9 min-w-0 truncate rounded-[7px] px-2 text-[13px] font-medium transition-colors duration-100 sm:px-3.5 ${
                  path === p.key
                    ? "bg-[var(--surface-raised)] text-[var(--text-primary)] shadow-[0_0_0_1px_var(--border-default)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-app-meta text-[var(--text-secondary)]">{active.hint}</p>

          {uploaded && path === "upload" ? (
            <FormSuccess>
              <span className="block">Saved &ldquo;{uploaded.name}&rdquo;. Its Builder Report is ready to read and correct.</span>
              <ButtonLink href={`/app/candidate/projects/${uploaded.id}`} variant="secondary" size="sm" className="mt-2">
                Open the report
              </ButtonLink>
            </FormSuccess>
          ) : null}

          {PATHS.map((p) => (
            <div
              key={p.key}
              role="tabpanel"
              id={`path-panel-${p.key}`}
              aria-labelledby={`path-tab-${p.key}`}
              hidden={path !== p.key}
            >
              {p.key === "github" ? <PassportConnectSection initialLogin={initialLogin} initialRepos={[]} /> : null}
              {p.key === "upload" ? <UploadProject onSaved={(id, name) => setUploaded({ id, name })} /> : null}
              {p.key === "describe" ? <ManualProjectForm /> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
