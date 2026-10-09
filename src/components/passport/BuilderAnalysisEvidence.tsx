"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Status, type StatusKind } from "@/components/ui/report";
import { FACETS, FACET_LABEL, type CapabilityStatement, type FacetState, type LedgerEntry, type VersionComparison } from "@/lib/builder-analysis/ledger";
import type { AnalysisVersionSummary, BuilderAnalysisReport, EvidenceLevel } from "@/lib/builder-analysis/types";

const FACET_STATE: Record<FacetState, { label: string; kind: StatusKind }> = {
  observed: { label: "Observed", kind: "success" },
  not_observed: { label: "Not observed", kind: "neutral" },
  claimed: { label: "Claimed by engineer", kind: "pending" },
  not_assessed: { label: "Not assessed", kind: "neutral" },
};

const LEVEL_TEXT: Record<EvidenceLevel, string> = {
  strong: "Strong evidence",
  developing: "Developing evidence",
  limited: "Limited evidence",
  insufficient_evidence: "Insufficient evidence",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

/** "Reliability and safety: retries cited in acme/api at revision 1a2b3c4. Tests were not run." */
export function CapabilityStatements({ statements }: { statements: CapabilityStatement[] }) {
  return (
    <ul className="space-y-5">
      {statements.map((s) => (
        <li key={s.dimension} className="max-w-[72ch]">
          <p className="text-[15px] leading-[1.6] text-[var(--text-primary)]">
            <span className="font-semibold">{s.label}: </span>
            {s.observed || "Nothing in this area was observed in the sources read."}
          </p>
          {s.claimed ? <p className="mt-1 text-[14px] leading-[1.55] text-[var(--text-secondary)]">{s.claimed}</p> : null}
          {s.notAssessed.length ? (
            <p className="mt-1 text-[13px] leading-[1.55] text-[var(--text-tertiary)]">{s.notAssessed.join(" ")}</p>
          ) : null}
          <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
            {LEVEL_TEXT[s.level]} · {s.entryIds.length} ledger entr{s.entryIds.length === 1 ? "y" : "ies"}
          </p>
        </li>
      ))}
    </ul>
  );
}

function EntryRow({ e }: { e: LedgerEntry }) {
  const [open, setOpen] = useState(false);
  const where = e.evidence.kind === "code" ? `${e.evidence.path}:${e.evidence.startLine}-${e.evidence.endLine}` : `repository history: ${e.evidence.measure}`;
  const url = e.evidence.url;
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="min-w-0 text-[14px] text-[var(--text-primary)]">{e.claim}</p>
        <Status kind="neutral" icon={false}>{e.basis === "observation" ? "Observation" : "Inference"}</Status>
      </div>
      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[12px] text-[var(--text-tertiary)]">
        <span>{e.source.repo}</span>
        {url ? (
          <a href={url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-0.5 hover:text-[var(--text-primary)]">
            {where}
            <ArrowUpRight className="h-3 w-3" aria-hidden />
          </a>
        ) : (
          <span>{where}</span>
        )}
        {e.source.revision ? <span>at {/^[0-9a-f]{40}$/.test(e.source.revision) ? e.source.revision.slice(0, 7) : e.source.revision}</span> : null}
        <span>· {e.capability.practiceLabel}</span>
      </p>
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="mt-1 text-[12px] font-medium text-[var(--accent-ink)] hover:underline">
        {open ? "Hide verification" : "Show verification"}
      </button>
      {open ? (
        <div className="mt-2 space-y-2">
          <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[220px_minmax(0,1fr)]">
            {FACETS.map((f) => (
              <div key={f} className="contents">
                <dt className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)]">
                  {FACET_LABEL[f]}
                </dt>
                <dd className="text-[13px] text-[var(--text-secondary)]">
                  <span className="mr-2"><Status kind={FACET_STATE[e.verification[f].state].kind} icon={false}>{FACET_STATE[e.verification[f].state].label}</Status></span>
                  {e.verification[f].detail}
                </dd>
              </div>
            ))}
          </dl>
          {e.limitations.length ? <p className="text-[13px] text-[var(--text-tertiary)]">Limits: {e.limitations.join(" ")}</p> : null}
          <p className="font-mono text-[11px] text-[var(--text-tertiary)]">Entry {e.id}</p>
        </div>
      ) : null}
    </li>
  );
}

