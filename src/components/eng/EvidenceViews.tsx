"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { PanelLabel } from "@/components/ui/Panel";
import { StatusTag, type StatusTone } from "@/components/ui/StatusTag";
import { engFetch } from "./api";
import { observedSentence, STATE_LABEL } from "@/lib/eng/criteria";
import type { Citation, Finding, ProbeResult, ReportBrief } from "@/lib/eng/types";

const TONE: Record<ReportBrief["dimensions"][number]["level"], StatusTone> = {
  strong: "good",
  adequate: "active",
  weak: "risk",
  insufficient_evidence: "neutral",
  demonstrated_additional: "good",
  demonstrated: "good",
  partially_demonstrated: "active",
  concern_observed: "risk",
  not_assessed: "neutral",
};

const LEVEL = Object.fromEntries(
  (Object.keys(TONE) as ReportBrief["dimensions"][number]["level"][]).map((k) => [k, { label: STATE_LABEL[k], tone: TONE[k] }])
) as Record<ReportBrief["dimensions"][number]["level"], { label: string; tone: StatusTone }>;

const DIMENSION_LABEL: Record<Finding["dimension"], string> = {
  correctness: "Correctness",
  engineering_judgment: "Engineering judgment",
  requirement_response: "Response to the requirement change",
  work_communication: "Work communication",
};

const OUTCOME: Record<ProbeResult["outcome"], { label: string; tone: StatusTone }> = {
  passed: { label: "Passed", tone: "good" },
  failed: { label: "Failed", tone: "risk" },
  candidate_error: { label: "Code error", tone: "risk" },
  timeout: { label: "Timed out", tone: "changed" },
  output_limit: { label: "Output limit", tone: "changed" },
  no_result: { label: "No result", tone: "changed" },
};

export interface FileTarget {
  path: string;
  lineStart?: number;
  lineEnd?: number;
}

interface LoadedFile {
  path: string;
  size: number;
  text: string | null;
  truncated: boolean;
  binary: boolean;
}

export function FileViewer({ endpoint, target, onClose }: { endpoint: string; target: FileTarget; onClose: () => void }) {
  const [state, setState] = useState<{ key: string; file: LoadedFile | null; error: string | null } | null>(null);
  const key = target.path;
  useEffect(() => {
    const controller = new AbortController();
    void engFetch<{ file: LoadedFile }>(`${endpoint}?path=${encodeURIComponent(key)}`, { signal: controller.signal }).then((res) => {
      if (controller.signal.aborted) return;
      setState({ key, file: res.ok ? res.data.file : null, error: res.ok === false ? res.error : null });
    });
    return () => controller.abort();
  }, [endpoint, key]);
  const lines = state?.file?.text?.split("\n") ?? [];
  return (
    <div className="rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-deep)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-3 py-2">
        <p className="truncate font-mono text-[13px] text-[var(--text-primary)]">
          {target.path}
          {target.lineStart ? `:${target.lineStart}${target.lineEnd && target.lineEnd !== target.lineStart ? `-${target.lineEnd}` : ""}` : ""}
        </p>
        <Button size="sm" variant="quiet" onClick={onClose}>
          Close
        </Button>
      </div>
      <div className="max-h-[440px] overflow-auto">
        {!state || state.key !== key ? (
          <p className="px-3 py-3 text-app-meta text-[var(--text-secondary)]">Loading the submitted file…</p>
        ) : state.error ? (
          <p className="px-3 py-3 text-app-meta text-[var(--fydell-risk)]">{state.error}</p>
        ) : state.file?.binary ? (
          <p className="px-3 py-3 text-app-meta text-[var(--text-secondary)]">Binary file, not shown.</p>
        ) : (
          <pre className="py-2 font-mono text-[13px] leading-[1.55]">
            {lines.map((line, i) => {
              const n = i + 1;
              const hit = target.lineStart !== undefined && n >= target.lineStart && n <= (target.lineEnd ?? target.lineStart);
              return (
                <div key={n} className={hit ? "bg-[rgba(107,140,255,0.14)]" : undefined}>
                  <span className="inline-block w-12 select-none pr-3 text-right text-[var(--text-tertiary)]">{n}</span>
                  <span className="text-[var(--text-primary)]">{line}</span>
                </div>
              );
            })}
            {state.file?.truncated ? <div className="px-3 pt-2 text-[var(--text-tertiary)]">File truncated for display.</div> : null}
          </pre>
        )}
      </div>
    </div>
  );
}

function citationLabel(c: Citation): string {
  if (c.kind === "file") return `${c.ref}${c.lineStart ? `:${c.lineStart}${c.lineEnd && c.lineEnd !== c.lineStart ? `-${c.lineEnd}` : ""}` : ""}`;
  if (c.kind === "test") return `Test ${c.ref}`;
  if (c.kind === "message") return "Thread message";
  return `Handoff: ${c.ref.replace(/_/g, " ")}`;
}

