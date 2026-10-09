"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, FileCode2, FolderGit2, GitCommitHorizontal, MessageSquareQuote, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Notice } from "@/components/ui/report";
import { LocalDate } from "@/components/eng/LocalTime";
import {
  CONTRIBUTION_STATUS_LABEL,
  type Attribution,
  type CapabilityEntry,
  type CapabilityEvidence,
  type CapabilityReview,
  type Coverage,
} from "@/lib/passport/capability/types";
import { BASIS_STYLE, BasisChip, BasisLegend, CoverageTag } from "./EvidenceTags";
import { RELATIONSHIP_LABEL } from "@/lib/passport/context-contract";

export type ReportVersionMeta = {
  version: number;
  reason: string;
  createdAt: string;
  stale: boolean;
  versions: Array<{ version: number; reason: string; createdAt: string }>;
};

const LEVEL_LABEL: Record<Attribution["level"], string> = {
  commit_signal: "Linked by commits",
  partial_commit_signal: "Partly linked by commits",
  statement_only: "Engineer statement only",
  none: "Not linked to the engineer",
  not_assessable: "Contribution not assessed",
};

export { BasisChip, CoverageTag };

const SCOPE_TINT: Record<"person" | "project_only" | "narrowed", string> = {
  person: "var(--accent-soft)",
  project_only: "var(--surface-panel)",
  narrowed: "var(--surface-uncertain)",
};

function scopeKey(entry: CapabilityEntry): keyof typeof SCOPE_TINT {
  return entry.status === "narrowed" ? "narrowed" : entry.scope === "person" ? "person" : "project_only";
}

function ScopeTag({ entry }: { entry: CapabilityEntry }) {
  const key = scopeKey(entry);
  if (key === "narrowed") {
    return (
      <span className="inline-flex items-center gap-1 text-app-meta font-semibold text-[var(--fy-amber-ink,var(--badge-attention-ink))]">
        <TriangleAlert className="h-3.5 w-3.5" aria-hidden />
        Narrowed
      </span>
    );
  }
  return key === "person" ? (
    <span className="inline-flex items-center gap-1 text-app-meta font-semibold text-[var(--accent-ink)]">
      <GitCommitHorizontal className="h-3.5 w-3.5" aria-hidden />
      Linked by commits
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-app-meta font-semibold text-[var(--text-secondary)]">
      <FolderGit2 className="h-3.5 w-3.5" aria-hidden />
      Project only
    </span>
  );
}

