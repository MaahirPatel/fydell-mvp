"use client";

import { useState } from "react";
import {
  Briefcase,
  Check,
  Code2,
  CreditCard,
  FileCode2,
  FlaskConical,
  LayoutGrid,
  Lock,
  Settings,
  Share2,
  Users,
  X,
} from "lucide-react";
import FydellMark from "@/components/brand/FydellMark";
import { CodeBlock } from "./CodeBlock";
import { DEMO_LABEL, DEMO_TASK, EVIDENCE_RECORDS, type EvidenceRecord } from "@/lib/marketing/demo-fixture";

type Variant = "passport" | "review";
type Tab = "evidence" | "submission" | "notes";
const DECISIONS = ["Advance to interview", "Hold", "Decline"] as const;

const KIND = {
  project: {
    label: "Project",
    badge: "bg-[var(--field-teal)] text-[var(--ink-teal)]",
    icon: FileCode2,
    rail: "shadow-[inset_2px_0_0_var(--brand-teal)]",
  },
  simulation: {
    label: "Simulation",
    badge: "bg-[var(--field-violet)] text-[var(--ink-violet)]",
    icon: FlaskConical,
    rail: "shadow-[inset_2px_0_0_var(--brand-violet)]",
  },
} as const;

function SideNav({ variant }: { variant: Variant }) {
  const main =
    variant === "passport"
      ? [
          { label: "Overview", icon: LayoutGrid, active: true },
          { label: "Projects", icon: Code2 },
          { label: "Simulations", icon: FlaskConical },
          { label: "Sharing", icon: Share2 },
        ]
      : [
          { label: "Overview", icon: LayoutGrid },
          { label: "Roles", icon: Briefcase },
          { label: "Candidates", icon: Users, active: true },
          { label: "Simulations", icon: FlaskConical },
        ];
  const secondary =
    variant === "review"
      ? [
          { label: "Team", icon: Users },
          { label: "Billing", icon: CreditCard },
          { label: "Settings", icon: Settings },
        ]
      : [];
  return (
    <div aria-hidden className="hidden w-[196px] shrink-0 flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-panel)] p-3 lg:flex">
      {variant === "passport" ? (
        <div className="mb-3 flex items-center gap-2.5 px-2 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--field-teal)] text-app-meta font-medium text-[var(--ink-teal)]">C1</span>
          <span className="text-app-body font-medium text-[var(--text-primary)]">Candidate 01</span>
        </div>
      ) : null}
      <ul className="space-y-0.5">
        {main.map(({ label, icon: Icon, active }) => (
          <li
            key={label}
            className={`flex items-center gap-2.5 rounded-[7px] px-2 py-1.5 text-app-meta ${
              active ? "bg-[var(--surface-selected)] font-medium text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
            }`}
          >
            <Icon className="h-4 w-4" strokeWidth={1.7} />
            {label}
          </li>
        ))}
      </ul>
      {secondary.length ? (
        <ul className="mt-auto space-y-0.5 border-t border-[var(--border-subtle)] pt-3">
          {secondary.map(({ label, icon: Icon }) => (
            <li key={label} className="flex items-center gap-2.5 px-2 py-1.5 text-app-meta text-[var(--text-tertiary)]">
              <Icon className="h-4 w-4" strokeWidth={1.7} />
              {label}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function EvidenceList({
  selected,
  onSelect,
}: {
  selected: EvidenceRecord;
  onSelect: (id: string) => void;
}) {
  const groups = [
    { heading: "Project evidence", items: EVIDENCE_RECORDS.filter((r) => r.kind === "project") },
    { heading: "Simulation evidence", items: EVIDENCE_RECORDS.filter((r) => r.kind === "simulation") },
  ];
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.heading}>
          <p className="px-2 text-app-caption font-medium text-[var(--text-tertiary)]">{group.heading}</p>
          <ul className="mt-1.5 space-y-0.5">
            {group.items.map((item) => {
              const Icon = KIND[item.kind].icon;
              const active = item.id === selected.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSelect(item.id)}
                    className={`flex w-full items-start gap-2.5 rounded-[8px] px-2 py-2 text-left transition-colors duration-150 ${
                      active ? `bg-[var(--surface-hover)] ${KIND[item.kind].rail}` : "hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <Icon
                      aria-hidden
                      className={`mt-0.5 h-4 w-4 shrink-0 ${item.kind === "project" ? "text-[var(--brand-teal)]" : "text-[var(--brand-violet)]"}`}
                      strokeWidth={1.7}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-app-body leading-[1.35] text-[var(--text-primary)]">{item.title}</span>
                      <span className="mt-0.5 block truncate text-app-meta text-[var(--text-tertiary)]">
                        {item.source} · <span className="font-mono">{item.citation}</span>
                      </span>
                    </span>
                    {item.status ? (
                      <span className="shrink-0 rounded-[4px] bg-[var(--status-attention-bg)] px-1.5 py-0.5 text-app-caption font-medium text-[var(--status-attention-ink)]">
                        {item.status.label}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

function EvidenceDetail({ record }: { record: EvidenceRecord }) {
  return (
    <div aria-live="polite" className="min-w-0">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-app-body font-medium leading-snug text-[var(--text-primary)]">{record.title}</h4>
        <span className={`rounded-[4px] px-1.5 py-0.5 text-app-caption font-medium ${KIND[record.kind].badge}`}>{KIND[record.kind].label}</span>
      </div>
      <p className="mt-1 text-app-meta text-[var(--text-tertiary)]">
        {record.language} · {record.revision}
      </p>
      <div className="mt-3">
        <CodeBlock path={record.file} lines={record.lines} compact />
      </div>
      <dl className="mt-4 space-y-3">
        <div>
          <dt className="text-app-meta font-medium text-[var(--text-primary)]">What this shows</dt>
          <dd className="mt-0.5 text-app-meta leading-[1.55] text-[var(--text-secondary)]">{record.shows}</dd>
        </div>
        <div className="border-t border-[var(--border-subtle)] pt-3">
          <dt className="text-app-meta font-medium text-[var(--text-primary)]">Evidence limits</dt>
          <dd className="mt-0.5 text-app-meta leading-[1.55] text-[var(--text-secondary)]">{record.limits}</dd>
        </div>
      </dl>
    </div>
  );
}

function Submission() {
  const passed = DEMO_TASK.tests.filter((t) => t.passed).length;
  return (
    <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="min-w-0">
        <p className="mb-2 text-app-meta text-[var(--text-secondary)]">
          {DEMO_TASK.title} · {DEMO_TASK.version} · recorded run
        </p>
        <CodeBlock path={DEMO_TASK.filePath} meta="Submitted change" lines={DEMO_TASK.diff} compact />
      </div>
      <div>
        <p className="text-app-meta font-medium text-[var(--text-primary)]">
          Tests · {passed} of {DEMO_TASK.tests.length} passed
        </p>
        <ul className="mt-2 divide-y divide-[var(--border-subtle)] rounded-[8px] border border-[var(--border-subtle)]">
          {DEMO_TASK.tests.map((t) => (
            <li key={t.name} className="flex items-center gap-2 px-3 py-2 font-mono text-app-meta">
              {t.passed ? (
                <Check aria-label="passed" className="h-3.5 w-3.5 shrink-0 text-[var(--evidence-support)]" />
              ) : (
                <X aria-label="failed" className="h-3.5 w-3.5 shrink-0 text-[var(--evidence-counter)]" />
              )}
              <span className="truncate text-[var(--text-primary)]">{t.name}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-app-meta font-medium text-[var(--text-primary)]">AI-proposed patch</p>
        <p className="mt-1 text-app-meta leading-[1.55] text-[var(--text-secondary)]">
          {DEMO_TASK.aiPatch.decision} by the candidate: “{DEMO_TASK.aiPatch.reason}”
        </p>
      </div>
    </div>
  );
}

function Notes() {
  const [draft, setDraft] = useState("");
  return (
    <div className="max-w-[640px] p-4 sm:p-5">
      <div className="rounded-[8px] bg-[var(--field-warm)] p-3">
        <p className="text-app-meta font-medium text-[var(--ink-warm)]">Reviewer · visible to your team only</p>
        <p className="mt-1 text-app-body text-[var(--text-primary)]">Strong fix. Ask how retries behave when sending fails.</p>
      </div>
      <label htmlFor="demo-note" className="mt-4 block text-app-meta font-medium text-[var(--text-primary)]">
        Add a note
      </label>
      <textarea
        id="demo-note"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={3}
        placeholder="Notes stay inside your workspace."
        className="platform-input mt-1.5"
      />
      <p className="mt-1.5 text-app-meta text-[var(--text-tertiary)]">Example workspace: notes typed here are not saved.</p>
    </div>
  );
}

export default function EvidenceWorkspace({ variant = "passport" }: { variant?: Variant }) {
  const [selectedId, setSelectedId] = useState(EVIDENCE_RECORDS[0].id);
  const [tab, setTab] = useState<Tab>("evidence");
  const [decision, setDecision] = useState<(typeof DECISIONS)[number] | null>(null);
  const selected = EVIDENCE_RECORDS.find((r) => r.id === selectedId) ?? EVIDENCE_RECORDS[0];

  return (
    <div className="overflow-hidden rounded-[18px] border border-[color-mix(in_oklch,var(--text-primary)_9%,transparent)] bg-[var(--surface-raised)] shadow-[var(--shadow-stage)] sm:rounded-[20px]">
      <div className="flex h-11 items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4">
        <div className="flex items-center gap-2">
          <FydellMark width={20} />
          <span className="text-app-meta font-medium text-[var(--text-primary)]">
            {variant === "passport" ? "Engineering Passport" : "Hiring workspace"}
          </span>
        </div>
        <span className="rounded-full bg-[var(--surface-selected)] px-2 py-0.5 text-app-caption font-medium text-[var(--text-secondary)]">
          {DEMO_LABEL}
        </span>
      </div>

      <div className="flex">
        <SideNav variant={variant} />
        <div className="min-w-0 flex-1">
          {variant === "passport" ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3.5 sm:px-5">
              <h3 className="text-[var(--step-1)] font-[560] tracking-[-0.015em] text-[var(--text-primary)]">The work behind the profile</h3>
              <span className="inline-flex items-center gap-1.5 text-app-meta text-[var(--text-secondary)]">
                <Lock className="h-3.5 w-3.5" aria-hidden /> Private until shared
              </span>
            </div>
          ) : (
            <div className="border-b border-[var(--border-subtle)] px-4 pt-3.5 sm:px-5">
              <p className="text-app-meta text-[var(--text-tertiary)]">Roles / Backend Engineer</p>
              <div className="mt-1 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-[var(--step-1)] font-[560] tracking-[-0.02em] text-[var(--text-primary)]">Candidate 01</h3>
                  <p className="text-app-meta text-[var(--text-secondary)]">Python · Backend Engineer</p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {DECISIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={decision === d}
                      onClick={() => setDecision(d)}
                      className={`h-8 whitespace-nowrap rounded-full px-3 text-app-meta font-medium transition-colors duration-150 ${
                        decision === d
                          ? "bg-[var(--control-solid)] text-[var(--control-solid-ink)]"
                          : "border border-[var(--border-strong)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div role="tablist" aria-label="Candidate record" className="mt-3 flex gap-5">
                {(["evidence", "submission", "notes"] as const).map((t) => (
                  <button
                    key={t}
                    role="tab"
                    type="button"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={`-mb-px border-b-2 pb-2.5 text-app-body font-medium transition-colors duration-150 ${
                      tab === t ? "border-[var(--brand-teal)] text-[var(--text-primary)]" : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {{ evidence: "Evidence", submission: "Submission", notes: "Notes" }[t]}
                  </button>
                ))}
              </div>
            </div>
          )}

          {variant === "passport" || tab === "evidence" ? (
            <div className="grid grid-cols-1 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="border-b border-[var(--border-subtle)] p-3 sm:p-4 md:border-b-0 md:border-r">
                <EvidenceList selected={selected} onSelect={setSelectedId} />
                <p className="mt-4 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] px-2 pt-3 text-app-meta">
                  <span className="text-[var(--text-secondary)]">Role this work supports</span>
                  <span className="font-medium text-[var(--ink-teal)]">Backend engineering</span>
                </p>
              </div>
              <div className="p-4 sm:p-5">
                <EvidenceDetail record={selected} />
              </div>
            </div>
          ) : tab === "submission" ? (
            <Submission />
          ) : (
            <Notes />
          )}

          {variant === "review" ? (
            <p aria-live="polite" className="border-t border-[var(--border-subtle)] px-4 py-2.5 text-app-meta text-[var(--text-secondary)] sm:px-5">
              {decision
                ? `Example only: "${decision}" is not saved, and nothing is sent to the candidate.`
                : "Team decision: none recorded. Decisions never send messages automatically."}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
