"use client";

import { useState } from "react";
import { ArrowRight, Check, FileText, MessageSquare, Repeat, Search, TriangleAlert, Users } from "lucide-react";
import {
  SAMPLE_BRIEF,
  SAMPLE_BRIEF_RAIL,
  SAMPLE_CLAIMS,
  SAMPLE_COUNTEREVIDENCE,
  SAMPLE_EVIDENCE_TIMELINE,
  SAMPLE_INTERVIEW_PLAN,
  SAMPLE_LINEAGE_CLAIM,
  SAMPLE_LINEAGE_EDGES,
  SAMPLE_LINEAGE_NODES,
  SAMPLE_SUPPORTING_EVIDENCE,
} from "./sample-artifacts";
import { StatusDot, TimelineMarker } from "./sandbox-ui";

type Tab = "brief" | "graph" | "plan";

const REASON_ICONS = [Search, Repeat, Users] as const;

export function SandboxEvidence() {
  const [tab, setTab] = useState<Tab>("graph");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "brief", label: "Decision brief" },
    { id: "graph", label: "Evidence graph" },
    { id: "plan", label: "Interview plan" },
  ];

  return (
    <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_290px]">
      <section className="min-w-0">
        <h1 className="text-app-page">Evidence graph</h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-app-body text-[var(--text-secondary)]">
          <span>Candidate 01 · Solutions Engineer · Acme rollout</span>
          <StatusDot tone="good" label="Analysis complete" />
        </p>

        <div
          role="tablist"
          aria-label="Evidence views"
          className="mt-6 flex gap-6 border-b border-[var(--border-subtle)]"
        >
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              onClick={() => setTab(entry.id)}
              className={`-mb-px border-b-2 pb-2.5 text-app-body ${
                tab === entry.id
                  ? "border-[var(--text-primary)] font-medium text-[var(--text-primary)]"
                  : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {tab === "graph" ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)]">
            <div>
              <p className="text-app-meta text-[var(--text-tertiary)]">Evidence timeline</p>
              <ol className="mt-3">
                {SAMPLE_EVIDENCE_TIMELINE.map((row, index) => (
                  <li key={row.label} className="grid grid-cols-[20px_minmax(0,1fr)] gap-3">
                    <TimelineMarker state={row.state} last={index === SAMPLE_EVIDENCE_TIMELINE.length - 1} />
                    <div
                      className={`pb-4 ${
                        row.state === "current"
                          ? "-mx-2 rounded-[var(--radius-control)] bg-[var(--surface-selected)] px-2 pt-0.5"
                          : ""
                      }`}
                    >
                      <p className="tabular-nums text-app-meta text-[var(--text-tertiary)]">{row.time}</p>
                      <p className="text-app-body text-[var(--text-secondary)]">{row.label}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="min-w-0">
              <p className="text-app-meta text-[var(--text-tertiary)]">Evidence lineage</p>
              <div className="mt-3 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-4 py-3">
                <p className="text-app-meta text-[var(--text-tertiary)]">Claim</p>
                <p className="mt-1 text-app-body text-[var(--text-primary)]">{SAMPLE_LINEAGE_CLAIM}</p>
              </div>

              <LineageGraph selected={selectedNode} onSelect={setSelectedNode} />

              <div className="mt-5 grid gap-6 border-t border-[var(--border-subtle)] pt-5 sm:grid-cols-2">
                <div>
                  <p className="text-app-body font-medium" style={{ color: "var(--color-good)" }}>
                    Supporting evidence
                  </p>
                  <p className="mt-2 text-app-meta text-[var(--text-secondary)]">{SAMPLE_SUPPORTING_EVIDENCE.body}</p>
                  <p className="mt-3 text-app-meta text-[var(--text-tertiary)]">Sources</p>
                  <ul className="mt-1.5 space-y-1">
                    {SAMPLE_SUPPORTING_EVIDENCE.sources.map((source) => (
                      <li key={source} className="text-app-meta" style={{ color: "var(--color-evidence)" }}>
                        • {source}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-app-body font-medium" style={{ color: "var(--color-risk)" }}>
                    Counterevidence
                  </p>
                  <p className="mt-2 text-app-meta text-[var(--text-secondary)]">{SAMPLE_COUNTEREVIDENCE.body}</p>
                  <p className="mt-3 text-app-meta text-[var(--text-tertiary)]">Source</p>
                  <ul className="mt-1.5 space-y-1">
                    {SAMPLE_COUNTEREVIDENCE.sources.map((source) => (
                      <li key={source} className="text-app-meta" style={{ color: "var(--color-evidence)" }}>
                        • {source}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {tab === "brief" ? (
          <div className="mt-6 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
            <div className="border-b border-[var(--border-subtle)] px-5 py-3">
              <h2 className="text-app-section">Evidence</h2>
            </div>
            <ul>
              {SAMPLE_CLAIMS.map((claim) => (
                <li key={claim.id} className="border-b border-[var(--border-subtle)] px-5 py-4 last:border-b-0">
                  <p className="text-app-meta text-[var(--text-tertiary)]">
                    {claim.competency} ·{" "}
                    <span
                      style={{
                        color: claim.direction === "supports" ? "var(--color-good)" : "var(--color-risk)",
                      }}
                    >
                      {claim.direction === "supports" ? "Supporting evidence" : "Counterevidence"}
                    </span>{" "}
                    · {claim.confidence} confidence
                  </p>
                  <p className="mt-1 text-app-body">{claim.claim}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-[var(--border-subtle)] px-5 py-4">
              <p className="text-app-meta text-[var(--text-tertiary)]">Concerns</p>
              <ul className="mt-2 space-y-1.5">
                {SAMPLE_BRIEF.concerns.map((concern) => (
                  <li key={concern} className="text-app-body text-[var(--text-secondary)]">
                    • {concern}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        {tab === "plan" ? (
          <div className="mt-6 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-subtle)]">
            {SAMPLE_INTERVIEW_PLAN.map((row) => (
              <div key={row.focus} className="border-b border-[var(--border-subtle)] px-5 py-4 last:border-b-0">
                <p className="text-app-meta text-[var(--text-tertiary)]">{row.focus}</p>
                <p className="mt-1 text-app-body text-[var(--text-primary)]">{row.question}</p>
                <p className="mt-1.5 text-app-meta text-[var(--text-secondary)]">{row.why}</p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <aside className="min-w-0">
        <h2 className="text-app-section">Decision brief</h2>
        <p className="mt-4 text-app-meta text-[var(--text-tertiary)]">Recommendation</p>
        <p className="mt-1 text-[1.375rem] font-medium leading-tight tracking-[-0.018em]">
          {SAMPLE_BRIEF_RAIL.recommendation}
        </p>

        <p className="mt-5 text-app-meta text-[var(--text-tertiary)]">Why interview</p>
        <dl className="mt-3 space-y-3.5">
          {SAMPLE_BRIEF_RAIL.reasons.map((reason, index) => {
            const Icon = REASON_ICONS[index] ?? Search;
            return (
              <div key={reason.competency} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2.5">
                <Icon className="mt-0.5 h-4 w-4 text-[var(--text-tertiary)]" strokeWidth={1.7} aria-hidden />
                <div>
                  <dt className="text-app-body text-[var(--text-primary)]">{reason.competency}</dt>
                  <dd className="mt-0.5 text-app-meta text-[var(--text-secondary)]">{reason.detail}</dd>
                </div>
              </div>
            );
          })}
        </dl>

        <p className="mt-5 text-app-meta text-[var(--text-tertiary)]">Remaining uncertainty</p>
        <p className="mt-1.5 text-app-body text-[var(--text-secondary)]">{SAMPLE_BRIEF_RAIL.remainingUncertainty}</p>

        <p className="mt-5 text-app-meta text-[var(--text-tertiary)]">Ask next</p>
        <p className="mt-1.5 text-app-body text-[var(--text-secondary)]">{SAMPLE_BRIEF_RAIL.askNext}</p>

        <p className="mt-6 border-t border-[var(--border-subtle)] pt-4 text-app-meta text-[var(--text-tertiary)]">
          {SAMPLE_BRIEF_RAIL.reviewLabel}
        </p>
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-app-body" style={{ color: "var(--color-good)" }}>
          <Check className="h-4 w-4" strokeWidth={2.2} aria-hidden />
          {SAMPLE_BRIEF_RAIL.reviewDecision}
        </p>
        <p className="mt-3 text-app-meta text-[var(--text-tertiary)]">{SAMPLE_BRIEF_RAIL.meta}</p>
      </aside>
    </div>
  );
}

function LineageGraph({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const node = (id: string) => SAMPLE_LINEAGE_NODES.find((entry) => entry.id === id);
  const detail = selected ? node(selected) : null;
  const related = selected
    ? SAMPLE_LINEAGE_EDGES.filter((edge) => edge.from === selected || edge.to === selected)
    : [];

  return (
    <div className="mt-4">
      <div className="grid items-center gap-x-4 gap-y-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="hidden sm:block" />
        <LineageNode id="initial" selected={selected} onSelect={onSelect} />
        <div className="hidden sm:block" />

        <EdgeLabel label="limits" />
        <EdgeLabel label="supports" vertical />
        <EdgeLabel label="supports" />

        <LineageNode id="constraint" selected={selected} onSelect={onSelect} />
        <LineageNode id="revised" selected={selected} onSelect={onSelect} />
        <LineageNode id="defense" selected={selected} onSelect={onSelect} />

        <div className="hidden sm:block" />
        <EdgeLabel label="counters" vertical />
        <div className="hidden sm:block" />

        <div className="hidden sm:block" />
        <LineageNode id="unverified" selected={selected} onSelect={onSelect} />
        <div className="hidden sm:block" />
      </div>

      {detail ? (
        <div className="mt-4 rounded-[var(--radius-panel)] border border-[var(--border-subtle)] bg-[var(--surface-hover)] px-4 py-3">
          <div className="flex items-baseline gap-3">
            <p className="text-app-body font-medium">{detail.title}</p>
            <button
              type="button"
              onClick={() => onSelect(null)}
              className="ml-auto text-app-meta text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              Close
            </button>
          </div>
          <p className="mt-1 text-app-meta" style={{ color: "var(--color-evidence)" }}>
            {detail.source}
          </p>
          <ul className="mt-2.5 space-y-1">
            {related.map((edge) => (
              <li key={`${edge.from}-${edge.to}-${edge.label}`} className="text-app-meta text-[var(--text-secondary)]">
                {node(edge.from)?.title} <span className="text-[var(--text-tertiary)]">{edge.label}</span>{" "}
                {node(edge.to)?.title}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-4 text-app-meta text-[var(--text-tertiary)]">
          Select any node to trace how it supports, limits, or counters the claim.
        </p>
      )}
    </div>
  );
}

function LineageNode({
  id,
  selected,
  onSelect,
}: {
  id: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const node = SAMPLE_LINEAGE_NODES.find((entry) => entry.id === id);
  if (!node) return null;
  const isSelected = selected === node.id;
  const risk = node.tone === "risk";
  const Icon = risk ? TriangleAlert : node.id === "defense" ? MessageSquare : FileText;

  return (
    <button
      type="button"
      onClick={() => onSelect(isSelected ? null : node.id)}
      aria-pressed={isSelected}
      className="w-full rounded-[var(--radius-control)] border px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-hover)]"
      style={{
        borderColor: risk
          ? "var(--color-risk)"
          : isSelected
            ? "var(--text-primary)"
            : "var(--border-default)",
        background: isSelected ? "var(--surface-selected)" : "transparent",
      }}
    >
      <span className="flex items-start gap-2">
        <Icon
          className="mt-0.5 h-3.5 w-3.5 shrink-0"
          strokeWidth={1.8}
          style={{ color: risk ? "var(--color-risk)" : "var(--text-tertiary)" }}
          aria-hidden
        />
        <span className="min-w-0">
          <span className="block text-app-meta text-[var(--text-primary)]">{node.title}</span>
          <span className="mt-0.5 block text-app-meta" style={{ color: "var(--color-evidence)" }}>
            {node.source}
          </span>
        </span>
      </span>
    </button>
  );
}

function EdgeLabel({ label, vertical = false }: { label: string; vertical?: boolean }) {
  return (
    <span className="flex items-center justify-center gap-1.5 text-app-meta text-[var(--text-tertiary)]">
      {vertical ? (
        <span aria-hidden className="h-4 w-px" style={{ background: "var(--border-default)" }} />
      ) : null}
      {label}
      {!vertical ? <ArrowRight className="h-3 w-3" strokeWidth={1.6} aria-hidden /> : null}
    </span>
  );
}