export function EvidenceLedger({ ledger }: { ledger: LedgerEntry[] }) {
  const [all, setAll] = useState(false);
  if (!ledger.length) return <p className="text-[14px] text-[var(--text-secondary)]">No findings or measurements were recorded for this run.</p>;
  const shown = all ? ledger : ledger.slice(0, 12);
  return (
    <div>
      <ul className="divide-y divide-[var(--border-subtle)]">{shown.map((e) => <EntryRow key={e.id} e={e} />)}</ul>
      {ledger.length > 12 ? (
        <button type="button" onClick={() => setAll((v) => !v)} className="mt-2 text-[13px] font-medium text-[var(--accent-ink)] hover:underline">
          {all ? "Show fewer" : `Show all ${ledger.length} entries`}
        </button>
      ) : null}
    </div>
  );
}

export function RunRecordPanel({ report }: { report: BuilderAnalysisReport }) {
  const run = report.run;
  const check = report.narrative.claimCheck;
  if (!run) {
    return <p className="text-[14px] text-[var(--text-secondary)]">This report was made before Fydell recorded run inputs, so its inputs cannot be listed. Run the analysis again for a fully traceable report.</p>;
  }
  const narrative = run.config.narrative;
  return (
    <div className="space-y-3 text-[13px] leading-[1.55] text-[var(--text-secondary)]">
      <p>
        Inputs: {run.input.projects.length} analyzed project snapshot{run.input.projects.length === 1 ? "" : "s"}
        {run.input.projects.length ? ` (${run.input.projects.map((p) => `${p.repo} at ${p.revision.slice(0, 7)}`).join(", ")})` : ""} and {run.input.activity.length} scanned public repositor{run.input.activity.length === 1 ? "y" : "ies"}.
      </p>
      <p>
        Rules: {run.config.analysisVersion}, {run.config.ledgerVersion}. Findings, levels and capability statements come from these rules only.{" "}
        {report.narrative.source === "model" && "model" in narrative
          ? `The summary prose was written by ${narrative.provider}:${narrative.model} from the findings and checked against them.`
          : "The summary prose came from a template."}
      </p>
      {check ? (
        <p>
          Claim check: {check.proposed} model paragraph{check.proposed === 1 ? "" : "s"} proposed, {check.kept} kept.
          {check.rejected.length ? ` ${check.rejected.length} removed for citing nothing in the ledger, judging the person, claiming authorship, describing traits or saying tests ran.` : ""}
          {check.fellBackToTemplate ? " Too little survived, so the template summary is shown instead." : ""}
        </p>
      ) : null}
      <p className="font-mono text-[11px] text-[var(--text-tertiary)]">
        Run {run.runId} · inputs {run.inputHash.slice(0, 16)}
        {run.supersedes ? ` · supersedes ${run.supersedes.slice(0, 8)}` : ""}
      </p>
    </div>
  );
}

function ComparisonView({ c }: { c: VersionComparison }) {
  const lines: string[] = [];
  lines.push(c.sameInputs ? "Both runs read exactly the same inputs." : "The runs read different inputs.");
  for (const p of c.projectsAdded) lines.push(`Added project: ${p}.`);
  for (const p of c.projectsRemoved) lines.push(`Removed project: ${p}.`);
  for (const r of c.revisionsChanged) lines.push(`${r.repo} moved from revision ${r.from.slice(0, 7)} to ${r.to.slice(0, 7)}.`);
  for (const l of c.levelChanges) lines.push(`${l.label}: ${LEVEL_TEXT[l.from].toLowerCase()} to ${LEVEL_TEXT[l.to].toLowerCase()}.`);
  lines.push(`${c.entriesAdded.length} ledger entr${c.entriesAdded.length === 1 ? "y" : "ies"} added, ${c.entriesRemoved.length} removed.`);
  if (c.sameInputs && !c.levelChanges.length && !c.entriesAdded.length && !c.entriesRemoved.length) lines.push("Nothing that the findings depend on changed.");
  return (
    <ul className="mt-2 list-disc space-y-0.5 pl-5 text-[13px] text-[var(--text-secondary)]">
      {lines.map((l) => <li key={l}>{l}</li>)}
    </ul>
  );
}

