import Link from "next/link";
import { ArrowRight, FileCode2 } from "lucide-react";
import { Status, type StatusKind } from "@/components/ui/report";
import { ButtonLink } from "@/components/ui/Button";
import type { Correction } from "@/lib/passport/corrections";
import { versionsOf } from "@/lib/passport/versions";
import type { PassportProject } from "@/lib/passport/view";
import type { CapabilityReview } from "@/lib/passport/capability/types";
import { REPORT_STATE, formatDate, formatDateTime, reportState, shortSha, type StateTone } from "@/lib/passport/record-states";
import { CoverageTag } from "./CapabilityReview";

const KIND: Record<StateTone, StatusKind> = { neutral: "neutral", active: "pending", changed: "attention", risk: "failed", good: "success" };

const CONTRIBUTION_TONE: Record<CapabilityReview["attribution"]["level"], string> = {
  commit_signal: "bg-[var(--accent-soft)] text-[var(--accent-ink)]",
  partial_commit_signal: "bg-[var(--accent-soft)] text-[var(--accent-ink)]",
  statement_only: "bg-[var(--surface-panel)] text-[var(--text-secondary)]",
  none: "bg-[var(--surface-panel)] text-[var(--text-secondary)]",
  not_assessable: "bg-[var(--surface-panel)] text-[var(--text-secondary)]",
};

const CONTRIBUTION_SHORT: Record<CapabilityReview["attribution"]["level"], string> = {
  commit_signal: "Your commits touch the cited files",
  partial_commit_signal: "Your commits touch some cited files",
  statement_only: "Your statement only",
  none: "Not linked to you",
  not_assessable: "Contribution not assessed",
};

/**
 * One card per current project: what it is, how it relates to the engineer,
 * the report state, and up to three specific findings that open their
 * evidence. Removal lives on the project's report page.
 */
export default function WorkRecordProjects({
  projects,
  corrections,
  reports,
}: {
  projects: PassportProject[];
  corrections: Correction[];
  reports: Record<string, { version: number; review: CapabilityReview }>;
}) {
  const current = projects.filter((p) => p.status !== "stale" && p.id);
  if (current.length === 0) {
    return (
      <div className="rounded-[var(--radius-panel)] border border-dashed border-[var(--border-default)] bg-[var(--surface-panel)] px-5 py-6">
        <p className="text-app-body font-medium">No projects yet</p>
        <p className="mt-1 max-w-[56ch] text-app-meta text-[var(--text-secondary)]">Add a public repository and Fydell produces a report where every finding cites the lines it came from.</p>
      </div>
    );
  }
  return (
    <ul className="grid gap-4">
      {current.map((p) => {
        const id = p.id as string;
        const state = REPORT_STATE[reportState(p)];
        const versions = versionsOf(projects, p.repoFullName).length;
        const ids = new Set(p.evidence.map((e) => e.id));
        const open = corrections.filter((c) => ids.has(c.findingId) && !c.withdrawnAt && c.status === "open").length;
        const [owner, name] = p.repoFullName.includes("/") ? p.repoFullName.split("/", 2) : ["", p.repoFullName];
        const stored = reports[id];
        const review = stored?.review ?? null;
        const top = review ? review.capabilities.filter((c) => c.status === "supported").slice(0, 3) : [];
        const groups = review ? review.groups.filter((g) => g.requirementId !== "other").slice(0, 4) : [];
        return (
          <li key={id} className="rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/app/candidate/projects/${id}`} className="text-[19px] font-semibold leading-[1.3] tracking-[-0.012em] text-[var(--text-primary)] hover:underline hover:underline-offset-4">
                  {name}
                </Link>
                <p className="mt-1 max-w-[70ch] text-app-prose text-[var(--text-body)]">{review?.overview.purpose ?? "No description yet."}</p>
                <p className="mt-1 truncate text-app-meta text-[var(--text-tertiary)]" title={formatDateTime(p.analyzedAt)}>
                  {p.sourceKind === "upload" ? (
                    <>
                      Uploaded <span className="font-mono">{shortSha(p.commitSha)}</span>
                    </>
                  ) : (
                    <>
                      {owner ? `${owner}/${name}` : name} · {p.revisionRef ?? "default"} <span className="font-mono">{shortSha(p.commitSha)}</span>
                    </>
                  )}
                  {` · analyzed ${formatDate(p.analyzedAt)}`}
                  {versions > 1 ? ` · ${versions} versions` : ""}
                  {open ? <span className="text-[var(--badge-attention-ink)]"> · {open} open note{open === 1 ? "" : "s"}</span> : null}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {review ? <Status kind={KIND[state.tone]}>{state.label}</Status> : <Status kind="neutral">Analysis complete</Status>}
                <ButtonLink href={`/app/candidate/projects/${id}`} variant="primary" size="sm">
                  {review ? "Open report" : "Build report"} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </ButtonLink>
              </div>
            </div>

            {review ? (
              <>
                <div className="mt-4 flex flex-wrap items-start gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-app-meta font-medium ${CONTRIBUTION_TONE[review.attribution.level]}`}>{CONTRIBUTION_SHORT[review.attribution.level]}</span>
                  <p className="min-w-0 flex-1 basis-[280px] text-app-body text-[var(--text-secondary)]">{review.attribution.summary}</p>
                </div>
                {top.length ? (
                  <ul className="mt-4 divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)]">
                    {top.map((c) => {
                      const ev = c.evidence.find((e) => e.kind === "source_lines" || e.kind === "test_file");
                      const loc = ev && (ev.kind === "source_lines" || ev.kind === "test_file") ? ev : null;
                      return (
                        <li key={c.id}>
                          <Link href={`/app/candidate/projects/${id}?finding=${c.findingIds[0]}`} className="group flex items-start gap-3 py-3 hover:bg-[var(--surface-hover)]">
                            <FileCode2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
                            <span className="min-w-0">
                              <span className="block text-app-body font-medium text-[var(--text-primary)] group-hover:underline group-hover:underline-offset-4">{c.title}</span>
                              <span className="mt-0.5 block truncate text-app-meta text-[var(--text-tertiary)]">
                                {c.scope === "person" ? "Linked by commits" : "Project only"}
                                {loc ? (
                                  <>
                                    {" · "}
                                    <span className="font-mono">
                                      {loc.path} L{loc.startLine}
                                    </span>
                                  </>
                                ) : null}
                              </span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-4 border-t border-[var(--border-subtle)] pt-3 text-app-body text-[var(--text-secondary)]">
                    {review.capabilities.length ? "Every finding here was narrowed. The report explains why." : "No findings in the analyzed files."}
                  </p>
                )}
                {groups.length ? (
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                    {groups.map((g) => (
                      <span key={g.requirementId} className="inline-flex items-center gap-2 text-app-meta text-[var(--text-secondary)]">
                        {g.label}
                        <CoverageTag coverage={g.coverage} />
                      </span>
                    ))}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="mt-4 text-app-body text-[var(--text-secondary)]">
                {p.evidence.length} finding{p.evidence.length === 1 ? "" : "s"}. This snapshot was saved before capability reports; open it to build one.
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
