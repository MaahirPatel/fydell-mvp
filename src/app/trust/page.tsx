import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  ArrowDown,
  BookText,
  Building,
  Building2,
  Check,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Link2,
  ListPlus,
  Lock,
  Mail,
  PencilLine,
  Play,
  Quote,
  ReceiptText,
  RotateCcw,
  Scale,
  ShieldCheck,
  TriangleAlert,
  Unlock,
  UserCheck,
  UserRound,
} from "lucide-react";
import MarketingShell from "@/components/layout/MarketingShell";
import { PageIntro } from "@/components/marketing/PageIntro";
import { ContactLink } from "@/components/ui/ContactLink";
import { ProductStage } from "@/components/fydell/ProductStage";
import { DesktopStage } from "@/components/fydell/ProductDesktop";
import {
  CITATIONS,
  CITATION_SOURCES,
  NORTHLINE_CHANGED_FACT,
  NORTHLINE_CLAIMS,
  NORTHLINE_SCENARIO,
} from "@/lib/fixtures/northline";

export const metadata = {
  title: "Trust",
  description:
    "The lifecycle of an evaluation, who can read each artifact, how a claim is tied to its source, and what Fydell does not have yet.",
};

const SECTION = "border-t border-[var(--border-subtle)] mkt-section-chapter";
const BAND = "bg-[var(--surface-band)]";

/** The bordered surface every scene on this page sits inside. */
const FRAME =
  "overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)]";
const FRAME_BAR =
  "flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-[var(--border-subtle)] bg-[var(--surface-deep)] px-4 py-2.5";
const TILE =
  "inline-flex shrink-0 items-center justify-center rounded-[7px] border";
/* Sentence case, normal tracking. A wide-tracked uppercase micro-label is
   decoration standing in for hierarchy and reads as a template. */
const MICRO_LABEL = "text-[12px] font-medium";

/**
 * Written against the implemented system, and audited against it before this
 * revision: the sim_* tables, their row-level security policies, the submission
 * trigger, and the scoring code.
 *
 * Two rules for this page. Everything asserted has a mechanism behind it, and
 * anything a buyer would reasonably assume we have but we do not is on the page
 * rather than discovered in procurement.
 */

/* ------------------------------------------------------------- lifecycle */

/**
 * The mutability class of the record a stage produces. This is the column an
 * auditor reads first, so it is carried by an icon and a word, never by colour
 * on its own.
 */
type Mutability = "mutable" | "append" | "frozen" | "versioned" | "scoped";

const MUTABILITY: Record<
  Mutability,
  { Icon: LucideIcon; ink: string; tint: string }
> = {
  mutable: {
    Icon: Unlock,
    ink: "var(--text-tertiary)",
    tint: "var(--status-neutral-bg)",
  },
  append: {
    Icon: ListPlus,
    ink: "var(--evidence-observed)",
    tint: "var(--surface-observation)",
  },
  frozen: {
    Icon: Lock,
    ink: "var(--evidence-support)",
    tint: "var(--surface-support)",
  },
  versioned: {
    Icon: History,
    ink: "var(--evidence-generated)",
    tint: "var(--surface-intelligence)",
  },
  scoped: {
    Icon: ShieldCheck,
    ink: "var(--fydell-evidence)",
    tint: "var(--status-neutral-bg)",
  },
};

const LIFECYCLE: {
  step: string;
  detail: string;
  state: string;
  mutability: Mutability;
  Icon: LucideIcon;
  /** Clock time from the synthetic run shown in the console header. */
  time: string;
}[] = [
  {
    step: "Invitation",
    detail:
      "Scoped to one email address and pinned to one published version of the evaluation. It carries an expiry date.",
    state: "Revocable until the candidate starts",
    mutability: "mutable",
    Icon: Mail,
    time: "09:02",
  },
  {
    step: "Session",
    detail:
      "Opening the invitation creates one session, and only one. A used invitation cannot open a second attempt.",
    state: "Active",
    mutability: "mutable",
    Icon: Play,
    time: "14:20",
  },
  {
    step: "The attempt",
    detail:
      "What the candidate opens, asks, writes and cites is appended to the session as timestamped events. Progress saves as they work.",
    state: "Appending",
    mutability: "append",
    Icon: PencilLine,
    time: "14:20—14:40",
  },
  {
    step: "Submission",
    detail:
      "The answers are written as a snapshot. A database trigger rejects any later update or delete of that snapshot, including by us.",
    state: "Frozen",
    mutability: "frozen",
    Icon: Lock,
    time: "14:40",
  },
  {
    step: "Analysis",
    detail:
      "A versioned analysis pass turns the ordered work trail into observations, uncertainties and candidate-specific defense questions.",
    state: "Versioned",
    mutability: "versioned",
    Icon: History,
    time: "14:41",
  },
  {
    step: "Human review",
    detail:
      "A Fydell reviewer checks every publishable claim against supporting events, counterevidence and the applicable rubric.",
    state: "Required in pilot",
    mutability: "versioned",
    Icon: UserCheck,
    time: "16:05",
  },
  {
    step: "Brief and receipt",
    detail:
      "The employer receives a decision brief. Portable candidate evidence is assembled separately so employer-private judgment never enters a Work Receipt.",
    state: "Separate views",
    mutability: "scoped",
    Icon: FileText,
    time: "16:22",
  },
];

