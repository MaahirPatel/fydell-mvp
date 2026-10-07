"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, X } from "lucide-react";
import { CodeBlock } from "./CodeBlock";
import EvidenceWorkspace from "./EvidenceWorkspace";
import {
  DEMO_CANDIDATE,
  DEMO_COVERAGE,
  DEMO_LABEL,
  DEMO_PROJECT_FINDINGS,
  DEMO_PROJECT_LIMITS,
  DEMO_REPOSITORY,
  DEMO_SOURCE_FILE,
  DEMO_TASK,
  type EvidenceBasis,
} from "@/lib/marketing/demo-fixture";

type TabKey = "evidence" | "passport" | "simulation" | "report";

const TABS: { key: TabKey; label: string; short: string; field: string; detail: string }[] = [
  {
    key: "evidence",
    label: "1 · Project evidence",
    short: "1 Evidence",
    field: "",
    detail: "A developer imports a public repository. Findings cite the exact file, lines, and commit, and coverage shows what was and was not analyzed.",
  },
  {
    key: "passport",
    label: "2 · Passport",
    short: "2 Passport",
    field: "",
    detail: "Findings from projects and simulations gather in the Engineering Passport. Select a finding to see the work behind it.",
  },
  {
    key: "simulation",
    label: "3 · Simulation",
    short: "3 Task",
    field: "",
    detail: "The candidate fixes real code, adds a regression test, and reviews an AI-written patch. Test output here is recorded, not run live.",
  },
  {
    key: "report",
    label: "4 · Employer report",
    short: "4 Report",
    field: "",
    detail: "The hiring team reads a short summary first, opens the evidence behind each claim, and makes the decision themselves.",
  },
];

const BASIS_STYLE: Record<EvidenceBasis, string> = {
  "Repository observation": "bg-[var(--field-teal)] text-[var(--ink-teal)]",
  "Candidate statement": "bg-[var(--surface-selected)] text-[var(--text-secondary)]",
  "Model interpretation": "bg-[var(--field-violet)] text-[var(--ink-violet)]",
  "Observed simulation result": "bg-[var(--field-blue)] text-[var(--ink-blue)]",
};

function Basis({ basis }: { basis: EvidenceBasis }) {
  return (
    <span className={`inline-flex rounded-[4px] px-1.5 py-0.5 text-app-caption font-medium ${BASIS_STYLE[basis]}`}>
      {basis}
    </span>
  );
}

function RailHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-app-meta font-medium text-[var(--text-tertiary)]">
      {children}
    </p>
  );
}

function WindowBar({ title, meta }: { title: string; meta: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
      <p className="min-w-0 truncate text-app-body font-medium text-[var(--text-primary)]">{title}</p>
      <p className="text-app-meta text-[var(--text-tertiary)]">{meta}</p>
    </div>
  );
}