function EvidenceItem({ e, onOpenFinding }: { e: CapabilityEvidence; onOpenFinding: (id: string) => void }) {
  if (e.kind === "source_lines" || e.kind === "test_file") {
    const range = e.endLine > e.startLine ? `L${e.startLine}-${e.endLine}` : `L${e.startLine}`;
    return (
      <li className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <FileCode2 className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
        <button type="button" onClick={() => onOpenFinding(e.findingId)} className="min-w-0 truncate font-mono text-app-meta text-[var(--accent-ink)] hover:underline hover:underline-offset-4" title={`${e.path} ${range}`}>
          {e.path} {range}
        </button>
        <span className="text-app-meta text-[var(--text-tertiary)]">{e.kind === "test_file" ? "test file, read not run" : "source lines"} at {e.revision.slice(0, 7)}</span>
      </li>
    );
  }
  if (e.kind === "commit") {
    return (
      <li className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        <GitCommitHorizontal className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden />
        {e.url ? (
          <a href={e.url} target="_blank" rel="noreferrer noopener" className="font-mono text-app-meta text-[var(--accent-ink)] hover:underline">
            {e.sha.slice(0, 7)}
          </a>
        ) : (
          <span className="font-mono text-app-meta text-[var(--text-secondary)]">{e.sha.slice(0, 7)}</span>
        )}
        <span className="min-w-0 truncate text-app-meta text-[var(--text-secondary)]">{e.subject}</span>
      </li>
    );
  }
  if (e.kind === "statement") {
    return (
      <li className="flex min-w-0 items-start gap-2">
        <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0" style={{ color: BASIS_STYLE.engineer_statement.ink }} aria-hidden />
        <span className="text-app-body text-[var(--text-body)]">&ldquo;{e.text}&rdquo;</span>
      </li>
    );
  }
  return (
    <li className="flex min-w-0 flex-wrap items-center gap-2">
      <BasisChip basis="task_demonstration" />
      <span className="text-app-body text-[var(--text-body)]">{e.outcome}</span>
    </li>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-t border-[var(--border-subtle)] py-3 first:border-t-0 sm:grid-cols-[150px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-app-control font-medium text-[var(--text-secondary)]">{label}</dt>
      <dd className="min-w-0 text-app-prose text-[var(--text-body)]">{children}</dd>
    </div>
  );
}

export function CapabilityCard({ entry, onOpenFinding, compact = false }: { entry: CapabilityEntry; onOpenFinding: (id: string) => void; compact?: boolean }) {
  return (
    <article className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)]">
      <header className="px-5 pb-4 pt-4" style={{ background: SCOPE_TINT[scopeKey(entry)] }}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <ScopeTag entry={entry} />
          <span className="flex flex-wrap gap-1.5">
            {entry.basis.map((b) => (
              <BasisChip key={b} basis={b} />
            ))}
          </span>
        </div>
        <h4 className="mt-2 text-[19px] font-semibold leading-[1.35] tracking-[-0.01em] text-[var(--text-primary)]">{entry.title}</h4>
      </header>
      <dl className="px-5 pb-2">
        <Row label="Specific work">{entry.specificWork}</Row>
        <Row label="Evidence">
          <ul className="space-y-1.5">
            {entry.evidence.map((e, i) => (
              <EvidenceItem key={i} e={e} onOpenFinding={onOpenFinding} />
            ))}
          </ul>
          {entry.alsoSeenIn.length ? <p className="mt-1.5 text-app-meta text-[var(--text-tertiary)]">Identical code also in {entry.alsoSeenIn.join(", ")}; counted once.</p> : null}
        </Row>
        <Row label="Contribution">
          <span className="font-medium text-[var(--text-primary)]">{CONTRIBUTION_STATUS_LABEL[entry.contribution.status]}.</span> {entry.contribution.text}
          {entry.contribution.limits.map((l) => (
            <span key={l} className="mt-1 block text-app-meta text-[var(--text-tertiary)]">
              {l}
            </span>
          ))}
        </Row>
        <Row label="Result">{entry.result}</Row>
        {compact ? null : (
          <Row label="Limits">
            <ul className="space-y-1">
              {entry.limits.map((l) => (
                <li key={l} className="text-app-body text-[var(--text-secondary)]">
                  {l}
                </li>
              ))}
            </ul>
          </Row>
        )}
        <Row label="Employer follow-up">
          <span className="text-[var(--text-primary)]">{entry.followUp}</span>
        </Row>
      </dl>
    </article>
  );
}

function ReanalyzeForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!open) {
    return (
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        Re-analyze
      </Button>
    );
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/passport/capability-reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, reason }) });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setError(data.error ?? "The report could not be saved.");
      else {
        setOpen(false);
        router.refresh();
      }
    } catch {
      setError("Fydell could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="mt-3 flex w-full flex-wrap items-end gap-2">
      <label className="min-w-[240px] flex-1">
        <span className="text-app-control font-medium text-[var(--text-primary)]">Why re-analyze?</span>
        <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} required minLength={3} className="platform-input mt-1 text-[15px]" placeholder="Added a contribution statement" />
      </label>
      <Button size="md" variant="primary" type="submit" loading={busy} disabled={reason.trim().length < 3}>
        Create new version
      </Button>
      <Button size="md" variant="quiet" type="button" onClick={() => setOpen(false)} disabled={busy}>
        Cancel
      </Button>
      {error ? <Notice tone="error" className="w-full">{error}</Notice> : null}
    </form>
  );
}