/** The stage the illustrated run is sitting in. */
const CURRENT_STAGE = 4;

const RUN_DETAIL: { term: string; value: string }[] = [
  {
    term: "Reads",
    value:
      "The submission snapshot, which the database refuses to update or delete.",
  },
  {
    term: "Writes",
    value:
      "Observations, uncertainties and candidate-specific defense questions.",
  },
  {
    term: "Pinned",
    value:
      "Supporting events, counterevidence, confidence, model, prompt and rubric versions.",
  },
  {
    term: "Blocked on",
    value:
      "Human review. Nothing reaches the employer until stage 06 completes.",
  },
];

/* ---------------------------------------------------------- access matrix */

type Access = "full" | "partial" | "none";

const ACCESS: Record<Access, { Icon: LucideIcon; ink: string; word: string }> = {
  full: {
    Icon: Check,
    ink: "var(--evidence-support)",
    word: "full read access",
  },
  partial: {
    Icon: Eye,
    ink: "var(--evidence-uncertain)",
    word: "partial read access",
  },
  none: { Icon: Lock, ink: "var(--text-tertiary)", word: "no access" },
};

const CELL_TONE: Record<Access, string> = {
  full: "text-[var(--text-primary)]",
  partial: "text-[var(--text-secondary)]",
  none: "text-[var(--text-tertiary)]",
};

const PARTIES: { name: string; role: string; Icon: LucideIcon }[] = [
  { name: "The candidate", role: "Subject", Icon: UserRound },
  { name: "The inviting company", role: "Owner workspace", Icon: Building2 },
  { name: "Any other company", role: "No relationship", Icon: Building },
  { name: "Someone holding a shared link", role: "Recipient", Icon: Link2 },
];

const MATRIX: {
  artifact: string;
  cells: { value: Access; label: string }[];
}[] = [
  {
    artifact: "Invitation",
    cells: [
      { value: "partial", label: "Their own link" },
      { value: "full", label: "All of them" },
      { value: "none", label: "None" },
      { value: "none", label: "None" },
    ],
  },
  {
    artifact: "Session and recorded events",
    cells: [
      { value: "partial", label: "Their own" },
      { value: "full", label: "Full" },
      { value: "none", label: "None" },
      { value: "none", label: "None" },
    ],
  },
  {
    artifact: "Submitted answers",
    cells: [
      { value: "partial", label: "Their own" },
      { value: "full", label: "Full" },
      { value: "none", label: "None" },
      { value: "none", label: "None" },
    ],
  },
  {
    artifact: "Evidence report",
    cells: [
      { value: "partial", label: "Candidate view" },
      { value: "full", label: "Full" },
      { value: "none", label: "None" },
      { value: "none", label: "None" },
    ],
  },
  {
    artifact: "Work Receipt",
    cells: [
      { value: "full", label: "Full" },
      { value: "full", label: "Full" },
      { value: "none", label: "None" },
      { value: "none", label: "None" },
    ],
  },
  {
    artifact: "A link the candidate shares",
    cells: [
      { value: "full", label: "Creates and revokes" },
      { value: "full", label: "Full" },
      { value: "none", label: "None" },
      { value: "partial", label: "Chosen fields only" },
    ],
  },
];

/** The row the inspector underneath the matrix is explaining. */
const INSPECTED_ARTIFACT = "A link the candidate shares";

const INSPECTOR: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: ReceiptText,
    title: "Assembled separately",
    body: "The candidate view of a result is generated separately from the employer view. It does not include the answer key for the evaluation, the reviewer's notes, or the hiring decision.",
  },
  {
    Icon: Link2,
    title: "Bounded by the candidate",
    body: "A shared link carries only the fields the candidate selected, stops working at the date they set, and can be revoked afterwards.",
  },
];

/* ---------------------------------------------------------- evidence graph */

type GraphTone =
  | "source"
  | "action"
  | "claim"
  | "limitation"
  | "revision"
  | "judgment";

const GRAPH_TONE: Record<GraphTone, { ink: string; tint: string }> = {
  source: {
    ink: "var(--evidence-observed)",
    tint: "var(--surface-observation)",
  },
  action: { ink: "var(--text-tertiary)", tint: "var(--status-neutral-bg)" },
  claim: { ink: "var(--fydell-evidence)", tint: "var(--surface-intelligence)" },
  limitation: {
    ink: "var(--evidence-uncertain)",
    tint: "var(--surface-uncertain)",
  },
  revision: { ink: "var(--evidence-counter)", tint: "var(--surface-counter)" },
  judgment: { ink: "var(--evidence-support)", tint: "var(--surface-support)" },
};

