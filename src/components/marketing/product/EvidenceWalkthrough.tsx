"use client";

/**
 * Chapter 2 of the Product page: watching work turn into evidence.
 *
 * The trace is the control. Selecting a step shows what existed at that point
 * in the candidate's session, so the mechanism is demonstrated rather than
 * described. Prose cannot show that a claim has a source behind it; this can.
 *
 * Every step is reachable by keyboard and the panel is a live region, so the
 * walkthrough works without a mouse and announces itself when it changes.
 */
import { useState } from "react";
import { EvidenceTrace } from "@/components/fydell/EvidenceTrace";
import { CitationLink, CitationSource } from "@/components/fydell/CitationLink";
import { ProductStage } from "@/components/fydell/ProductStage";
import {
  CITATION_SOURCES,
  CITATIONS,
  NORTHLINE_CHANGED_FACT,
  NORTHLINE_CLAIMS,
  NORTHLINE_RESOURCES,
  NORTHLINE_SCENARIO,
  NORTHLINE_TRACE,
} from "@/lib/fixtures/northline";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11.5px] font-medium text-[var(--text-tertiary)]">
      {children}
    </p>
  );
}

function Panel({ step }: { step: number }) {
  const stage = NORTHLINE_TRACE[step]?.stage;

  if (stage === "source") {
    return (
      <div className="p-4">
        <Label>What the candidate was given</Label>
        <ul className="mt-2.5 divide-y divide-[var(--border-subtle)]">
          {NORTHLINE_RESOURCES.map((r) => (
            <li key={r.name} className="py-2 first:pt-0">
              <p className="text-[13px] text-[var(--text-primary)]">{r.name}</p>
              <p className="mt-0.5 text-[12px] text-[var(--text-tertiary)]">
                {r.detail}
              </p>
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-[var(--border-subtle)] pt-3 text-[12.5px] leading-[1.55] text-[var(--text-secondary)]">
          Nothing is labelled as important. Deciding which of these answers the
          question is part of the task.
        </p>
      </div>
    );
  }

  if (stage === "action") {
    return (
      <div className="p-4">
        <Label>What the candidate did</Label>
        <p className="mt-2 text-[13.5px] leading-[1.55] text-[var(--text-primary)]">
          {NORTHLINE_CLAIMS[0].action}
        </p>
        <div className="mt-3.5">
          <CitationSource
            citation={CITATIONS.reclassEvents}
            lines={CITATION_SOURCES.reclassEvents}
          />
        </div>
        <p className="mt-3 text-[12.5px] leading-[1.55] text-[var(--text-secondary)]">
          The rows they opened are recorded as they work, so the report can point
          back at them later.
        </p>
      </div>
    );
  }

  if (stage === "claim") {
    return (
      <div className="p-4">
        <Label>The claim they wrote</Label>
        <p className="mt-2 border-l-2 border-[var(--fydell-evidence)] pl-3 text-[14px] leading-[1.5] text-[var(--text-primary)]">
          {NORTHLINE_CLAIMS[0].text}
        </p>
        <p className="mt-3.5 text-[12.5px] leading-[1.55] text-[var(--text-secondary)]">
          A claim is a separate object from the conclusion. That is what makes it
          possible to disagree with one part of a report without discarding all
          of it.
        </p>
      </div>
    );
  }

  if (stage === "citation") {
    return (
      <div className="p-4">
        <Label>What supports it</Label>
        <div className="mt-2 space-y-1">
          <CitationLink citation={CITATIONS.reclassEvents} />
          <CitationLink citation={CITATIONS.dictionary} />
        </div>
        <div className="mt-3">
          <CitationSource
            citation={CITATIONS.dictionary}
            lines={CITATION_SOURCES.dictionary}
          />
        </div>
      </div>
    );
  }

  if (stage === "limitation") {
    const claim = NORTHLINE_CLAIMS[2];
    return (
      <div className="p-4">
        <Label>Where the evidence runs out</Label>
        <p className="mt-2 border-l-2 border-[var(--fydell-risk)] pl-3 text-[13.5px] leading-[1.55] text-[var(--text-primary)]">
          {claim.limitation}
        </p>
        <div className="mt-3">
          <CitationSource
            citation={CITATIONS.residualScrap}
            lines={CITATION_SOURCES.residualScrap}
          />
        </div>
        <p className="mt-3 text-[12.5px] leading-[1.55] text-[var(--text-secondary)]">
          Candidates write their own limitations. A report that only showed
          strengths would not be evidence.
        </p>
      </div>
    );
  }

  if (stage === "revision") {
    return (
      <div className="p-4">
        <Label>{NORTHLINE_CHANGED_FACT.after.label}</Label>
        <p className="mt-2 text-[13.5px] leading-[1.55] text-[var(--text-primary)]">
          {NORTHLINE_CHANGED_FACT.after.text}
        </p>
        <p className="mt-3.5 text-[11.5px] font-medium text-[var(--text-tertiary)]">
          What they did about it
        </p>
        <p className="mt-1.5 text-[12.5px] leading-[1.55] text-[var(--text-secondary)]">
          {NORTHLINE_CHANGED_FACT.responseText}
        </p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <Label>What the reviewer decides</Label>
      <p className="mt-2 text-[13.5px] leading-[1.55] text-[var(--text-primary)]">
        The hiring team reads the conclusion, opens the claims they care about,
        and records a decision.
      </p>
      <p className="mt-3 text-[12.5px] leading-[1.55] text-[var(--text-secondary)]">
        Fydell does not make the decision or recommend one. It shows the work and
        who reviewed it.
      </p>
    </div>
  );
}

export default function EvidenceWalkthrough() {
  const [step, setStep] = useState(0);

  return (
    <ProductStage
      title="From source to judgment"
      source={`${NORTHLINE_SCENARIO.company} · synthetic`}
      label="An interactive walkthrough of how one candidate's work became a cited claim"
      meta={
        <span className="tabular-nums">
          Step {step + 1} of {NORTHLINE_TRACE.length}
        </span>
      }
    >
      {/* The trace is a rail rather than a strip along the top: seven stages
          named in full need vertical room, and putting them beside the panel
          keeps the selected step visible while you read what it produced. */}
      <div className="md:grid md:grid-cols-[minmax(220px,268px)_1fr]">
        <div className="border-b border-[var(--border-subtle)] p-4 md:border-b-0 md:border-r">
          <EvidenceTrace
            nodes={NORTHLINE_TRACE}
            orientation="vertical"
            selected={step}
            onSelect={setStep}
            caption="Select a step to see what existed at that point in the candidate's session."
          />
        </div>
        <div aria-live="polite" className="min-w-0 md:min-h-[420px]">
          <Panel step={step} />
        </div>
      </div>
    </ProductStage>
  );
}