/** Every stored run. Opening one reads it; nothing is regenerated. */
export function VersionHistory({ viewingId }: { viewingId: string | null }) {
  const [versions, setVersions] = useState<AnalysisVersionSummary[] | null>(null);
  const [comparison, setComparison] = useState<{ id: string; c: VersionComparison } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/profile/analysis?versions=1", { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error();
        const body = (await res.json()) as { versions: AnalysisVersionSummary[] };
        if (!cancelled) setVersions(body.versions);
      })
      .catch(() => {
        if (!cancelled) setError("Could not load the run history.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const current = versions?.find((v) => v.current) ?? null;
  async function compare(id: string) {
    if (!current) return;
    setError(null);
    const res = await fetch(`/api/profile/analysis?compare=${id},${current.id}`, { cache: "no-store" });
    const body = (await res.json().catch(() => ({}))) as { comparison?: VersionComparison; error?: string };
    if (!res.ok || !body.comparison) setError(body.error ?? "Could not compare these runs.");
    else setComparison({ id, c: body.comparison });
  }

  if (error && !versions) return <p className="text-[13px] text-[var(--text-secondary)]">{error}</p>;
  if (!versions) return <p className="text-[13px] text-[var(--text-tertiary)]">Loading run history</p>;
  if (!versions.length) return <p className="text-[13px] text-[var(--text-secondary)]">No runs yet.</p>;
  return (
    <div>
      {error ? <p className="mb-2 text-[13px] text-[var(--fydell-risk)]">{error}</p> : null}
      <ul className="divide-y divide-[var(--border-subtle)]">
        {versions.map((v) => (
          <li key={v.id} className="py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14px] text-[var(--text-primary)]">{formatDateTime(v.createdAt)}</span>
              {v.current ? <Status kind="success" icon={false}>Current</Status> : null}
              {v.status === "complete" && !v.current ? <Status kind="neutral" icon={false}>Superseded, kept unchanged</Status> : null}
              {v.status === "failed" ? <Status kind="attention" icon={false}>Failed, previous report kept</Status> : null}
              {v.status === "running" ? <Status kind="pending" icon={false}>Running</Status> : null}
              {v.id === viewingId ? <span className="text-[12px] text-[var(--text-tertiary)]">Viewing</span> : null}
              <span className="ml-auto flex gap-2">
                {v.status === "complete" && v.id !== viewingId ? (
                  <Link href={v.current ? "/app/candidate/reports" : `/app/candidate/reports?run=${v.id}`} className="text-[13px] font-medium text-[var(--accent-ink)] underline underline-offset-4">
                    Open
                  </Link>
                ) : null}
                {v.status === "complete" && !v.current && current ? (
                  <Button size="sm" variant="quiet" onClick={() => void compare(v.id)}>
                    Compare with current
                  </Button>
                ) : null}
              </span>
            </div>
            {v.status === "failed" && v.error ? <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">{v.error}</p> : null}
            {v.reportHash ? <p className="mt-0.5 font-mono text-[11px] text-[var(--text-tertiary)]">report {v.reportHash.slice(0, 16)}{v.inputHash ? ` · inputs ${v.inputHash.slice(0, 16)}` : ""}</p> : null}
            {comparison?.id === v.id ? <ComparisonView c={comparison.c} /> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
