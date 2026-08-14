import MarketingShell from "@/components/layout/MarketingShell";
import { ContactLink } from "@/components/ui/ContactLink";
import { ProductStage } from "@/components/fydell/ProductStage";
import { EvidenceTrace } from "@/components/fydell/EvidenceTrace";
import { CitationSource } from "@/components/fydell/CitationLink";
import {
  CITATIONS,
  CITATION_SOURCES,
  NORTHLINE_CLAIMS,
  NORTHLINE_TRACE,
} from "@/lib/fixtures/northline";

export const metadata = {
  title: "Trust",
  description:
    "The lifecycle of an evaluation, who can read each artefact, how a claim is tied to its source, and what Fydell does not have yet.",
};

const SECTION = "border-t border-[var(--border-subtle)] mkt-section-chapter";
const BAND = "bg-[var(--surface-band)]";

/**
 * Written against the implemented system, and audited against it before this
 * revision: the sim_* tables, their row-level security policies, the submission
 * trigger, and the scoring code.
 *
 * Two rules for this page. Everything asserted has a mechanism behind it, and
 * anything a buyer would reasonably assume we have but we do not is on the page
 * rather than discovered in procurement.
 */

const LIFECYCLE = [
  {
    step: "Invitation",
    detail:
      "Scoped to one email address and pinned to one published version of the evaluation. It carries an expiry date.",
    state: "Revocable until the candidate starts",
  },
  {
    step: "Session",
    detail:
      "Opening the invitation creates one session, and only one. A used invitation cannot open a second attempt.",
    state: "Active",
  },
  {
    step: "The attempt",
    detail:
      "What the candidate opens, asks, writes and cites is appended to the session as timestamped events. Progress saves as they work.",
    state: "Appending",
  },
  {
    step: "Submission",
    detail:
      "The answers are written as a snapshot. A database trigger rejects any later update or delete of that snapshot, including by us.",
    state: "Frozen",
  },
  {
    step: "Analysis",
    detail:
      "Rules in code run over the snapshot. No model decides the outcome, and the same snapshot always produces the same result.",
    state: "Reproducible",
  },
  {
    step: "Report and receipt",
    detail:
      "The employer report and the candidate's Work Receipt are assembled from that analysis.",
    state: "Readable, not editable",
  },
];

type Access = "full" | "partial" | "none";

const MATRIX: {
  artefact: string;
  cells: { value: Access; label: string }[];
}[] = [
  {
    artefact: "Invitation",
    cells: [
      { value: "partial", label: "Their own link" },
      { value: "full", label: "All of them" },
      { value: "none", label: "None" },
      { value: "none", label: "None" },
    ],
  },
  {
    artefact: "Session and recorded events",
    cells: [
      { value: "partial", label: "Their own" },
      { value: "full", label: "Full" },
      { value: "none", label: "None" },
      { value: "none", label: "None" },
    ],
  },
  {
    artefact: "Submitted answers",
    cells: [
      { value: "partial", label: "Their own" },
      { value: "full", label: "Full" },
      { value: "none", label: "None" },
      { value: "none", label: "None" },
    ],
  },
  {
    artefact: "Evidence report",
    cells: [
      { value: "partial", label: "Candidate view" },
      { value: "full", label: "Full" },
      { value: "none", label: "None" },
      { value: "none", label: "None" },
    ],
  },
  {
    artefact: "Work Receipt",
    cells: [
      { value: "full", label: "Full" },
      { value: "full", label: "Full" },
      { value: "none", label: "None" },
      { value: "none", label: "None" },
    ],
  },
  {
    artefact: "A link the candidate shares",
    cells: [
      { value: "full", label: "Creates and revokes" },
      { value: "full", label: "Full" },
      { value: "none", label: "None" },
      { value: "partial", label: "Chosen fields only" },
    ],
  },
];

const MATRIX_COLUMNS = [
  "The candidate",
  "The inviting company",
  "Any other company",
  "Someone holding a shared link",
];