/** Snapshots saved before capability reports existed get one on request; nothing is back-dated. */
export function NoReview({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function build() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/passport/capability-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, reason: "First capability report for a snapshot saved before reports existed" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) setError(data.error ?? "The report could not be saved.");
      else router.refresh();
    } catch {
      setError("Fydell could not be reached. Try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="py-8">
      <p className="text-app-finding text-[var(--text-primary)]">No capability report yet</p>
      <p className="mt-1 max-w-[62ch] text-app-prose text-[var(--text-secondary)]">
        This snapshot was saved before Fydell kept project behaviour, contribution evidence and capabilities apart. Building the report reads the stored findings again; it does not re-fetch the code.
      </p>
      <Button className="mt-4" size="md" variant="primary" loading={busy} onClick={() => void build()}>
        Build report
      </Button>
      {error ? <Notice tone="error" className="mt-3">{error}</Notice> : null}
    </div>
  );
}

export function ReportVersionLine({ meta, projectId, canReanalyze }: { meta: ReportVersionMeta; projectId: string; canReanalyze: boolean }) {
  return (
    <div className="mt-6">
      {meta.stale ? (
        <Notice tone="attention" action={canReanalyze ? <ReanalyzeForm projectId={projectId} /> : undefined}>
          Something this report depends on has changed since version {meta.version}, such as your contribution statement or relationship. The saved report stays as it is until you create a new version.
        </Notice>
      ) : null}
      <p className="mt-3 text-app-meta text-[var(--text-tertiary)]">
        Report version {meta.version}, saved <LocalDate iso={meta.createdAt} />: {meta.reason}.
        {meta.versions.length > 1 ? ` ${meta.versions.length - 1} earlier version${meta.versions.length === 2 ? " is" : "s are"} kept unchanged.` : ""}
      </p>
    </div>
  );
}