function EvidencePanel() {
  return (
    <>
      <WindowBar
        title={`${DEMO_REPOSITORY.fullName} @ ${DEMO_REPOSITORY.commit}`}
        meta={`${DEMO_REPOSITORY.analyzedFiles} of ${DEMO_REPOSITORY.totalFiles} files analyzed`}
      />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="p-4 sm:p-5">
          <CodeBlock path={DEMO_SOURCE_FILE.path} meta="Python" lines={DEMO_SOURCE_FILE.lines} />
          <div className="mt-4 rounded-[10px] border border-[var(--border-subtle)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
              <p className="text-app-meta font-medium text-[var(--text-primary)]">Analysis coverage</p>
              <p className="text-app-meta text-[var(--text-tertiary)]">Read only · imported code is never executed</p>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4">
              {DEMO_COVERAGE.map((c) => (
                <div key={c.kind} className="border-[var(--border-subtle)] px-4 py-3 sm:[&:not(:first-child)]:border-l">
                  <dt className="text-app-meta text-[var(--text-tertiary)]">{c.kind}</dt>
                  <dd className="mt-0.5 text-[var(--step-0)] font-medium tabular-nums text-[var(--text-primary)]">{c.count}</dd>
                </div>
              ))}
            </dl>
            <p className="border-t border-[var(--border-subtle)] px-4 py-2.5 text-app-meta text-[var(--text-secondary)]">
              Skipped: {DEMO_REPOSITORY.skipped}. The other 166 files are listed with the reason they were not analyzed.
            </p>
          </div>
        </div>
        <aside className="space-y-5 border-t border-[var(--border-subtle)] p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div>
            <RailHeading>Findings</RailHeading>
            <ul className="mt-3 space-y-3">
              {DEMO_PROJECT_FINDINGS.map((f) => (
                <li key={f.id} className="rounded-[8px] border border-[var(--border-subtle)] p-3">
                  <p className="text-app-body leading-[1.5] text-[var(--text-primary)]">{f.finding}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Basis basis={f.basis} />
                    <span className="font-mono text-app-caption text-[var(--text-tertiary)]">{f.citation}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <RailHeading>Attribution</RailHeading>
            <p className="mt-2 text-app-meta leading-[1.55] text-[var(--text-secondary)]">
              {DEMO_REPOSITORY.attribution}
            </p>
          </div>
          <div>
            <RailHeading>Not shown by this work</RailHeading>
            <ul className="mt-2 space-y-1.5">
              {DEMO_PROJECT_LIMITS.map((l) => (
                <li key={l} className="text-app-meta leading-[1.55] text-[var(--text-secondary)]">
                  {l}
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

function SimulationPanel() {
  const passed = DEMO_TASK.tests.filter((t) => t.passed).length;
  return (
    <>
      <WindowBar title={DEMO_TASK.title} meta={`${DEMO_TASK.stack} · ${DEMO_TASK.version}`} />
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 p-4 sm:p-5">
          <CodeBlock path={DEMO_TASK.filePath} meta="Candidate change" lines={DEMO_TASK.diff} />
          <div className="rounded-[10px] border border-[var(--border-subtle)]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] px-4 py-2.5">
              <p className="text-app-meta font-medium text-[var(--text-primary)]">
                Tests · {passed} passed, {DEMO_TASK.tests.length - passed} failed
              </p>
              <p className="text-app-meta text-[var(--text-tertiary)]">Recorded example output</p>
            </div>
            <ul className="divide-y divide-[var(--border-subtle)]">
              {DEMO_TASK.tests.map((t) => (
                <li key={t.name} className="flex items-center gap-2.5 px-4 py-2 font-mono text-app-meta">
                  {t.passed ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-[var(--evidence-support)]" aria-hidden />
                  ) : (
                    <X className="h-3.5 w-3.5 shrink-0 text-[var(--evidence-counter)]" aria-hidden />
                  )}
                  <span className="truncate text-[var(--text-primary)]">{t.name}</span>
                  <span className={`ml-auto shrink-0 text-app-caption ${t.passed ? "text-[var(--evidence-support)]" : "text-[var(--evidence-counter)]"}`}>
                    {t.passed ? "passed" : "failed"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <aside className="space-y-5 border-t border-[var(--border-subtle)] p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div>
            <RailHeading>Task</RailHeading>
            <p className="mt-2 text-app-meta leading-[1.6] text-[var(--text-secondary)]">{DEMO_TASK.brief}</p>
          </div>
          <div>
            <RailHeading>AI patch review</RailHeading>
            <div className="mt-2 rounded-[8px] border border-[var(--border-subtle)] p-3">
              <p className="text-app-meta leading-[1.5] text-[var(--text-secondary)]">{DEMO_TASK.aiPatch.summary}</p>
              <p className="mt-2.5 inline-flex rounded-[4px] bg-[var(--field-coral)] px-1.5 py-0.5 text-app-caption font-medium text-[var(--ink-coral)]">
                Candidate decision: {DEMO_TASK.aiPatch.decision}
              </p>
              <p className="mt-2 text-app-meta leading-[1.55] text-[var(--text-primary)]">
                “{DEMO_TASK.aiPatch.reason}”
              </p>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}

export default function ProductStage() {
  const [active, setActive] = useState<TabKey>("evidence");
  const [resets, setResets] = useState(0);
  const refs = useRef<Record<TabKey, HTMLButtonElement | null>>({ evidence: null, passport: null, simulation: null, report: null });
  const index = TABS.findIndex((t) => t.key === active);
  const go = (i: number) => setActive(TABS[Math.max(0, Math.min(TABS.length - 1, i))].key);
  const baseId = useId();
  const current = TABS.find((t) => t.key === active) ?? TABS[0];

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const i = TABS.findIndex((t) => t.key === active);
    const next =
      e.key === "ArrowRight" ? (i + 1) % TABS.length
      : e.key === "ArrowLeft" ? (i - 1 + TABS.length) % TABS.length
      : e.key === "Home" ? 0
      : e.key === "End" ? TABS.length - 1
      : -1;
    if (next < 0) return;
    e.preventDefault();
    const key = TABS[next].key;
    setActive(key);
    refs.current[key]?.focus();
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="tablist"
          aria-label="Demo steps"
          onKeyDown={onKeyDown}
          className="grid w-full grid-cols-2 gap-1 rounded-[20px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-1 sm:inline-flex sm:w-auto sm:rounded-full"
        >
          {TABS.map((t) => {
            const selected = t.key === active;
            return (
              <button
                key={t.key}
                ref={(el) => {
                  refs.current[t.key] = el;
                }}
                role="tab"
                type="button"
                id={`${baseId}-tab-${t.key}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(t.key)}
                className={`h-9 whitespace-nowrap rounded-full px-3.5 text-app-body font-medium transition-colors duration-150 sm:px-4 ${
                  selected
                    ? "bg-[var(--control-solid)] text-[var(--control-solid-ink)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>
        <p className="inline-flex items-center gap-2 text-app-meta text-[var(--text-tertiary)]">
          <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--brand-coral)]" />
          {DEMO_LABEL} · {DEMO_CANDIDATE.name} and this repository are fictional
        </p>
      </div>

      <p className="mt-4 max-w-[72ch] text-app-body leading-[1.6] text-[var(--text-secondary)]">{current.detail}</p>

      <div
        className="mt-4 rounded-[20px] border border-[var(--border-default)] p-3 sm:p-6 lg:p-8"
        style={{
          backgroundColor: "var(--stage-bg)",
          backgroundImage:
            "linear-gradient(var(--stage-grid) 1px, transparent 1px), linear-gradient(90deg, var(--stage-grid) 1px, transparent 1px), linear-gradient(135deg, var(--stage-bg) 0%, var(--stage-bg-2) 100%)",
          backgroundSize: "40px 40px, 40px 40px, 100% 100%",
        }}
      >
        <div
          key={`${active}-${resets}`}
          role="tabpanel"
          id={`${baseId}-panel`}
          aria-labelledby={`${baseId}-tab-${active}`}
          className={
            active === "passport" || active === "report"
              ? ""
              : "overflow-hidden rounded-[14px] border border-[var(--border-default)] bg-[var(--surface-raised)] shadow-[0_1px_0_var(--border-subtle),0_12px_32px_-16px_oklch(20%_0.02_258/0.18)]"
          }
        >
          {active === "evidence" ? (
            <EvidencePanel />
          ) : active === "passport" ? (
            <EvidenceWorkspace variant="passport" />
          ) : active === "simulation" ? (
            <SimulationPanel />
          ) : (
            <EvidenceWorkspace variant="review" />
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            className="h-10 rounded-full border border-[var(--border-strong)] px-4 text-app-body font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Back
          </button>
          {index < TABS.length - 1 ? (
            <button
              type="button"
              onClick={() => go(index + 1)}
              className="h-10 rounded-full bg-[var(--control-solid)] px-4 text-app-body font-medium text-[var(--control-solid-ink)] hover:bg-[var(--control-solid-hover)]"
            >
              Next: {TABS[index + 1].label.replace(/^\d · /, "")}
            </button>
          ) : null}
          {active !== "report" ? (
            <button
              type="button"
              onClick={() => setActive("report")}
              className="h-10 px-2 text-app-body font-medium text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--text-primary)]"
            >
              Skip to the report
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => {
            setActive("evidence");
            setResets((n) => n + 1);
          }}
          className="h-10 px-2 text-app-body text-[var(--text-tertiary)] underline underline-offset-4 hover:text-[var(--text-primary)]"
        >
          Reset demo
        </button>
      </div>
    </div>
  );
}
