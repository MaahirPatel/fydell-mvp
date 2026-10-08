import Link from "next/link";
import { Status, type StatusKind } from "@/components/ui/report";
import type { Correction } from "@/lib/passport/corrections";
import { versionsOf } from "@/lib/passport/versions";
import type { PassportProject } from "@/lib/passport/view";
import { REPORT_STATE, formatDate, formatDateTime, reportState, shortSha, type StateTone } from "@/lib/passport/record-states";

const KIND: Record<StateTone, StatusKind> = { neutral: "neutral", active: "pending", changed: "attention", risk: "failed", good: "success" };

/** The current version of every imported repository, each linking to its Builder Report. */
export default function WorkRecordProjects({ projects, corrections }: { projects: PassportProject[]; corrections: Correction[] }) {
  const current = projects.filter((p) => p.status !== "stale" && p.id);
  if (current.length === 0) {
    return (
      <div className="rounded-[8px] border border-dashed border-[var(--border-default)] bg-[var(--surface-panel)] px-5 py-6">
        <p className="text-[14px] font-medium">No projects yet</p>
        <p className="mt-1 max-w-[56ch] text-[13px] leading-[1.6] text-[var(--text-secondary)]">Add a public repository and Fydell produces a report where every finding cites the lines it came from.</p>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-[8px] border border-[var(--border-default)] bg-[var(--surface-raised)]">
      <div aria-hidden className="hidden grid-cols-[minmax(0,1fr)_110px_90px_120px] gap-4 border-b border-[var(--border-subtle)] bg-[var(--surface-panel)] px-4 py-1.5 text-[12.5px] font-medium text-[var(--text-tertiary)] sm:grid">
        <span>Project</span>
        <span>Status</span>
        <span className="text-right">Findings</span>
        <span className="text-right">Analyzed</span>
      </div>
      <ul className="divide-y divide-[var(--border-subtle)]">
        {current.map((p) => {
          const state = REPORT_STATE[reportState(p)];
          const versions = versionsOf(projects, p.repoFullName).length;
          const ids = new Set(p.evidence.map((e) => e.id));
          const open = corrections.filter((c) => ids.has(c.findingId) && !c.withdrawnAt && c.status === "open").length;
          const [owner, name] = p.repoFullName.includes("/") ? p.repoFullName.split("/", 2) : ["", p.repoFullName];
          return (
            <li key={p.id}>
              <Link
                href={`/app/candidate/projects/${p.id}`}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-2.5 transition-colors hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)] sm:grid-cols-[minmax(0,1fr)_110px_90px_120px]"
              >
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium text-[var(--text-primary)]">{name}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-[var(--text-tertiary)]">
                    {p.sourceKind === "upload" ? (
                      <>
                        Uploaded <span className="font-mono">{shortSha(p.commitSha)}</span>
                      </>
                    ) : (
                      <>
                        {owner}
                        {owner ? " · " : ""}
                        {p.revisionRef ?? "default"} <span className="font-mono">{shortSha(p.commitSha)}</span>
                      </>
                    )}
                    {versions > 1 ? ` · ${versions} versions` : ""}
                    {open ? <span className="text-[var(--badge-attention-ink)]"> · {open} open note{open === 1 ? "" : "s"}</span> : null}
                  </span>
                </span>
                <span>
                  <Status kind={KIND[state.tone]}>{state.label}</Status>
                </span>
                <span className="hidden text-right text-[14px] tabular-nums text-[var(--text-primary)] sm:block">{p.evidence.length}</span>
                <span className="hidden text-right text-[13px] text-[var(--text-secondary)] sm:block" title={formatDateTime(p.analyzedAt)}>
                  {formatDate(p.analyzedAt)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
