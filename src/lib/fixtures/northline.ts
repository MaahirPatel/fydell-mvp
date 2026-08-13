/**
 * The Northline Components operations-yield scenario.
 *
 * SYNTHETIC. Northline Components is a fictional manufacturer invented for the
 * released Data Analyst evaluation. Nothing here is a customer, a real
 * candidate, or a real result. It is safe to show publicly because it is the
 * same scenario the product actually ships.
 *
 * Every marketing scene reads from this file. When the scenario changes, the
 * homepage, Product page and Evaluation page change together instead of
 * drifting into three different versions of the same story.
 */
import type { Citation } from "@/components/fydell/CitationLink";
import type { TraceNode } from "@/components/fydell/EvidenceTrace";

export const NORTHLINE_SCENARIO = {
  evaluation: "Operations performance investigation",
  company: "Northline Components",
  role: "Data Analyst",
  /** Must match `durationMinutes` on the released task in
      lib/simulations/content/micro-ops-yield.ts. */
  duration: "20 minutes",
  question:
    "Reported yield fell from 93.2 percent. Is production actually worse, or did reporting change?",
} as const;

/* ------------------------------------------------------------------ sources */

export const NORTHLINE_RESOURCES = [
  {
    name: "production_runs.csv",
    detail: "Planned, completed and scrap by line, shift and period",
  },
  {
    name: "quality_events.csv",
    detail: "Disposition events including HOLD_RECLASS",
  },
  {
    name: "Metric dictionary",
    detail: "How yield is defined and what it excludes",
  },
] as const;

/* ---------------------------------------------------------------- citations */

export const CITATIONS = {
  reclassEvents: {
    index: 1,
    source: "quality_events.csv",
    locator: "Q-303, Q-304",
    tone: "source",
  },
  dictionary: {
    index: 2,
    source: "Metric dictionary",
    locator: "yield, line 4",
    tone: "source",
  },
  residualScrap: {
    index: 3,
    source: "production_runs.csv",
    locator: "rows 12-14",
    tone: "contradiction",
  },
} satisfies Record<string, Citation>;

/** Excerpts shown when a citation is opened. */
export const CITATION_SOURCES: Record<
  keyof typeof CITATIONS,
  { text: string; highlight?: boolean }[]
> = {
  reclassEvents: [
    { text: "event_id,period,line,disposition,units" },
    { text: "Q-301,prior,L1,SCRAP,30" },
    { text: "Q-303,current,L1,HOLD_RECLASS,42", highlight: true },
    { text: "Q-304,current,L2,HOLD_RECLASS,58", highlight: true },
  ],
  dictionary: [
    { text: "yield = completed_good / planned" },
    { text: "completed_good excludes any unit that" },
    { text: "leaves good output, including HOLD_RECLASS", highlight: true },
    { text: "prior periods are not restated" },
  ],
  residualScrap: [
    { text: "period,line,shift,completed,scrap" },
    { text: "current,L1,Day,900,45" },
    { text: "current,L2,Day,820,90", highlight: true },
    { text: "current,L2,Night,860,20" },
  ],
};

/* ------------------------------------------------------------------- claims */

export type NorthlineClaim = {
  id: string;
  /** What the candidate concluded. */
  text: string;
  /** How they established it. */
  action: string;
  citations: Citation[];
  /** Where the claim stops. Shown so the report is not read as certainty. */
  limitation?: string;
  tone: "neutral" | "risk";
};

export const NORTHLINE_CLAIMS: NorthlineClaim[] = [
  {
    id: "reclass",
    text: "Most of the reported drop is a reporting change, not a production change.",
    action:
      "Filtered quality events by period and found HOLD_RECLASS present only in the current period.",
    citations: [CITATIONS.reclassEvents, CITATIONS.dictionary],
    tone: "neutral",
  },
  {
    id: "comparability",
    text: "The two periods are not directly comparable as reported.",
    action:
      "Read the metric definition and confirmed prior periods were never restated.",
    citations: [CITATIONS.dictionary],
    limitation:
      "A restated prior period was not available, so the corrected gap is an estimate.",
    tone: "neutral",
  },
  {
    id: "residual",
    text: "Line L2 Day still carries a real loss after the correction.",
    action:
      "Subtracted reclassified volume and compared residual scrap against the prior period.",
    citations: [CITATIONS.residualScrap],
    limitation:
      "Cause is not established. The data shows the loss but not why it happened.",
    tone: "risk",
  },
];

export const NORTHLINE_CONCLUSION =
  "Reported yield fell 3.2 points, but roughly two thirds of that is a mid-period reporting change. One line carries a genuine loss that should be checked before the next shift.";

/* ------------------------------------------------------------ changed facts */

export const NORTHLINE_CHANGED_FACT = {
  /** What the candidate believed when they wrote the first conclusion. */
  before: {
    label: "Original brief",
    text: "HOLD_RECLASS was introduced at the start of the current period.",
  },
  /** What the product told them partway through. */
  after: {
    label: "New information",
    text: "HOLD_RECLASS went live on day 9 of a 20-day period, not on day 1.",
  },
  affects: "Most of the reported drop is a reporting change, not a production change.",
  /** One of: revised, defended, ignored. This fixture shows a revision. */
  response: "revised" as const,
  responseText:
    "Recalculated using only the days after the change, which lowered the reclassification share from most of the drop to about two thirds, and left the L2 Day loss intact.",
  responseCitation: CITATIONS.reclassEvents,
};

/* -------------------------------------------------------------------- trace */

export const NORTHLINE_TRACE: TraceNode[] = [
  {
    stage: "source",
    label: "quality_events.csv",
    detail: "Disposition events for both periods",
  },
  {
    stage: "action",
    label: "Filtered events by period",
    detail: "Found HOLD_RECLASS in the current period only",
  },
  {
    stage: "claim",
    label: "The drop is mostly a reporting change",
  },
  {
    stage: "citation",
    label: "Q-303, Q-304 and the metric definition",
    tone: "verified",
  },
  {
    stage: "limitation",
    label: "L2 Day loss is not explained by reclassification",
    tone: "risk",
  },
  {
    stage: "revision",
    label: "Recalculated after the start date changed",
    detail: "Reclassification share fell to about two thirds",
  },
  {
    stage: "judgment",
    label: "Reviewer confirms the correction holds",
  },
];

/* ------------------------------------------------------- oral defense prompt */

export const NORTHLINE_DEFENSE_PROMPT = {
  /** Tied to a specific limitation in the work rather than a generic question. */
  tiedTo: "Cause is not established. The data shows the loss but not why it happened.",
  question:
    "You stopped short of naming a cause for the L2 Day loss. What would you have needed to see in order to name one, and what would have changed your mind?",
};

/* ------------------------------------------------------------- work receipt */

/**
 * Capability flags mirror what the backend actually implements. A control that
 * is false renders as truthfully unavailable rather than being hidden, so the
 * scene never implies portability the product does not have.
 */
export const NORTHLINE_RECEIPT = {
  includes: [
    { label: "The conclusion the candidate submitted", included: true },
    { label: "Claims with their citations", included: true },
    { label: "The changed-fact response", included: true },
    { label: "Reviewer notes and hiring decision", included: false },
  ],
  access: [
    { party: "The candidate", state: "Full access" as const },
    { party: "The inviting employer", state: "Full access" as const },
    { party: "Any other employer", state: "No access" as const },
  ],
} as const;