/** Mirrors the source list the released evaluation ships with. */
const GRAPH_SOURCES = [
  {
    name: CITATIONS.reclassEvents.source,
    detail: "Disposition events, both periods",
    locator: CITATIONS.reclassEvents.locator,
  },
  {
    name: CITATIONS.dictionary.source,
    detail: "How yield is defined",
    locator: CITATIONS.dictionary.locator,
  },
];

const CLAIM = NORTHLINE_CLAIMS[0];
const RESIDUAL = NORTHLINE_CLAIMS[2];

/* ---------------------------------------------------------------- readiness */

const IN_PLACE = [
  "Row-level security policies on every table that holds candidate work, scoped to the organization that owns the session.",
  "Server-side reads check organization membership before a session, report or receipt is returned.",
  "A submission snapshot that the database itself refuses to let anyone edit after the fact.",
  "An append-only audit record of workspace actions.",
  "Versioned analysis outputs that preserve supporting events, counterevidence, confidence, model, prompt and rubric versions.",
  "Human review before evidence is published to an employer during the pilot.",
  "Managed Postgres with encryption at rest, in a single region.",
  "Synthetic scenario data. Northstar and Acme are fictional and are not modelled on customers.",
];

const NOT_YET = [
  "No SOC 2 report. We have not been audited and we will not imply that we have.",
  "No third-party penetration test to share yet.",
  "No automatic retention window. Evaluation data stays until you ask us to remove it, and removal is done by hand.",
  "No self-serve export. Ask and we will send it.",
  "No single sign-on, SCIM, or custom data residency.",
];

const NOT_CLAIMED = [
  "Fydell does not make, recommend, or rank a hire or reject decision.",
  "Fydell does not detect external AI use, screen sharing, or remote desktop control, and does not claim to.",
  "Fydell does not verify identity using biometrics.",
  "Fydell is not a certified psychometric instrument and is not presented as one.",
  "A platform failure during an attempt becomes a review state. It is never converted into a low score.",
];

/* ------------------------------------------------------------------- parts */

function StateToken({
  state,
  mutability,
}: {
  state: string;
  mutability: Mutability;
}) {
  const { Icon, ink, tint } = MUTABILITY[mutability];
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-[var(--radius-control)] border px-2 py-[3px] text-[12px]"
      style={{
        color: ink,
        background: tint,
        borderColor: "var(--border-subtle)",
      }}
    >
      <Icon size={12} aria-hidden className="shrink-0" />
      {state}
    </span>
  );
}

function PartyLabel({ index }: { index: number }) {
  const party = PARTIES[index];
  return (
    <span className="flex items-center gap-1.5 text-[var(--text-tertiary)]">
      <party.Icon size={13} aria-hidden className="shrink-0" />
      {party.name}
    </span>
  );
}

function AccessValue({ cell }: { cell: { value: Access; label: string } }) {
  const { Icon, ink, word } = ACCESS[cell.value];
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon size={13} aria-hidden className="shrink-0" style={{ color: ink }} />
      <span className={CELL_TONE[cell.value]}>{cell.label}</span>
      <span className="sr-only">, {word}</span>
    </span>
  );
}

function GraphNode({
  tone,
  Icon,
  stage,
  time,
  relation,
  children,
}: {
  tone: GraphTone;
  Icon: LucideIcon;
  stage: string;
  time: string;
  /** How this node connects to the next one. Absent on the last node. */
  relation?: string;
  children: ReactNode;
}) {
  const { ink, tint } = GRAPH_TONE[tone];
  return (
    <li className="flex gap-3">
      <div className="flex w-[26px] shrink-0 flex-col items-center">
        <span
          className={`${TILE} h-[26px] w-[26px]`}
          style={{ color: ink, background: tint, borderColor: ink }}
        >
          <Icon size={13} aria-hidden />
        </span>
        {relation ? (
          <span
            aria-hidden
            className="mt-1 w-px flex-1"
            style={{
              background: `color-mix(in srgb, ${ink} 34%, transparent)`,
            }}
          />
        ) : null}
      </div>
      <div className={`min-w-0 flex-1 ${relation ? "pb-1" : ""}`}>
        <div className="flex items-baseline gap-2">
          <p className={MICRO_LABEL} style={{ color: ink }}>
            {stage}
          </p>
          <span className="ml-auto shrink-0 text-[12px] tabular-nums text-[var(--text-tertiary)]">
            {time}
          </span>
        </div>
        <div className="mt-2">{children}</div>
        {relation ? (
          <p className="flex items-center gap-1.5 py-2.5 text-[12px] text-[var(--text-tertiary)]">
            <ArrowDown size={12} aria-hidden className="shrink-0" />
            {relation}
          </p>
        ) : null}
      </div>
    </li>
  );
}

