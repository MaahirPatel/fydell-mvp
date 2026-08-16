import MarketingShell from "@/components/layout/MarketingShell";
import ClosingCTA from "@/components/marketing/ClosingCTA";
import { ButtonLink } from "@/components/marketing/ui";
import { ProductStage, StageDescription } from "@/components/fydell/ProductStage";
import { ReportInspector } from "@/components/fydell/ReportInspector";
import EvidenceWalkthrough from "@/components/marketing/product/EvidenceWalkthrough";
import {
  NORTHLINE_DEFENSE_PROMPT,
  NORTHLINE_RECEIPT,
  NORTHLINE_SCENARIO,
} from "@/lib/fixtures/northline";

export const metadata = {
  title: "Product",
  description:
    "How Fydell works end to end: set up the evaluation, watch a candidate's work become cited evidence, then review the report, run the follow-up, and return the candidate their receipt.",
};

/**
 * Three chapters, not ten questions.
 *
 * The previous version answered nine buyer questions at equal weight, which
 * made a 4800px page with one visual rhythm. A buyer does not have nine
 * questions, they have three: what do I set up, what does it actually do, and
 * what do I get back. Each chapter here owns one of those and carries the
 * product scene that answers it.
 */

const CHAPTER = "border-t border-[var(--border-subtle)] mkt-section-chapter";
const BAND = "bg-[var(--surface-band)]";

function ChapterHead({
  eyebrow,
  title,
  body,
  className = "",
}: {
  eyebrow: string;
  title: string;
  body: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="section-eyebrow">{eyebrow}</p>
      <h2 className="section-heading mt-3">{title}</h2>
      <p className="mt-5 max-w-[46ch] text-[1.2rem] leading-[1.55] text-[var(--text-secondary)]">
        {body}
      </p>
    </div>
  );
}

const SETUP = [
  {
    label: "Evaluation",
    value: NORTHLINE_SCENARIO.evaluation,
    note: "Maintained by Fydell. Read-only.",
  },
  { label: "Role", value: NORTHLINE_SCENARIO.role, note: null },
  {
    label: "Working time",
    value: NORTHLINE_SCENARIO.duration,
    note: "One sitting. Progress saves as they go.",
  },
  {
    label: "Scenario",
    value: `${NORTHLINE_SCENARIO.company}, synthetic`,
    note: "A fictional manufacturer, not a customer.",
  },
];

const STAGES = [
  "Investigate the files",
  "Write a conclusion",
  "Receive changed information",
  "Revise or defend",
  "Submit",
];

const BOUNDARIES = [
  "It does not make or recommend a hire or reject decision.",
  "It does not claim to detect external AI use, screen sharing, or remote desktop control.",
  "It does not verify identity by biometrics.",
  "It does not produce a single opaque score that stands in for the evidence.",
  "It does not turn a platform failure into a bad result for the candidate.",
];

