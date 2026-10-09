"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { DetailList, Notice, Status, type StatusKind } from "@/components/ui/report";
import Link from "next/link";
import { NO_GITHUB_LOGIN_LIMIT, type AnalysisRow, type BuilderAnalysisReport, type Dimension, type EvidenceLevel, type SignalRef } from "@/lib/builder-analysis/types";
import { CapabilityStatements, EvidenceLedger, RunRecordPanel, VersionHistory } from "./BuilderAnalysisEvidence";

const LEVEL: Record<EvidenceLevel, { label: string; kind: StatusKind }> = {
  strong: { label: "Strong evidence", kind: "success" },
  developing: { label: "Developing evidence", kind: "pending" },
  limited: { label: "Limited evidence", kind: "attention" },
  insufficient_evidence: { label: "Insufficient evidence", kind: "neutral" },
};

const LEVEL_FILL: Record<EvidenceLevel, number> = { strong: 4, developing: 3, limited: 2, insufficient_evidence: 0 };

function formatDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function anchorFor(id: string): string {
  return `ba-${id.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

function H2({ id, children, hint }: { id: string; children: React.ReactNode; hint?: string }) {
  return (
    <header className="mb-4">
      <h2 id={id} className="scroll-mt-24 text-[17px] font-semibold tracking-[-0.015em] text-[var(--text-primary)]">
        {children}
      </h2>
      {hint ? <p className="mt-1 max-w-[68ch] text-[14px] leading-[1.55] text-[var(--text-secondary)]">{hint}</p> : null}
    </header>
  );
}

function RefLink({ r }: { r: SignalRef }) {
  const body = (
    <>
      <span className="font-mono text-app-meta text-[var(--text-tertiary)]">{r.repo ?? "profile"}</span>
      <span className="text-[13px] text-[var(--text-secondary)]">{r.label}</span>
    </>
  );
  return r.url ? (
    <a href={r.url} target="_blank" rel="noreferrer noopener" className="group flex flex-wrap items-baseline gap-x-2 rounded-[4px] hover:text-[var(--text-primary)]">
      {body}
      <ArrowUpRight className="h-3 w-3 self-center text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]" aria-hidden />
    </a>
  ) : (
    <span className="flex flex-wrap items-baseline gap-x-2">{body}</span>
  );
}

function LevelMeter({ level }: { level: EvidenceLevel }) {
  return (
    <span className="inline-flex gap-[3px]" aria-hidden>
      {[1, 2, 3, 4].map((i) => (
        <span key={i} className="h-[10px] w-[4px] rounded-[1px]" style={{ background: i <= LEVEL_FILL[level] ? "var(--accent)" : "var(--border-default)" }} />
      ))}
    </span>
  );
}

function DimensionBlock({ d }: { d: Dimension }) {
  const [open, setOpen] = useState(false);
  return (
    <article id={anchorFor(`dimension:${d.id}`)} className="scroll-mt-24 border-t border-[var(--border-subtle)] py-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <LevelMeter level={d.level} />
          <h3 className="text-[15px] font-semibold text-[var(--text-primary)]">{d.label}</h3>
        </div>
        <Status kind={LEVEL[d.level].kind} icon={false}>{LEVEL[d.level].label}</Status>
      </div>
      <p className="mt-1 text-[13px] text-[var(--text-tertiary)]">{d.question}</p>
      <p className="mt-2 max-w-[70ch] text-[15px] leading-[1.6] text-[var(--text-primary)]">{d.summary}</p>
      {d.practices.length ? (
        <ul className="mt-3 space-y-3">
          {d.practices.map((p) => (
            <li key={p.key}>
              <p className="text-[14px] font-medium text-[var(--text-primary)]">
                {p.label} <span className="font-normal text-[var(--text-secondary)]">in {p.repos.length} project{p.repos.length === 1 ? "" : "s"}</span>
              </p>
              <div className="mt-1 space-y-0.5 pl-3">
                {p.refs.slice(0, open ? 8 : 2).map((r) => <RefLink key={r.id} r={r} />)}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {d.practices.some((p) => p.refs.length > 2) ? (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 text-[13px] font-medium text-[var(--accent-ink)] hover:underline">
          {open ? "Show less evidence" : "Show all evidence"}
        </button>
      ) : null}
      {d.notObserved.length || d.limits.length ? (
        <details className="mt-3 text-[13px] text-[var(--text-secondary)]">
          <summary className="cursor-pointer select-none">Not observed and limits</summary>
          {d.notObserved.length ? <p className="mt-2">Not observed: {d.notObserved.join(", ")}. Missing evidence is not proof of absence.</p> : null}
          {d.limits.map((l) => (
            <p key={l} className="mt-1">
              {l}
              {l === NO_GITHUB_LOGIN_LIMIT ? (
                <>
                  {" "}
                  <Link href="/app/candidate/profile" className="font-medium text-[var(--accent-ink)] underline underline-offset-4">
                    Add it under Edit profile
                  </Link>
                  , then run the analysis again.
                </>
              ) : null}
            </p>
          ))}
        </details>
      ) : null}
    </article>
  );
}

function ActivityBars({ months }: { months: BuilderAnalysisReport["activityByMonth"] }) {
  const max = Math.max(1, ...months.map((m) => m.commits));
  if (months.every((m) => m.commits === 0)) return <p className="text-[14px] text-[var(--text-secondary)]">No commits attributed to you were found in the last twelve months of sampled history.</p>;
  return (
    <figure>
      <div className="flex h-[96px] items-end gap-1.5" role="img" aria-label={`Commits per month: ${months.map((m) => `${m.month} ${m.commits}`).join(", ")}`}>
        {months.map((m) => (
          <div key={m.month} className="flex flex-1 flex-col items-center justify-end" title={`${m.month}: ${m.commits} commits`}>
            <div className="w-full rounded-t-[2px]" style={{ height: `${Math.max(m.commits ? 4 : 1, (m.commits / max) * 88)}px`, background: m.commits ? "var(--accent)" : "var(--border-subtle)" }} />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex gap-1.5">
        {months.map((m, i) => (
          <span key={m.month} className="flex-1 text-center font-mono text-app-marker text-[var(--text-tertiary)]">{i % 3 === 0 ? m.month.slice(2) : ""}</span>
        ))}
      </div>
      <figcaption className="mt-2 text-[13px] text-[var(--text-secondary)]">Commits attributed to you by GitHub, sampled up to 100 per repository. Merge commits excluded.</figcaption>
    </figure>
  );
}

function Report({ report }: { report: BuilderAnalysisReport }) {
  const refs = useMemo(() => {
    const map = new Map<string, { label: string; anchor: string }>();
    for (const d of report.dimensions) {
      const anchor = anchorFor(`dimension:${d.id}`);
      map.set(`dimension:${d.id}`, { label: d.label, anchor });
      for (const p of d.practices) for (const r of p.refs) if (!map.has(r.id)) map.set(r.id, { label: p.label, anchor });
    }
    for (const s of report.strengths) map.set(s.id, { label: s.title, anchor: anchorFor(s.id) });
    for (const p of report.patterns) map.set(p.id, { label: p.title, anchor: anchorFor(p.id) });
    for (const g of report.growth) {
      map.set(g.id, { label: g.title, anchor: anchorFor(g.id) });
      for (const r of g.refs) if (!map.has(r.id)) map.set(r.id, { label: g.title, anchor: anchorFor(g.id) });
    }
    return map;
  }, [report]);
  const citations = (ids: string[]) => {
    const byLabel = new Map<string, { label: string; anchor: string }>();
    for (const id of ids) {
      const ref = refs.get(id);
      if (ref && !byLabel.has(ref.label)) byLabel.set(ref.label, ref);
    }
    return [...byLabel.values()];
  };

  return (
    <div className="space-y-12">
      <section aria-labelledby="ba-summary">
        <H2 id="ba-summary">Summary</H2>
        <p className="max-w-[68ch] text-[17px] leading-[1.55] text-[var(--text-primary)]">{report.narrative.summary}</p>
        <div className="mt-4 max-w-[68ch] space-y-3">
          {report.narrative.paragraphs.map((p, i) => (
            <p key={i} className="text-[15px] leading-[1.65] text-[var(--text-secondary)]">
              {p.text}{" "}
              {citations(p.refs).map((ref) => (
                <a key={ref.label} href={`#${ref.anchor}`} className="mr-1 inline-flex rounded-[4px] bg-[var(--surface-panel)] px-1.5 py-[1px] align-[1px] text-app-marker font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  {ref.label}
                </a>
              ))}
            </p>
          ))}
        </div>
        <p className="mt-3 text-app-meta text-[var(--text-tertiary)]">
          {report.narrative.source === "model" ? "Narrative written by a model from the evidence below; every paragraph cites it." : "Narrative assembled from the evidence below."}
        </p>
      </section>

      {report.capabilityStatements?.length ? (
        <section aria-labelledby="ba-capabilities">
          <H2 id="ba-capabilities" hint="What was observed in specific work, at which revision, and what was not assessed. Not assessed is never a negative finding.">
            What the evidence shows
          </H2>
          <CapabilityStatements statements={report.capabilityStatements} />
        </section>
      ) : null}

      <section aria-labelledby="ba-areas">
        <H2 id="ba-areas" hint="Levels describe how much evidence was found, never how good you are.">Evidence by area</H2>
        <div>{report.dimensions.map((d) => <DimensionBlock key={d.id} d={d} />)}</div>
      </section>

      {report.strengths.length ? (
        <section aria-labelledby="ba-strengths">
          <H2 id="ba-strengths">Strengths</H2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {report.strengths.map((s) => (
              <li key={s.id} id={anchorFor(s.id)} className="scroll-mt-24 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-raised,#fff)] p-4">
                <p className="text-[15px] font-semibold text-[var(--text-primary)]">{s.title}</p>
                <p className="mt-1 text-[14px] leading-[1.55] text-[var(--text-secondary)]">{s.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.patterns.length ? (
        <section aria-labelledby="ba-patterns">
          <H2 id="ba-patterns" hint="Practices seen in two or more projects.">Recurring patterns</H2>
          <ul className="divide-y divide-[var(--border-subtle)]">
            {report.patterns.map((p) => (
              <li key={p.id} id={anchorFor(p.id)} className="scroll-mt-24 py-3">
                <p className="text-[14px] font-medium text-[var(--text-primary)]">{p.title}</p>
                <p className="mt-0.5 text-[13px] text-[var(--text-secondary)]">{p.detail}</p>
                <p className="mt-1 font-mono text-app-meta text-[var(--text-tertiary)]">{p.repos.join("  ·  ")}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {report.growth.length ? (
        <section aria-labelledby="ba-growth">
          <H2 id="ba-growth" hint="Concrete next steps. Each is marked as an observation or an inference.">Where to grow</H2>
          <ol className="space-y-5">
            {report.growth.map((g, i) => (
              <li key={g.id} id={anchorFor(g.id)} className="scroll-mt-24 grid grid-cols-[28px_minmax(0,1fr)] gap-x-3">
                <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-panel)] text-app-meta font-semibold text-[var(--text-secondary)] tabular-nums">{i + 1}</span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[15px] font-semibold text-[var(--text-primary)]">{g.title}</p>
                    <Status kind="neutral" icon={false}>{g.basis === "observation" ? "Observation" : "Inference"}</Status>
                  </div>
                  <p className="mt-1 text-[14px] leading-[1.55] text-[var(--text-secondary)]">{g.observation}</p>
                  <p className="mt-1 text-[14px] leading-[1.55] text-[var(--text-secondary)]">{g.whyItMatters}</p>
                  <p className="mt-2 text-[14px] leading-[1.55] text-[var(--text-primary)]"><span className="font-medium">Next step: </span>{g.nextStep}</p>
                  {g.refs.length ? <div className="mt-2 space-y-0.5">{g.refs.slice(0, 3).map((r) => <RefLink key={r.id} r={r} />)}</div> : null}
                </div>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section aria-labelledby="ba-projects">
        <H2 id="ba-projects" hint="Imported projects were analyzed at code level; scanned repositories by structure and history only.">Projects</H2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[14px]">
            <thead>
              <tr className="border-b border-[var(--border-default)] text-app-meta text-[var(--text-tertiary)]">
                <th className="py-2 pr-4 font-medium">Repository</th>
                <th className="py-2 pr-4 font-medium">Depth</th>
                <th className="py-2 pr-4 font-medium">Practices</th>
                <th className="py-2 pr-4 font-medium tabular-nums">Your commits</th>
                <th className="py-2 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {report.projects.map((p) => (
                <tr key={p.repo} className="border-b border-[var(--border-subtle)] align-top">
                  <td className="py-2.5 pr-4">
                    {p.url ? <a href={p.url} target="_blank" rel="noreferrer noopener" className="font-mono text-[13px] text-[var(--text-primary)] hover:underline">{p.repo}</a> : <span className="font-mono text-[13px]">{p.repo}</span>}
                    {p.language ? <span className="ml-2 text-app-meta text-[var(--text-tertiary)]">{p.language}</span> : null}
                  </td>
                  <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{p.depth === "deep" ? "Code analyzed" : "Scanned"}</td>
                  <td className="py-2.5 pr-4 text-[var(--text-secondary)]">{p.practices.length ? p.practices.slice(0, 3).join(", ") + (p.practices.length > 3 ? ` +${p.practices.length - 3}` : "") : "None observed"}</td>
                  <td className="py-2.5 pr-4 tabular-nums text-[var(--text-secondary)]">{p.commitsByYou ?? "Not read"}</td>
                  <td className="py-2.5 text-[var(--text-secondary)]">{formatDate(p.lastActiveAt) || "Unknown"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="ba-activity">
        <H2 id="ba-activity">Activity over the last year</H2>
        <ActivityBars months={report.activityByMonth} />
      </section>

      <section aria-labelledby="ba-scope">
        <H2 id="ba-scope">Scope and limits</H2>
        <DetailList
          rows={[
            { label: "Imported projects", value: String(report.scope.deepProjects) },
            { label: "Public repositories scanned", value: String(report.scope.scannedRepos) },
            { label: "Forks excluded", value: String(report.scope.forksExcluded) },
            { label: "Commits sampled", value: String(report.scope.commitsSampled) },
            { label: "Generated", value: formatDate(report.generatedAt) },
          ]}
        />
        {report.scope.skipped.length ? (
          <details className="mt-3 text-[13px] text-[var(--text-secondary)]">
            <summary className="cursor-pointer select-none">{report.scope.skipped.length} not scanned</summary>
            <ul className="mt-2 space-y-0.5">
              {report.scope.skipped.map((s) => <li key={s.repo}><span className="font-mono">{s.repo}</span>: {s.reason}</li>)}
            </ul>
          </details>
        ) : null}
        <ul className="mt-4 list-disc space-y-1 pl-5 text-[13px] leading-[1.55] text-[var(--text-secondary)]">
          {report.limits.map((l) => <li key={l}>{l}</li>)}
        </ul>
      </section>

      {report.ledger ? (
        <section aria-labelledby="ba-ledger">
          <H2 id="ba-ledger" hint="Every finding this report rests on. Each one keeps code existing, code inspected, tests existing, tests run, tests passing, production behaviour, your claim and attribution separate.">
            Evidence ledger
          </H2>
          <EvidenceLedger ledger={report.ledger} />
        </section>
      ) : null}

      <section aria-labelledby="ba-run">
        <H2 id="ba-run">How this report was made</H2>
        <RunRecordPanel report={report} />
      </section>
    </div>
  );
}

export default function BuilderAnalysisView({
  initial,
  lastReport,
  hasSources,
  viewing = null,
}: {
  initial: AnalysisRow | null;
  lastReport: BuilderAnalysisReport | null;
  hasSources: boolean;
  /** A specific stored run the engineer opened from the history. Read as stored. */
  viewing?: AnalysisRow | null;
}) {
  if (viewing?.report) {
    return (
      <div>
        <Notice>
          You are viewing a superseded run from {formatDate(viewing.report.generatedAt)}. It is kept exactly as it was produced.{" "}
          <Link href="/app/candidate/reports" className="font-medium underline underline-offset-4">Back to the current report</Link>
        </Notice>
        <div className="mt-8"><Report report={viewing.report} /></div>
        <section aria-labelledby="ba-history" className="mt-12">
          <H2 id="ba-history">Run history</H2>
          <VersionHistory viewingId={viewing.id} />
        </section>
      </div>
    );
  }
  return <CurrentAnalysis initial={initial} lastReport={lastReport} hasSources={hasSources} />;
}

function CurrentAnalysis({ initial, lastReport, hasSources }: { initial: AnalysisRow | null; lastReport: BuilderAnalysisReport | null; hasSources: boolean }) {
  const [row, setRow] = useState<AnalysisRow | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const running = row?.status === "running";

  const refresh = useCallback(async () => {
    const res = await fetch("/api/profile/analysis", { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { analysis: AnalysisRow | null };
    setRow(body.analysis);
  }, []);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(refresh, 3000);
    return () => clearInterval(t);
  }, [running, refresh]);

  async function start() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/profile/analysis", { method: "POST", headers: { "Content-Type": "application/json" } });
      const body = (await res.json().catch(() => ({}))) as { analysis?: AnalysisRow | null; error?: string };
      if (!res.ok) setError(body.error ?? "Could not start the analysis.");
      else if (body.analysis) setRow(body.analysis);
    } catch {
      setError("Could not reach Fydell. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  }

  const shownReport = row?.status === "complete" && row.report ? row.report : lastReport;
  const isPrevious = !!shownReport && row?.status !== "complete";

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--border-subtle)] pb-6">
        <div className="min-w-0 max-w-[68ch]">
          {shownReport ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--accent-soft)] px-2.5 py-[3px] text-app-meta font-semibold text-[var(--accent-ink)]">{shownReport.workingStyle.label}</span>
                <span className="text-app-meta text-[var(--text-tertiary)]">Inference from the evidence below</span>
              </div>
              <p className="mt-3 text-[20px] font-semibold leading-[1.35] tracking-[-0.02em] text-[var(--text-primary)]">{shownReport.headline}</p>
              <p className="mt-1.5 text-[14px] text-[var(--text-secondary)]">{shownReport.workingStyle.description}</p>
            </>
          ) : (
            <p className="text-[15px] leading-[1.6] text-[var(--text-secondary)]">
              Reads your imported projects and public GitHub repositories, then describes how you build: which practices repeat, where the evidence is thin, and what to do next. Private to you. Nothing here is shared unless you choose to.
            </p>
          )}
        </div>
        <Button onClick={start} disabled={starting || running || !hasSources} variant={shownReport ? "secondary" : "primary"} size="sm">
          <RotateCcw className={`h-3.5 w-3.5 ${running ? "animate-spin" : ""}`} aria-hidden />
          {running ? "Analyzing" : shownReport ? "Run again" : "Run analysis"}
        </Button>
      </div>

      <div className="mt-6 space-y-4" aria-live="polite">
        {!hasSources ? (
          <Notice tone="attention">
            <Link href="/app/candidate/profile" className="font-medium underline underline-offset-4">Link your GitHub username</Link> or{" "}
            <Link href="/app/candidate/work-record" className="font-medium underline underline-offset-4">import a project</Link> first. The analysis only reads what you connect.
          </Notice>
        ) : null}
        {error ? <Notice tone="error">{error}</Notice> : null}
        {running ? <Notice>Reading repositories and measuring practices. This usually takes under a minute; you can leave this page.</Notice> : null}
        {row?.status === "failed" ? <Notice tone="error">{row.error ?? "The analysis did not finish."}</Notice> : null}
      </div>

      {isPrevious && shownReport ? <p className="mt-4 text-[13px] text-[var(--text-secondary)]">Showing your previous analysis from {formatDate(shownReport.generatedAt)}.</p> : null}
      {shownReport ? <div className="mt-8"><Report report={shownReport} /></div> : null}
      {row ? (
        <section aria-labelledby="ba-history" className="mt-12">
          <H2 id="ba-history" hint="Each run is stored unchanged. A new run only replaces the current report when it finishes; a failed run keeps the previous one.">Run history</H2>
          <VersionHistory key={`${row.id}:${row.status}`} viewingId={row.status === "complete" ? row.id : null} />
        </section>
      ) : null}
    </div>
  );
}