/** Reads the graph for someone seeing it for the first time. */
const GRAPH_KEY: { tone: GraphTone; term: string; value: string }[] = [
  { tone: "source", term: "Source", value: "The material the candidate was given." },
  {
    tone: "action",
    term: "Candidate action",
    value: "What they did with it, recorded as it happened.",
  },
  {
    tone: "claim",
    term: "Claim",
    value: "The conclusion, carrying the lines it rests on.",
  },
  {
    tone: "limitation",
    term: "Limitation",
    value: "Where the claim stops, kept attached to it.",
  },
  {
    tone: "revision",
    term: "Revision",
    value: "What the candidate did once a fact changed.",
  },
  {
    tone: "judgment",
    term: "Employer judgment",
    value: "The decision Fydell does not make for you.",
  },
];

function GraphKey() {
  return (
    <dl className="mt-8">
      {GRAPH_KEY.map((row) => {
        const { ink, tint } = GRAPH_TONE[row.tone];
        return (
          <div
            key={row.term}
            className="flex gap-2.5 border-t border-[var(--border-subtle)] py-2.5 first:border-t-0 first:pt-0"
          >
            <span
              aria-hidden
              className="mt-[5px] h-[9px] w-[9px] shrink-0 rounded-[3px] border"
              style={{ background: tint, borderColor: ink }}
            />
            <dt className="shrink-0 text-[13px] font-medium text-[var(--text-primary)]">
              {row.term}
            </dt>
            <dd className="text-[13px] leading-[1.5] text-[var(--text-tertiary)]">
              {row.value}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export default function TrustPage() {
  const active = LIFECYCLE[CURRENT_STAGE];
  const activeMutability = MUTABILITY[active.mutability];

  return (
    <MarketingShell>
      <PageIntro
        title="Evidence you can inspect. Access you can control."
        lead="Workspace isolation, scoped invitations, frozen submissions and inspectable evidence are implemented today. Limitations stay on this page so they are not discovered in procurement, but they do not lead the product."
      />

      {/* Lifecycle. The state token is the point: it says where the record
          stops being changeable, which is the question an auditor asks. The
          rail is a visual overview of the same seven stages the list below
          carries semantically, so it is hidden from assistive technology. */}
      <section className={SECTION}>
        <div className="mkt-content">
          <div className="grid gap-4 lg:grid-cols-12 lg:gap-16">
            <h2 className="section-heading lg:col-span-5">
              The life of one evaluation
            </h2>
            <p className="section-desc lg:col-span-7 lg:pt-1">
              Seven stages, created in order. Each one carries the state of the
              record it produces, so you can see exactly where the trail stops
              being changeable.
            </p>
          </div>

          <figure
            className={`mt-10 m-0 ${FRAME}`}
            aria-label="Run lifecycle console for one evaluation, showing seven stages in order with the state of each record."
          >
            <div className={FRAME_BAR}>
              <span className="flex min-w-0 items-center gap-2">
                <History
                  size={13}
                  aria-hidden
                  className="shrink-0 text-[var(--text-tertiary)]"
                />
                <span className="text-[13px] font-medium text-[var(--text-primary)]">
                  Run lifecycle
                </span>
                <span className="hidden truncate text-[12px] text-[var(--text-tertiary)] sm:inline">
                  {NORTHLINE_SCENARIO.company} · {NORTHLINE_SCENARIO.role} ·
                  synthetic
                </span>
              </span>
              <span className="ml-auto shrink-0 text-[12px] tabular-nums text-[var(--text-tertiary)]">
                Stage 05 of 07
              </span>
            </div>

            {/* Horizontal rail at desktop width, vertical list everywhere. */}
            <ol
              aria-hidden
              className="hidden items-start border-b border-[var(--border-subtle)] px-4 pb-3.5 pt-4 lg:flex"
            >
              {LIFECYCLE.map((item, i) => {
                const tone = MUTABILITY[item.mutability];
                const isCurrent = i === CURRENT_STAGE;
                return (
                  <li key={item.step} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 pr-2">
                      <span
                        className={`${TILE} h-[26px] w-[26px]`}
                        style={{
                          color: tone.ink,
                          background: tone.tint,
                          borderColor: isCurrent
                            ? tone.ink
                            : "var(--border-subtle)",
                        }}
                      >
                        <item.Icon size={13} aria-hidden />
                      </span>
                      {i < LIFECYCLE.length - 1 ? (
                        <span className="h-px flex-1 bg-[var(--border-subtle)]" />
                      ) : null}
                    </div>
                    <p className="mt-2 text-[12px] tabular-nums text-[var(--text-tertiary)]">
                      {String(i + 1).padStart(2, "0")} · {item.time}
                    </p>
                    <p
                      className={`mt-0.5 pr-4 text-[13px] leading-[1.35] ${
                        isCurrent
                          ? "font-medium text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)]"
                      }`}
                    >
                      {item.step}
                    </p>
                  </li>
                );
              })}
            </ol>

            <div className="grid lg:grid-cols-[minmax(0,1fr)_272px]">
              <ol className="min-w-0">
                {LIFECYCLE.map((item, i) => {
                  const isCurrent = i === CURRENT_STAGE;
                  return (
                    <li
                      key={item.step}
                      aria-current={isCurrent ? "step" : undefined}
                      className={`flex gap-3 border-t border-[var(--border-subtle)] px-4 py-3 first:border-t-0 ${
                        isCurrent ? "bg-[var(--surface-selected)]" : ""
                      }`}
                    >
                      <div className="flex w-[26px] shrink-0 flex-col items-center">
                        <span
                          className={`${TILE} h-[26px] w-[26px]`}
                          style={{
                            color: MUTABILITY[item.mutability].ink,
                            background: MUTABILITY[item.mutability].tint,
                            borderColor: "var(--border-subtle)",
                          }}
                        >
                          <item.Icon size={13} aria-hidden />
                        </span>
                        {i < LIFECYCLE.length - 1 ? (
                          <span
                            aria-hidden
                            className="mt-1.5 w-px flex-1 bg-[var(--border-subtle)]"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                          <span className="text-[12px] tabular-nums text-[var(--text-tertiary)]">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <p className="text-[14px] font-medium text-[var(--text-primary)]">
                            {item.step}
                          </p>
                          <span className="text-[12px] tabular-nums text-[var(--text-tertiary)]">
                            {item.time}
                          </span>
                          {isCurrent ? (
                            <span
                              className="rounded-[var(--radius-tag)] px-1.5 py-px text-[12px] font-medium"
                              style={{
                                color: "var(--fydell-evidence)",
                                background: "var(--surface-intelligence)",
                              }}
                            >
                              Current
                            </span>
                          ) : null}
                          <span className="ml-auto">
                            <StateToken
                              state={item.state}
                              mutability={item.mutability}
                            />
                          </span>
                        </div>
                        <p className="mt-1.5 max-w-[62ch] text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                          {item.detail}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>

              {/* Active run detail. Narrow on purpose: it answers "what is
                  happening right now and what is it waiting on", nothing more. */}
              <aside className="border-t border-[var(--border-subtle)] bg-[var(--surface-deep)] px-4 py-3.5 lg:border-l lg:border-t-0">
                <p className={`${MICRO_LABEL} text-[var(--text-tertiary)]`}>
                  Active stage
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span
                    className={`${TILE} h-[26px] w-[26px]`}
                    style={{
                      color: activeMutability.ink,
                      background: activeMutability.tint,
                      borderColor: activeMutability.ink,
                    }}
                  >
                    <active.Icon size={13} aria-hidden />
                  </span>
                  <p className="text-[14px] font-medium text-[var(--text-primary)]">
                    {active.step}
                  </p>
                  <span className="ml-auto text-[12px] tabular-nums text-[var(--text-tertiary)]">
                    {active.time}
                  </span>
                </div>
                <dl className="mt-3.5">
                  {RUN_DETAIL.map((row) => (
                    <div
                      key={row.term}
                      className="border-t border-[var(--border-subtle)] py-2 first:border-t-0 first:pt-0"
                    >
                      <dt className="text-[12px] text-[var(--text-tertiary)]">
                        {row.term}
                      </dt>
                      <dd className="mt-0.5 text-[13px] leading-[1.5] text-[var(--text-secondary)]">
                        {row.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </aside>
            </div>

            <figcaption className="border-t border-[var(--border-subtle)] bg-[var(--surface-deep)] px-4 py-2.5 text-[12px] leading-[1.5] text-[var(--text-tertiary)]">
              The order and the states are how the system behaves. The clock
              times belong to a synthetic Northline Components run and are
              illustrative.
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Access matrix. A real table, so a screen reader reads "Work Receipt,
          any other company, None, no access" rather than a wall of loose
          cells. */}
      <section className={`${SECTION} ${BAND}`}>
        <div className="mkt-content">
          <h2 className="section-heading">Who can read what</h2>
          <p className="section-desc mt-4">
            There is no shared pool of candidates. A company sees the attempts it
            invited and nothing else, and that boundary is a policy on the table
            as well as a check in the code.
          </p>

          <div className={`mt-8 ${FRAME}`}>
            <div className={FRAME_BAR}>
              <span className="flex min-w-0 items-center gap-2">
                <ShieldCheck
                  size={13}
                  aria-hidden
                  className="shrink-0 text-[var(--text-tertiary)]"
                />
                <span className="text-[13px] font-medium text-[var(--text-primary)]">
                  Read access by artifact
                </span>
              </span>
              <span className="ml-auto shrink-0 text-[12px] text-[var(--text-tertiary)]">
                Row-level security, checked again on the server
              </span>
            </div>

            {/* Five columns need about 760px before the headers start wrapping
                into columns of single words, so below the desktop breakpoint
                the same data is restated as one block per artifact rather than
                left to scroll sideways. */}
            <ul className="lg:hidden">
              {MATRIX.map((row) => {
                const isInspected = row.artifact === INSPECTED_ARTIFACT;
                return (
                  <li
                    key={row.artifact}
                    className={`border-t border-[var(--border-subtle)] px-4 py-3 first:border-t-0 ${
                      isInspected ? "bg-[var(--surface-selected)]" : ""
                    }`}
                    /* Selection is carried by the surface tint and the
                       "Explained below" tag, not by an accent rule. */
                  >
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium text-[var(--text-primary)]">
                      {isInspected ? (
                        <span className="sr-only">Explained below: </span>
                      ) : null}
                      {row.artifact}
                      {isInspected ? (
                        <span
                          aria-hidden
                          className="rounded-[var(--radius-tag)] px-1.5 py-px text-[12px] font-medium"
                          style={{
                            color: "var(--fydell-evidence)",
                            background: "var(--surface-intelligence)",
                          }}
                        >
                          Explained below
                        </span>
                      ) : null}
                    </p>
                    <dl className="mt-2">
                      {row.cells.map((cell, i) => (
                        <div
                          key={PARTIES[i].name}
                          className="flex items-baseline justify-between gap-4 py-[3px] text-[12.5px]"
                        >
                          <dt className="min-w-0">
                            <PartyLabel index={i} />
                          </dt>
                          <dd className="text-right">
                            <AccessValue cell={cell} />
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </li>
                );
              })}
            </ul>

            <div
              role="region"
              aria-label="Read access by artifact"
              tabIndex={0}
              className="hidden overflow-x-auto lg:block"
            >
              <table className="w-full min-w-[760px] border-collapse text-left">
                <caption className="sr-only">
                  Read access to each artifact by party, as full, partial or no
                  access.
                </caption>
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    <th
                      scope="col"
                      className={`px-4 py-2.5 align-top ${MICRO_LABEL} text-[var(--text-tertiary)]`}
                    >
                      Artifact
                    </th>
                    {PARTIES.map((party) => (
                      <th
                        key={party.name}
                        scope="col"
                        className="px-4 py-2.5 align-top font-normal"
                      >
                        <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--text-primary)]">
                          <party.Icon
                            size={13}
                            aria-hidden
                            className="shrink-0 text-[var(--text-tertiary)]"
                          />
                          {party.name}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-[var(--text-tertiary)]">
                          {party.role}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {MATRIX.map((row) => {
                    const isInspected = row.artifact === INSPECTED_ARTIFACT;
                    return (
                      <tr
                        key={row.artifact}
                        className={`border-b border-[var(--border-subtle)] last:border-b-0 ${
                          isInspected ? "bg-[var(--surface-selected)]" : ""
                        }`}
                      >
                        <th
                          scope="row"
                          className="px-4 py-2.5 text-[13px] font-medium text-[var(--text-primary)]"
                        >
                          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            {isInspected ? (
                              <span className="sr-only">Explained below: </span>
                            ) : null}
                            {row.artifact}
                            {isInspected ? (
                              <span
                                aria-hidden
                                className="rounded-[var(--radius-tag)] px-1.5 py-px text-[12px] font-medium"
                                style={{
                                  color: "var(--fydell-evidence)",
                                  background: "var(--surface-intelligence)",
                                }}
                              >
                                Explained below
                              </span>
                            ) : null}
                          </span>
                        </th>
                        {row.cells.map((cell, i) => (
                          <td
                            key={PARTIES[i].name}
                            className="px-4 py-2.5 text-[13px]"
                          >
                            <AccessValue cell={cell} />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* The inspector carries the two boundaries the matrix can only
                gesture at: what a receipt is built from, and what a shared link
                is allowed to contain. */}
            <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-deep)] px-4 py-4">
              <p
                className={`flex items-center gap-1.5 ${MICRO_LABEL} text-[var(--text-tertiary)]`}
              >
                <Eye size={12} aria-hidden className="shrink-0" />
                Selected artifact · {INSPECTED_ARTIFACT}
              </p>
              <div className="mt-3 grid gap-x-12 gap-y-4 md:grid-cols-2">
                {INSPECTOR.map((item) => (
                  <div key={item.title}>
                    <p className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-primary)]">
                      <item.Icon
                        size={13}
                        aria-hidden
                        className="shrink-0 text-[var(--text-tertiary)]"
                      />
                      {item.title}
                    </p>
                    <p className="mt-1 max-w-[52ch] text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Lineage, shown rather than asserted. Six explicit nodes, the
          relationship between them written on the connector, and exactly one
          elevated surface: the claim under inspection. */}
      <section className={SECTION}>
        <div className="mkt-content grid items-start gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 className="section-heading">Where a claim comes from</h2>
            <p className="section-desc mt-4">
              A claim in a report is not a summary of a score. It names the
              material it rests on and carries the lines the candidate was
              looking at, so you can disagree with one claim without discarding
              the report.
            </p>
            <p className="section-desc mt-4">
              Alongside it, the session keeps an ordered record of what was
              opened, asked and changed. That record is what makes a limitation
              or a late revision legible instead of suspicious.
            </p>
            <GraphKey />
          </div>
          <div className="lg:col-span-7">
            <DesktopStage>
              <ProductStage
                title="Claim lineage"
                source={`${NORTHLINE_SCENARIO.company} · synthetic`}
                meta={
                  <span className="tabular-nums">14:22 — 17:05</span>
                }
                label="An evidence graph for one claim: source files, the candidate action, the claim and its cited lines, its limitation, the revision after a fact changed, and the employer judgment."
                footer={
                  <p className="px-1 text-[12px] leading-[1.5] text-[var(--text-tertiary)]">
                    Northline Components is a synthetic scenario. The lineage is
                    the one the product records; the clock times are
                    illustrative.
                  </p>
                }
              >
                <ol className="p-4">
                  <GraphNode
                    tone="source"
                    Icon={FileSpreadsheet}
                    stage="Source"
                    time="14:22"
                    relation="opened and read by the candidate"
                  >
                    <div className="overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-subtle)]">
                      {GRAPH_SOURCES.map((file) => (
                        <div
                          key={file.name}
                          className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 border-t border-[var(--border-subtle)] px-2.5 py-2 first:border-t-0"
                        >
                          <span className="font-mono text-[12px] text-[var(--text-primary)]">
                            {file.name}
                          </span>
                          <span className="text-[12px] text-[var(--text-tertiary)]">
                            {file.detail}
                          </span>
                          <span className="ml-auto shrink-0 rounded-[var(--radius-tag)] border border-[var(--border-subtle)] px-1.5 py-px text-[12px] tabular-nums text-[var(--text-tertiary)]">
                            {file.locator}
                          </span>
                        </div>
                      ))}
                    </div>
                  </GraphNode>

                  <GraphNode
                    tone="action"
                    Icon={Filter}
                    stage="Candidate action"
                    time="14:31"
                    relation="establishes"
                  >
                    <p className="text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                      {CLAIM.action}
                    </p>
                  </GraphNode>

                  <GraphNode
                    tone="claim"
                    Icon={Quote}
                    stage="Claim"
                    time="14:44"
                    relation="bounded by"
                  >
                    <div
                      className="overflow-hidden rounded-[var(--radius-panel)] border bg-[var(--surface-raised)]"
                      style={{
                        borderColor:
                          "color-mix(in srgb, var(--fydell-evidence) 40%, transparent)",
                        boxShadow: "var(--shadow-inspector)",
                      }}
                    >
                      <div
                        className="flex items-center gap-1.5 border-b px-3 py-2"
                        style={{
                          background: "var(--surface-intelligence)",
                          borderColor:
                            "color-mix(in srgb, var(--fydell-evidence) 24%, transparent)",
                        }}
                      >
                        <Quote
                          size={12}
                          aria-hidden
                          className="shrink-0"
                          style={{ color: "var(--fydell-evidence)" }}
                        />
                        <span
                          className="text-[12px] font-medium"
                          style={{ color: "var(--fydell-evidence)" }}
                        >
                          Selected claim
                        </span>
                        <span className="ml-auto text-[12px] tabular-nums text-[var(--text-tertiary)]">
                          {CLAIM.citations.length} citations
                        </span>
                      </div>
                      <div className="px-3 py-3">
                        <p className="text-[14.5px] font-medium leading-[1.45] text-[var(--text-primary)]">
                          {CLAIM.text}
                        </p>
                        <div className="mt-3 overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-subtle)] bg-[var(--surface-canvas)]">
                          <div className="flex items-baseline gap-2 border-b border-[var(--border-subtle)] px-2.5 py-1.5">
                            <span className="font-mono text-[12px] text-[var(--text-secondary)]">
                              {CITATIONS.reclassEvents.source}
                            </span>
                            <span className="ml-auto shrink-0 text-[12px] tabular-nums text-[var(--text-tertiary)]">
                              {CITATIONS.reclassEvents.locator}
                            </span>
                          </div>
                          <div className="overflow-x-auto px-2.5 py-2">
                            {CITATION_SOURCES.reclassEvents.map((line) => (
                              <p
                                key={line.text}
                                className="whitespace-pre rounded-[3px] px-1 font-mono text-[11.5px] leading-[1.75]"
                                style={
                                  line.highlight
                                    ? {
                                        color: "var(--text-primary)",
                                        background:
                                          "color-mix(in srgb, var(--fydell-evidence) 12%, transparent)",
                                      }
                                    : { color: "var(--text-tertiary)" }
                                }
                              >
                                {line.text}
                              </p>
                            ))}
                          </div>
                        </div>
                        <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[var(--text-tertiary)]">
                          <BookText
                            size={12}
                            aria-hidden
                            className="shrink-0"
                          />
                          {CITATIONS.dictionary.source} ·{" "}
                          {CITATIONS.dictionary.locator}
                        </p>
                      </div>
                    </div>
                  </GraphNode>

                  <GraphNode
                    tone="limitation"
                    Icon={TriangleAlert}
                    stage="Limitation"
                    time="15:02"
                    relation="reopened when a fact changed"
                  >
                    <div
                      className="rounded-[var(--radius-control)] border px-2.5 py-2"
                      style={{
                        background: "var(--surface-uncertain)",
                        borderColor: "var(--status-attention-line)",
                      }}
                    >
                      <p className="text-[13px] font-medium leading-[1.45] text-[var(--text-primary)]">
                        The L2 Day loss is not explained by reclassification.
                      </p>
                      <p className="mt-1 text-[12.5px] leading-[1.55] text-[var(--text-secondary)]">
                        {RESIDUAL.limitation}
                      </p>
                    </div>
                  </GraphNode>

                  <GraphNode
                    tone="revision"
                    Icon={RotateCcw}
                    stage="Revision"
                    time="16:13"
                    relation="reviewed by"
                  >
                    <div className="overflow-hidden rounded-[var(--radius-control)] border border-[var(--border-subtle)]">
                      <div
                        className="flex items-baseline gap-2 border-b border-[var(--border-subtle)] px-2.5 py-1.5"
                        style={{ background: "var(--surface-counter)" }}
                      >
                        <span
                          className="text-[12px] font-medium"
                          style={{ color: "var(--evidence-counter)" }}
                        >
                          {NORTHLINE_CHANGED_FACT.after.label}
                        </span>
                        <span className="ml-auto shrink-0 text-[12px] tabular-nums text-[var(--text-tertiary)]">
                          16:08
                        </span>
                      </div>
                      <p
                        className="px-2.5 py-2 text-[12.5px] leading-[1.55] text-[var(--text-secondary)]"
                        style={{ background: "var(--surface-counter)" }}
                      >
                        {NORTHLINE_CHANGED_FACT.after.text}
                      </p>
                      <p className="border-t border-[var(--border-subtle)] px-2.5 pb-1 pt-2 text-[12px] text-[var(--text-tertiary)]">
                        Candidate response · revised
                      </p>
                      <p className="px-2.5 pb-2 text-[13px] leading-[1.6] text-[var(--text-primary)]">
                        {NORTHLINE_CHANGED_FACT.responseText}
                      </p>
                    </div>
                  </GraphNode>

                  <GraphNode
                    tone="judgment"
                    Icon={Scale}
                    stage="Employer judgment"
                    time="17:05"
                  >
                    <div
                      className="rounded-[var(--radius-control)] border px-2.5 py-2"
                      style={{
                        background: "var(--surface-support)",
                        borderColor: "var(--status-positive-line)",
                      }}
                    >
                      <p className="text-[13px] font-medium leading-[1.45] text-[var(--text-primary)]">
                        Reviewer confirms the correction holds.
                      </p>
                      <p className="mt-1 text-[12.5px] leading-[1.55] text-[var(--text-secondary)]">
                        Human review happens before evidence is published to an
                        employer during the pilot. The hire decision stays with
                        the employer.
                      </p>
                    </div>
                  </GraphNode>
                </ol>
              </ProductStage>
            </DesktopStage>
          </div>
        </div>
      </section>

      <section className={`${SECTION} ${BAND}`}>
        <div className="mkt-content">
          <h2 className="section-heading">Security and legal readiness</h2>
          <p className="section-desc mt-4">
            Fydell is early. The left column is built and you can ask us to
            demonstrate any line of it. The right column is not, and we would
            rather you learn that here than in a security review.
          </p>
          <div className="mt-8 grid gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h3 className="text-[13px] font-medium text-[var(--text-primary)]">
                In place today
              </h3>
              <ul className="mt-4">
                {IN_PLACE.map((line) => (
                  <li
                    key={line}
                    className="flex gap-2.5 border-t border-[var(--border-subtle)] py-3 text-[13.5px] leading-[1.65] text-[var(--text-secondary)] first:border-t-0 first:pt-0"
                  >
                    <span
                      aria-hidden
                      className="mt-[9px] h-[7px] w-[7px] shrink-0 rounded-full border border-[var(--border-strong)] bg-[var(--surface-selected)]"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[13px] font-medium text-[var(--text-primary)]">
                Not yet
              </h3>
              <ul className="mt-4">
                {NOT_YET.map((line) => (
                  <li
                    key={line}
                    className="flex gap-2.5 border-t border-[var(--border-subtle)] py-3 text-[13.5px] leading-[1.65] text-[var(--text-secondary)] first:border-t-0 first:pt-0"
                  >
                    <span
                      aria-hidden
                      className="mt-[12px] h-px w-3 shrink-0 bg-[var(--border-strong)]"
                    />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content">
          <h2 className="section-heading">What Fydell does not claim</h2>
          <ul className="mt-6 grid gap-x-12 gap-y-3 lg:grid-cols-2">
            {NOT_CLAIMED.map((line) => (
              <li
                key={line}
                className="flex gap-2.5 text-[14px] leading-[1.65] text-[var(--text-secondary)]"
              >
                <span
                  aria-hidden
                  className="mt-[10px] h-px w-3 shrink-0 bg-[var(--border-strong)]"
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${SECTION} pb-24`}>
        <div className="mkt-content max-w-[620px]">
          <h2 className="section-heading">Questions about any of this?</h2>
          <p className="section-desc mt-4">
            Ask directly at <ContactLink />. If something on this page is not
            accurate, we would rather correct it than defend it.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