export default function ProductPage() {
  return (
    <MarketingShell>
      <section className="pb-12 pt-[128px] sm:pt-[144px]">
        <div className="mkt-content">
          <p className="section-eyebrow">Product</p>
          <h1 className="page-display mt-4">
            An evaluation you can audit, not a score you have to trust.
          </h1>
          <p className="page-lead">
            A candidate does a piece of real work. Your team reads what they
            concluded, opens the evidence behind it, and interviews from there.
            Nothing in the report is a number you cannot trace back to a row.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <ButtonLink href="/request-pilot" variant="primary">
              Request a pilot
            </ButtonLink>
            <a
              href="/simulations"
              className="text-[15px] text-[var(--text-secondary)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline"
            >
              See the evaluation
            </a>
          </div>
        </div>
      </section>

      {/* Chapter 1: set the evaluation. */}
      <section className={CHAPTER}>
        <div className="mkt-content">
          <ChapterHead
            eyebrow="Setup"
            title="Set the evaluation"
            body="There is one released evaluation and Fydell maintains it. You choose the role you are hiring for, check what it measures, and invite candidates to it. You are not asked to author a test."
          />
          <div className="mt-9 grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
            <ProductStage
              title="Evaluation setup"
              label="The evaluation an employer selects, shown read-only"
            >
              <dl className="divide-y divide-[var(--border-subtle)]">
                {SETUP.map((row) => (
                  <div key={row.label} className="px-4 py-2.5">
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-[12px] text-[var(--text-tertiary)]">
                        {row.label}
                      </dt>
                      <dd className="text-right text-[13px] text-[var(--text-primary)]">
                        {row.value}
                      </dd>
                    </div>
                    {row.note ? (
                      <p className="mt-0.5 text-right text-[11.5px] text-[var(--text-tertiary)]">
                        {row.note}
                      </p>
                    ) : null}
                  </div>
                ))}
              </dl>
              <StageDescription>
                The released evaluation is the Operations performance
                investigation for a Data Analyst, lasting twenty minutes, set in
                a synthetic scenario. Employers select it; they do not edit it.
              </StageDescription>
            </ProductStage>

            <ProductStage
              title="What the candidate moves through"
              label="The five stages of the evaluation"
            >
              <ol className="divide-y divide-[var(--border-subtle)]">
                {STAGES.map((stage, i) => (
                  <li key={stage} className="flex items-center gap-3 px-4 py-2.5">
                    <span
                      aria-hidden
                      className="inline-flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-[5px] border border-[var(--border-default)] text-[11px] tabular-nums text-[var(--text-tertiary)]"
                    >
                      {i + 1}
                    </span>
                    <span className="text-[13px] text-[var(--text-secondary)]">
                      {stage}
                    </span>
                  </li>
                ))}
              </ol>
            </ProductStage>
          </div>

          <p className="mt-5 max-w-[62ch] text-[13.5px] leading-[1.65] text-[var(--text-tertiary)]">
            Invitations are single-use, scoped to one candidate, and expire. When
            you are running several candidates against the same evaluation, they
            group into a cohort so you can look at them together. A cohort lives
            inside an evaluation; it is not a separate part of the product.
          </p>
        </div>
      </section>

      {/* Chapter 2: watch work become evidence. */}
      <section className={`${CHAPTER} ${BAND}`}>
        <div className="mkt-content">
          <ChapterHead
            eyebrow="Evidence"
            title="Watch work become evidence"
            body="This is the part that is hard to describe and easy to show. Step through one candidate's session and see how a file they opened turns into a claim you can check."
          />
          <div className="mt-9">
            <EvidenceWalkthrough />
          </div>
        </div>
      </section>

      {/* Chapter 3: review, follow up, return the receipt. */}
      <section className={CHAPTER}>
        <div className="mkt-content">
          <ChapterHead
            eyebrow="What you receive"
            title="Review, follow up, and return the receipt"
            body="You get a report that leads with the candidate's conclusion, opens to its sources, and says where it stops. The follow-up question comes from that stopping point, and the candidate keeps their own copy of the work."
          />

          <div className="mt-9">
            <ProductStage
              chrome="app"
              title="Evidence report"
              source={`${NORTHLINE_SCENARIO.company} · synthetic`}
              label="The employer report with each claim openable to its cited source"
              meta={<span>Review required</span>}
            >
              <ReportInspector />
            </ProductStage>
          </div>

          <div className="mt-5 grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
            <ProductStage
              title="Follow-up, earned by the work"
              label="An oral defense question derived from a limitation in the candidate's own report"
            >
              <div className="p-4">
                <p className="text-[11.5px] font-medium text-[var(--text-tertiary)]">
                  Because the candidate wrote
                </p>
                <p className="mt-1.5 border-l-2 border-[var(--fydell-risk)] pl-2.5 text-[12.5px] leading-[1.55] text-[var(--text-secondary)]">
                  {NORTHLINE_DEFENSE_PROMPT.tiedTo}
                </p>
                <p className="mt-4 text-[11.5px] font-medium text-[var(--text-tertiary)]">
                  Ask them
                </p>
                <p className="mt-1.5 text-[14px] leading-[1.5] text-[var(--text-primary)]">
                  {NORTHLINE_DEFENSE_PROMPT.question}
                </p>
              </div>
            </ProductStage>

            <ProductStage
              title="Work Receipt"
              source="The candidate's copy"
              label="What the candidate's Work Receipt contains and who can read it"
            >
              <ul className="divide-y divide-[var(--border-subtle)]">
                {NORTHLINE_RECEIPT.access.map((row) => (
                  <li
                    key={row.party}
                    className="flex items-center justify-between gap-4 px-4 py-2.5"
                  >
                    <span className="text-[12.5px] text-[var(--text-secondary)]">
                      {row.party}
                    </span>
                    <span
                      className={`shrink-0 text-[11.5px] ${
                        row.state === "No access"
                          ? "text-[var(--text-tertiary)]"
                          : "text-[var(--text-primary)]"
                      }`}
                    >
                      {row.state}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="border-t border-[var(--border-subtle)] px-4 py-3 text-[12px] leading-[1.55] text-[var(--text-tertiary)]">
                The receipt is private to the candidate and the company that
                invited them. It is not a public profile and it is not listed
                anywhere.
              </p>
            </ProductStage>
          </div>
        </div>
      </section>

      {/* Boundaries, as a calm list rather than a disclaimer wall. */}
      <section className={`${CHAPTER} ${BAND}`}>
        <div className="mkt-content">
          <h2 className="section-heading">Where Fydell stops</h2>
          <ul className="mt-6 grid gap-x-10 gap-y-3 sm:grid-cols-2">
            {BOUNDARIES.map((line) => (
              <li
                key={line}
                className="flex gap-2.5 text-[14px] leading-[1.6] text-[var(--text-secondary)]"
              >
                <span
                  aria-hidden
                  className="mt-[9px] h-px w-3 shrink-0 bg-[var(--border-strong)]"
                />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <ClosingCTA
        title="Try it on one role."
        body="Run the evaluation against the role you are hiring for, then read the report your team would read."
        primary={{ href: "/request-pilot", label: "Request a pilot" }}
        secondary={{ href: "/simulations", label: "See the evaluation" }}
      />
    </MarketingShell>
  );
}