function AttributionPanel({ review }: { review: CapabilityReview }) {
  const a = review.attribution;
  const statement = review.layers.engineerStatements.find((s) => s.kind === "contribution");
  return (
    <section aria-labelledby="attribution-heading" className="overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)]">
      <div className="px-5 pb-4 pt-4" style={{ background: a.personClaimsAllowed ? "var(--accent-soft)" : "var(--surface-panel)" }}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 id="attribution-heading" className="text-app-control font-semibold text-[var(--text-primary)]">
            Contribution
          </h3>
          <span className={`inline-flex items-center gap-1 text-app-meta font-semibold ${a.personClaimsAllowed ? "text-[var(--accent-ink)]" : "text-[var(--text-secondary)]"}`}>
            {a.personClaimsAllowed ? <GitCommitHorizontal className="h-3.5 w-3.5" aria-hidden /> : <FolderGit2 className="h-3.5 w-3.5" aria-hidden />}
            {LEVEL_LABEL[a.level]}
          </span>
        </div>
        <p className="mt-2 text-app-prose text-[var(--text-body)]">{a.summary}</p>
      </div>
      <div className="px-5 pb-5">
        {a.automatic.length ? (
          <ul className="mt-3 space-y-1">
            {a.automatic.map((r) => (
              <li key={r.reason} className="text-app-body text-[var(--text-secondary)]">
                {r.detail}
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 rounded-[var(--radius-control)] p-3" style={{ background: BASIS_STYLE.engineer_statement.bg }}>
          <div className="flex flex-wrap items-center gap-2">
            <BasisChip basis="engineer_statement" />
            <span className="text-app-meta text-[var(--text-secondary)]">Shown separately from source evidence</span>
          </div>
          <p className="mt-2 text-app-body text-[var(--text-body)]">
            {a.relationship !== "unspecified" ? <span className="font-semibold text-[var(--text-primary)]">{RELATIONSHIP_LABEL[a.relationship]}. </span> : null}
            {statement ? statement.text : a.relationship === "unspecified" ? "Nothing stated yet." : null}
          </p>
        </div>
        {a.limits[0] ? <p className="mt-3 text-app-meta text-[var(--text-tertiary)]">{a.limits[0]}</p> : null}
      </div>
    </section>
  );
}

function coverageCounts(review: CapabilityReview) {
  const counts = new Map<Coverage, number>();
  for (const s of review.requirementSets) for (const r of s.requirements) counts.set(r.coverage, (counts.get(r.coverage) ?? 0) + 1);
  return (["supports", "partially_supports", "contradicted", "insufficient_evidence", "not_assessed"] as Coverage[]).filter((c) => counts.get(c)).map((c) => ({ coverage: c, n: counts.get(c) ?? 0 }));
}

export function CapabilityOverview({
  review,
  onOpenFinding,
  onOpenCapabilities,
}: {
  review: CapabilityReview;
  onOpenFinding: (id: string) => void;
  onOpenCapabilities: () => void;
}) {
  const top = [...review.capabilities].filter((c) => c.status === "supported").slice(0, 3);
  const narrowed = review.capabilities.filter((c) => c.status === "narrowed").length;
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
      <div className="min-w-0 space-y-8">
        <section aria-labelledby="purpose-heading">
          <h3 id="purpose-heading" className="text-app-control font-semibold text-[var(--text-secondary)]">
            What this project is
          </h3>
          <p className="mt-1.5 max-w-[68ch] text-app-prose text-[var(--text-body)]">{review.overview.purpose ?? "No description yet. Add a contribution statement to say what the project does and what you worked on."}</p>
        </section>

        <section aria-labelledby="found-heading">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="found-heading" className="text-app-section text-[var(--text-primary)]">
              What the code shows
            </h3>
            {review.capabilities.length ? (
              <button type="button" onClick={onOpenCapabilities} className="text-app-control font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4">
                Capability review ({review.capabilities.length})
              </button>
            ) : null}
          </div>
          {top.length ? (
            <ul className="mt-3 space-y-3">
              {top.map((c) => {
                const first = c.evidence.find((e) => e.kind === "source_lines" || e.kind === "test_file");
                return (
                  <li key={c.id} className="rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <ScopeTag entry={c} />
                      <span className="flex flex-wrap gap-1.5">
                        {c.basis.map((b) => (
                          <BasisChip key={b} basis={b} />
                        ))}
                      </span>
                    </div>
                    <p className="mt-2 text-[18px] font-semibold leading-[1.4] text-[var(--text-primary)]">{c.title}</p>
                    <p className="mt-1 text-app-body text-[var(--text-secondary)]">{c.result}</p>
                    {first && (first.kind === "source_lines" || first.kind === "test_file") ? (
                      <button type="button" onClick={() => onOpenFinding(first.findingId)} className="mt-2 inline-flex items-center gap-1 text-app-control font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4">
                        Open evidence: <span className="font-mono text-app-meta">{first.path} L{first.startLine}</span>
                        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 max-w-[68ch] text-app-prose text-[var(--text-secondary)]">
              {narrowed ? `${narrowed} finding${narrowed === 1 ? " was" : "s were"} narrowed, so nothing here supports a capability on its own. Capability review explains why.` : "None of the checks matched the analyzed files. That says nothing about the engineer; it means this snapshot gives no evidence either way."}
            </p>
          )}
        </section>

        {review.contradictions.length ? (
          <section aria-labelledby="contradictions-heading">
            <h3 id="contradictions-heading" className="text-app-control font-semibold text-[var(--text-primary)]">
              Comments the code does not back up
            </h3>
            <ul className="mt-2 space-y-2">
              {review.contradictions.map((c) => (
                <li key={`${c.path}:${c.line}`} className="text-app-body text-[var(--text-body)]">
                  <span className="font-mono text-app-meta text-[var(--text-secondary)]">
                    {c.path} L{c.line}
                  </span>{" "}
                  &ldquo;{c.text}&rdquo; <span className="text-[var(--text-secondary)]">{c.detail}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="limits-heading">
          <h3 id="limits-heading" className="text-app-control font-semibold text-[var(--text-primary)]">
            Limits
          </h3>
          <ul className="mt-2 space-y-1">
            {review.overview.limits.map((l) => (
              <li key={l} className="text-app-body text-[var(--text-secondary)]">
                {l}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <aside className="min-w-0 space-y-5">
        <AttributionPanel review={review} />
        {review.requirementSets.map((s) => (
          <section key={s.role} aria-label={`${s.label} requirements`} className="rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5">
            <h3 className="text-app-control font-semibold text-[var(--text-primary)]">{s.label} requirements</h3>
            <ul className="mt-3 space-y-2">
              {coverageCounts({ ...review, requirementSets: [s] }).map(({ coverage, n }) => (
                <li key={coverage} className="flex items-center justify-between gap-3">
                  <CoverageTag coverage={coverage} />
                  <span className="text-app-control tabular-nums text-[var(--text-primary)]">{n}</span>
                </li>
              ))}
            </ul>
            <button type="button" onClick={onOpenCapabilities} className="mt-3 text-app-control font-medium text-[var(--accent-ink)] hover:underline hover:underline-offset-4">
              See each requirement
            </button>
          </section>
        ))}
        <section className="rounded-[var(--radius-panel)] bg-[var(--accent-soft)] p-5">
          <h3 className="text-app-control font-semibold text-[var(--accent-ink)]">Next</h3>
          <p className="mt-1 text-app-body text-[var(--text-body)]">{review.overview.nextAction}</p>
        </section>
      </aside>
    </div>
  );
}

export function CapabilityList({ review, onOpenFinding }: { review: CapabilityReview; onOpenFinding: (id: string) => void }) {
  const byId = new Map(review.capabilities.map((c) => [c.id, c]));
  return (
    <div className="space-y-10">
      {review.requirementSets.map((s) => (
        <section key={s.role} aria-labelledby={`req-${s.role}`}>
          <h3 id={`req-${s.role}`} className="text-app-section text-[var(--text-primary)]">
            {s.label}: requirement coverage
          </h3>
          <p className="mt-1 max-w-[70ch] text-app-body text-[var(--text-secondary)]">
            Coverage says what the evidence means for one requirement. It is separate from how the evidence was observed, and it is never a score.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-app-meta font-medium text-[var(--text-secondary)]">How evidence was obtained</span>
            <BasisLegend />
          </div>
          <ul className="mt-4 divide-y divide-[var(--border-subtle)] rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)]">
            {s.requirements.map((r) => (
              <li key={r.id} className="grid gap-2 px-5 py-4 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)] md:gap-6">
                <div className="min-w-0">
                  <p className="text-app-body font-medium text-[var(--text-primary)]">{r.label}</p>
                  <div className="mt-1.5">
                    <CoverageTag coverage={r.coverage} />
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-app-body text-[var(--text-body)]">{r.why}</p>
                  {r.coverage !== "supports" ? <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">What would count: {r.whatWouldCount}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {review.groups.map((g) => (
        <section key={g.requirementId} aria-labelledby={`grp-${g.requirementId}`}>
          <div className="flex flex-wrap items-center gap-3">
            <h3 id={`grp-${g.requirementId}`} className="text-app-section text-[var(--text-primary)]">
              {g.label}
            </h3>
            {g.requirementId !== "other" ? <CoverageTag coverage={g.coverage} /> : null}
          </div>
          <p className="mt-1 text-app-body text-[var(--text-secondary)]">{g.summary}</p>
          <div className="mt-4 space-y-4">
            {g.capabilityIds.map((id) => {
              const c = byId.get(id);
              return c ? <CapabilityCard key={id} entry={c} onOpenFinding={onOpenFinding} /> : null;
            })}
          </div>
        </section>
      ))}

      {review.questions.length ? (
        <section aria-labelledby="questions-heading">
          <h3 id="questions-heading" className="text-app-section text-[var(--text-primary)]">
            Unanswered questions
          </h3>
          <ul className="mt-3 space-y-3">
            {review.questions.map((q) => (
              <li key={q.id} className="rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
                <p className="text-[17px] font-medium leading-[1.45] text-[var(--text-primary)]">{q.question}</p>
                <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">Why it is open: {q.why}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {review.rejectedClaims.length || review.ignoredInstructions.length ? (
        <section aria-labelledby="method-heading">
          <h3 id="method-heading" className="text-app-control font-semibold text-[var(--text-primary)]">
            Removed during checking
          </h3>
          <ul className="mt-2 space-y-1">
            {review.rejectedClaims.map((r) => (
              <li key={`${r.path}:${r.startLine}`} className="text-app-body text-[var(--text-secondary)]">
                <span className="font-mono text-app-meta">
                  {r.path} L{r.startLine}
                </span>{" "}
                {r.reason}
              </li>
            ))}
            {review.ignoredInstructions.map((u) => (
              <li key={`${u.path}:${u.line}`} className="text-app-body text-[var(--text-secondary)]">
                <span className="font-mono text-app-meta">
                  {u.path} L{u.line}
                </span>{" "}
                reads like instructions to an analyzer. It was ignored.
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-app-meta text-[var(--text-tertiary)]">
        {review.method.notRun} {review.method.coverage}{" "}
        {review.method.enrichment.source === "model" ? `Titles and questions were made specific by ${review.method.enrichment.model} and checked against the cited lines; ${review.method.enrichment.rejected.length} suggestion${review.method.enrichment.rejected.length === 1 ? " was" : "s were"} rejected.` : "Titles and questions use fixed wording."}
      </p>
    </div>
  );
}

/** Attribution for one finding, shown apart from what the code does. */
export function FindingAttribution({ review, findingId }: { review: CapabilityReview; findingId: string }) {
  const entry = review.capabilities.find((c) => c.findingIds.includes(findingId));
  if (!entry) return null;
  const person = entry.scope === "person" && entry.status !== "narrowed";
  const commits = entry.evidence.filter((e): e is Extract<CapabilityEvidence, { kind: "commit" }> => e.kind === "commit");
  return (
    <div className="mt-5 grid gap-3">
      <div className="grid gap-3">
        <section aria-label="Code behaviour" className="rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-app-control font-semibold text-[var(--text-primary)]">Code behaviour</h4>
            <BasisChip basis="inspected_code" />
          </div>
          <p className="mt-2 text-app-body text-[var(--text-body)]">{entry.result}</p>
        </section>
        <section aria-label="Attribution" className="rounded-[var(--radius-control)] p-4" style={{ background: person ? "var(--accent-soft)" : "var(--surface-panel)" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-app-control font-semibold text-[var(--text-primary)]">Attribution</h4>
            <ScopeTag entry={entry} />
          </div>
          <p className="mt-2 text-app-body text-[var(--text-body)]">
            <span className="font-semibold text-[var(--text-primary)]">{CONTRIBUTION_STATUS_LABEL[entry.contribution.status]}.</span> {entry.contribution.text}
          </p>
          {commits.length ? (
            <ul className="mt-2 space-y-1">
              {commits.slice(0, 3).map((c) => (
                <EvidenceItem key={c.sha} e={c} onOpenFinding={() => undefined} />
              ))}
            </ul>
          ) : null}
          {entry.contribution.limits[0] ? <p className="mt-2 text-app-meta text-[var(--text-secondary)]">{entry.contribution.limits[0]}</p> : null}
        </section>
      </div>
      <div className="rounded-[var(--radius-control)] bg-[var(--surface-panel)] p-4">
        <p className="text-app-control font-semibold text-[var(--text-primary)]">Employer follow-up</p>
        <p className="mt-1 text-app-body text-[var(--text-body)]">{entry.followUp}</p>
      </div>
    </div>
  );
}