const CELL_TONE: Record<Access, string> = {
  full: "text-[var(--text-primary)]",
  partial: "text-[var(--text-secondary)]",
  none: "text-[var(--text-tertiary)]",
};

const IN_PLACE = [
  "Row-level security policies on every table that holds candidate work, scoped to the organization that owns the session.",
  "Server-side reads check organization membership before a session, report or receipt is returned.",
  "A submission snapshot that the database itself refuses to let anyone edit after the fact.",
  "An append-only audit record of workspace actions.",
  "Scoring in plain code, with a test that scores the same submission twice and requires an identical result.",
  "Managed Postgres with encryption at rest, in a single region.",
  "Synthetic scenario data. Northline Components is fictional and is not modelled on a customer.",
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

function StateTag({ children }: { children: string }) {
  return (
    <span className="shrink-0 rounded-[var(--radius-control)] border border-[var(--border-subtle)] px-2 py-[3px] text-[12px] text-[var(--text-tertiary)]">
      {children}
    </span>
  );
}

export default function TrustPage() {
  return (
    <MarketingShell>
      <section className="pb-12 pt-[128px] sm:pt-[144px]">
        <div className="mkt-content">
          <p className="section-eyebrow">Trust</p>
          <h1 className="page-display mt-4">
            Evidence you can inspect. Access you can control.
          </h1>
          <p className="page-lead">
            Workspace isolation, scoped invitations, frozen submissions and
            inspectable evidence are implemented today. Limitations stay on this
            page so they are not discovered in procurement, but they do not lead
            the product.
          </p>
        </div>
      </section>

      {/* Lifecycle. The state column is the point: it says where the record
          stops being changeable, which is the question an auditor asks. */}
      <section className={SECTION}>
        <div className="mkt-content grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h2 className="section-heading">The life of one evaluation</h2>
            <p className="mt-4 max-w-[42ch] text-[16px] leading-[1.65] text-[var(--text-secondary)]">
              Six records, created in order. The right-hand tag says whether that
              record can still change.
            </p>
          </div>
          <div className="lg:col-span-8">
            <ol className="overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)]">
              {LIFECYCLE.map((item, i) => (
                <li
                  key={item.step}
                  className="flex gap-4 border-t border-[var(--border-subtle)] px-4 py-3.5 first:border-t-0"
                >
                  <span
                    aria-hidden
                    className="mt-[3px] inline-flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-[6px] border border-[var(--border-default)] text-[11.5px] tabular-nums text-[var(--text-tertiary)]"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-[14.5px] font-medium text-[var(--text-primary)]">
                        {item.step}
                      </p>
                      <StateTag>{item.state}</StateTag>
                    </div>
                    <p className="mt-1 max-w-[62ch] text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* Access matrix. A real table, so a screen reader reads "Work Receipt,
          any other company, None" rather than a wall of loose cells. */}
      <section className={`${SECTION} ${BAND}`}>
        <div className="mkt-content">
          <h2 className="section-heading">Who can read what</h2>
          <p className="mt-4 max-w-[58ch] text-[16px] leading-[1.65] text-[var(--text-secondary)]">
            There is no shared pool of candidates. A company sees the attempts it
            invited and nothing else, and that boundary is a policy on the table
            as well as a check in the code.
          </p>

          {/* Below the table's natural width a grid becomes a puzzle, so the
              same data is restated as one block per artefact rather than left
              to scroll sideways. */}
          <ul className="mt-8 overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] md:hidden">
            {MATRIX.map((row) => (
              <li
                key={row.artefact}
                className="border-t border-[var(--border-subtle)] px-4 py-3.5 first:border-t-0"
              >
                <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
                  {row.artefact}
                </p>
                <dl className="mt-2">
                  {row.cells.map((cell, i) => (
                    <div
                      key={MATRIX_COLUMNS[i]}
                      className="flex items-baseline justify-between gap-4 py-[3px]"
                    >
                      <dt className="text-[12.5px] text-[var(--text-tertiary)]">
                        {MATRIX_COLUMNS[i]}
                      </dt>
                      <dd
                        className={`text-right text-[12.5px] ${CELL_TONE[cell.value]}`}
                      >
                        {cell.label}
                      </dd>
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>

          <div className="mt-8 hidden overflow-x-auto rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] md:block">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <caption className="sr-only">
                Read access to each artefact by party.
              </caption>
              <thead>
                <tr className="border-b border-[var(--border-subtle)]">
                  <th
                    scope="col"
                    className="px-4 py-3 text-[12px] font-medium text-[var(--text-tertiary)]"
                  >
                    Artefact
                  </th>
                  {MATRIX_COLUMNS.map((col) => (
                    <th
                      key={col}
                      scope="col"
                      className="px-4 py-3 text-[12px] font-medium text-[var(--text-tertiary)]"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MATRIX.map((row) => (
                  <tr
                    key={row.artefact}
                    className="border-b border-[var(--border-subtle)] last:border-b-0"
                  >
                    <th
                      scope="row"
                      className="px-4 py-3 text-[13.5px] font-medium text-[var(--text-primary)]"
                    >
                      {row.artefact}
                    </th>
                    {row.cells.map((cell, i) => (
                      <td
                        key={MATRIX_COLUMNS[i]}
                        className={`px-4 py-3 text-[13px] ${CELL_TONE[cell.value]}`}
                      >
                        {cell.label}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-4 max-w-[68ch] text-[13.5px] leading-[1.65] text-[var(--text-tertiary)]">
            The candidate view of a result is generated separately from the
            employer view. It does not include the answer key for the evaluation,
            the reviewer&apos;s notes, or the hiring decision. A shared link
            carries only the fields the candidate selected, stops working at the
            date they set, and can be revoked afterwards.
          </p>
        </div>
      </section>

      {/* Lineage, shown rather than asserted. */}
      <section className={SECTION}>
        <div className="mkt-content grid items-start gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 className="section-heading">Where a claim comes from</h2>
            <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.65] text-[var(--text-secondary)]">
              A claim in a report is not a summary of a score. It names the
              material it rests on and carries the lines the candidate was
              looking at, so you can disagree with one claim without discarding
              the report.
            </p>
            <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.65] text-[var(--text-secondary)]">
              Alongside it, the session keeps an ordered record of what was
              opened, asked and changed. That record is what makes a limitation
              or a late revision legible instead of suspicious.
            </p>
          </div>
          <div className="lg:col-span-7">
            <ProductStage
              title="One claim, traced"
              source="Northline Components · synthetic"
              label="A claim, the excerpt it rests on, and the stages of the session behind it"
            >
              <div className="border-b border-[var(--border-subtle)] p-4">
                <p className="border-l-2 border-[var(--fydell-risk)] pl-3 text-[13.5px] leading-[1.5] text-[var(--text-primary)]">
                  {NORTHLINE_CLAIMS[2].text}
                </p>
                <div className="mt-3">
                  <CitationSource
                    citation={CITATIONS.residualScrap}
                    lines={CITATION_SOURCES.residualScrap}
                  />
                </div>
              </div>
              <div className="p-4">
                <EvidenceTrace
                  nodes={NORTHLINE_TRACE}
                  orientation="vertical"
                  caption="The stages recorded for this session, from source material to employer judgment."
                />
              </div>
            </ProductStage>
          </div>
        </div>
      </section>

      <section className={`${SECTION} ${BAND}`}>
        <div className="mkt-content">
          <h2 className="section-heading">Security and legal readiness</h2>
          <p className="mt-4 max-w-[58ch] text-[16px] leading-[1.65] text-[var(--text-secondary)]">
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
                      className="mt-[9px] h-[7px] w-[7px] shrink-0 rounded-full border border-[rgba(107,140,255,0.5)] bg-[rgba(107,140,255,0.2)]"
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
          <p className="mt-4 text-[16px] leading-[1.65] text-[var(--text-secondary)]">
            Ask directly at <ContactLink />. If something on this page is not
            accurate, we would rather correct it than defend it.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