export function CitationChip({ citation, onOpen }: { citation: Citation; onOpen: (c: Citation) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(citation)}
      className="rounded-[var(--radius-tag)] border border-[var(--border-default)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
    >
      {citationLabel(citation)}
    </button>
  );
}

export function ProbeTable({ results, highlight }: { results: ProbeResult[]; highlight?: string | null }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left">
        <thead className="border-b border-[var(--border-subtle)]">
          <tr>
            <th className="px-3 py-2 text-app-meta font-medium text-[var(--text-secondary)]">Check</th>
            <th className="px-3 py-2 text-app-meta font-medium text-[var(--text-secondary)]">Scope</th>
            <th className="px-3 py-2 text-app-meta font-medium text-[var(--text-secondary)]">Result</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.id} id={`probe-${r.id}`} className={`border-b border-[var(--border-subtle)] last:border-b-0 ${highlight === r.id ? "bg-[rgba(107,140,255,0.1)]" : ""}`}>
              <td className="px-3 py-2 align-top text-app-body text-[var(--text-primary)]">
                <span className="font-mono text-[13px] text-[var(--text-tertiary)]">{r.id}</span> {r.title}
                {r.outcome !== "passed" && (r.detail || r.failedChecks.length) ? (
                  <span className="mt-1 block text-app-meta text-[var(--text-secondary)]">
                    {r.detail ??
                      r.failedChecks
                        .slice(0, 2)
                        .map((f) => `${f.path}: expected ${JSON.stringify(f.expected)}, got ${JSON.stringify(f.actual)}`)
                        .join("; ")}
                  </span>
                ) : null}
              </td>
              <td className="px-3 py-2 align-top text-app-meta text-[var(--text-secondary)]">
                {r.visibility === "public" ? "Public test" : "Hidden check"}
                {r.phase === "update" ? ", after update" : ""}
              </td>
              <td className="px-3 py-2 align-top">
                <StatusTag tone={OUTCOME[r.outcome].tone}>{OUTCOME[r.outcome].label}</StatusTag>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export interface ThreadMessage {
  id: string;
  sender: "candidate" | "teammate";
  teammate_id: string | null;
  body: string;
  created_at: string;
}

export function ReportView({
  brief,
  findings,
  results,
  messages,
  handoff,
  aiDisclosure,
  fileEndpoint,
  teammates,
  renderFindingAction,
}: {
  brief: ReportBrief;
  findings: Finding[];
  results: ProbeResult[];
  messages: ThreadMessage[];
  handoff: Record<string, string>;
  aiDisclosure: string;
  fileEndpoint: string;
  teammates: Record<string, string>;
  renderFindingAction?: (finding: Finding) => React.ReactNode;
}) {
  const [file, setFile] = useState<FileTarget | null>(null);
  const [focus, setFocus] = useState<{ kind: Citation["kind"]; ref: string } | null>(null);

  function open(c: Citation) {
    if (c.kind === "file") {
      setFile({ path: c.ref, lineStart: c.lineStart, lineEnd: c.lineEnd });
      return;
    }
    setFocus({ kind: c.kind, ref: c.ref });
    const id = c.kind === "test" ? `probe-${c.ref}` : c.kind === "message" ? `msg-${c.ref}` : `handoff-${c.ref}`;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="grid gap-6">
      <section>
        <p className="text-app-body leading-[1.65] text-[var(--text-primary)]">{brief.summary}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {brief.dimensions.map((d) => (
            <div key={d.key} className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-app-body font-medium text-[var(--text-primary)]">{DIMENSION_LABEL[d.key]}</p>
                <StatusTag tone={LEVEL[d.level].tone}>{LEVEL[d.level].label}</StatusTag>
              </div>
              <p className="mt-1.5 text-app-meta leading-[1.55] text-[var(--text-secondary)]">{d.rationale}</p>
            </div>
          ))}
        </div>
      </section>

      {brief.criteria?.length ? (
        <section>
          <PanelLabel>Criteria for this task</PanelLabel>
          <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">
            Each state describes this submission against a defined criterion. Not assessed means there was no opportunity to judge, not a low result. There is no overall score.
          </p>
          <ul className="mt-2 divide-y divide-[var(--border-subtle)] rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
            {brief.criteria.map((c) => (
              <li key={c.id} className="grid gap-1 px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-app-body font-medium text-[var(--text-primary)]">{c.label}</p>
                  <StatusTag tone={LEVEL[c.state].tone}>{LEVEL[c.state].label}</StatusTag>
                </div>
                {c.observed ? <p className="text-app-meta text-[var(--text-secondary)]">{observedSentence(c.observed)}.</p> : null}
                {c.rationale ? <p className="text-app-meta leading-[1.55] text-[var(--text-secondary)]">{c.rationale}</p> : null}
                <p className="text-app-meta text-[var(--text-tertiary)]">Not covered: {c.notCovered}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-5 sm:grid-cols-2">
        {(
          [
            ["Strengths", brief.strengths],
            ["Gaps", brief.gaps],
            ["Limitations of this evidence", brief.limitations],
            ["Suggested follow-up questions", brief.followUps],
          ] as const
        ).map(([label, items]) =>
          items.length ? (
            <div key={label}>
              <PanelLabel>{label}</PanelLabel>
              <ul className="mt-2 grid list-disc gap-1.5 pl-4 text-app-body leading-[1.55] text-[var(--text-secondary)]">
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null
        )}
      </section>

      <section>
        <PanelLabel>Findings and their evidence</PanelLabel>
        <ul className="mt-2 grid gap-3">
          {findings.map((f) => (
            <li key={f.id} className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusTag tone={f.kind === "strength" ? "good" : f.kind === "gap" ? "risk" : "neutral"}>{f.kind[0].toUpperCase() + f.kind.slice(1)}</StatusTag>
                <span className="text-app-meta text-[var(--text-tertiary)]">
                  {DIMENSION_LABEL[f.dimension]} · {f.basis === "observed" ? "Observed" : "Reviewer hypothesis, not observed"}
                </span>
                {renderFindingAction ? <span className="ml-auto">{renderFindingAction(f)}</span> : null}
              </div>
              <p className="mt-1.5 text-app-body leading-[1.6] text-[var(--text-primary)]">{f.statement}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.citations.map((c, i) => (
                  <CitationChip key={`${c.kind}-${c.ref}-${i}`} citation={c} onOpen={open} />
                ))}
              </div>
            </li>
          ))}
        </ul>
        {file ? (
          <div className="mt-3">
            <FileViewer endpoint={fileEndpoint} target={file} onClose={() => setFile(null)} />
          </div>
        ) : null}
      </section>

      <section>
        <PanelLabel>Trusted checks</PanelLabel>
        <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">Run against the submitted archive in an isolated environment. A platform failure is never shown as a code failure.</p>
        <div className="mt-2">
          <ProbeTable results={results} highlight={focus?.kind === "test" ? focus.ref : null} />
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div>
          <PanelLabel>Handoff</PanelLabel>
          <dl className="mt-2 grid gap-3">
            {Object.entries(handoff).map(([key, value]) =>
              value ? (
                <div key={key} id={`handoff-${key}`} className={focus?.kind === "handoff" && focus.ref === key ? "rounded-[var(--radius-control)] bg-[rgba(107,140,255,0.1)] p-2" : undefined}>
                  <dt className="text-app-meta capitalize text-[var(--text-tertiary)]">{key.replace(/_/g, " ")}</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-app-body leading-[1.55] text-[var(--text-secondary)]">{value}</dd>
                </div>
              ) : null
            )}
            <div id="handoff-ai_use" className={focus?.kind === "handoff" && focus.ref === "ai_use" ? "rounded-[var(--radius-control)] bg-[rgba(107,140,255,0.1)] p-2" : undefined}>
              <dt className="text-app-meta text-[var(--text-tertiary)]">AI assistance (candidate&apos;s statement, not observed)</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-app-body leading-[1.55] text-[var(--text-secondary)]">{aiDisclosure || "Nothing stated."}</dd>
            </div>
          </dl>
        </div>
        <div>
          <PanelLabel>Team thread</PanelLabel>
          <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">Teammates are simulated and answer from authored content.</p>
          <ol className="mt-2 grid max-h-[420px] gap-2 overflow-auto pr-1">
            {messages.map((m) => (
              <li
                key={m.id}
                id={`msg-${m.id}`}
                className={`rounded-[var(--radius-control)] px-2.5 py-2 text-app-meta leading-[1.55] ${
                  focus?.kind === "message" && focus.ref === m.id ? "bg-[rgba(107,140,255,0.14)]" : m.sender === "candidate" ? "bg-[var(--surface-hover)]" : ""
                }`}
              >
                <span className="font-medium text-[var(--text-primary)]">{m.sender === "candidate" ? "Candidate" : teammates[m.teammate_id ?? ""] ?? "Teammate"}</span>
                <span className="ml-2 text-[var(--text-tertiary)]">{new Date(m.created_at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                <p className="mt-0.5 whitespace-pre-wrap text-[var(--text-secondary)]">{m.body}</p>
              </li>
            ))}
            {messages.length === 0 ? <li className="text-app-meta text-[var(--text-tertiary)]">No messages were sent.</li> : null}
          </ol>
        </div>
      </section>
    </div>
  );
}
