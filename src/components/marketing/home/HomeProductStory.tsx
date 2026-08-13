import { ButtonLink } from "@/components/marketing/ui";
import { ProductStage, StageDescription } from "@/components/fydell/ProductStage";
import { ChangedFactsDiff } from "@/components/fydell/ChangedFactsDiff";
import { ReportInspector } from "@/components/fydell/ReportInspector";
import { EvidenceTrace } from "@/components/fydell/EvidenceTrace";
import {
  NORTHLINE_DEFENSE_PROMPT,
  NORTHLINE_RECEIPT,
  NORTHLINE_RESOURCES,
  NORTHLINE_SCENARIO,
  NORTHLINE_TRACE,
} from "@/lib/fixtures/northline";

/**
 * The employer narrative after the hero.
 *
 * Five chapters, each with one job and its own composition. The previous
 * version ran every chapter as the same copy-left / scene-right split, which
 * made a long page read as one repeated slide. Here the compositions are:
 *
 *   1  dominant stage      the task, shown full width
 *   2  evidence split      the changed fact beside its explanation
 *   3  dominant stage      the report, with its trace alongside
 *   4  compact editorial   the follow-up question, given room to be read
 *   5  structured grid     what the receipt contains and who can see it
 *
 * Alternate chapters sit on the band surface so the page separates into parts
 * without alternating light and dark.
 */

const DIVIDE = "border-t border-[var(--border-subtle)]";
const BAND = "bg-[var(--surface-band)]";
const CHAPTER = `${DIVIDE} mkt-section-chapter`;

function ChapterHeading({
  index,
  heading,
  body,
  className = "",
}: {
  index: number;
  heading: string;
  body: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[12.5px] tabular-nums text-[var(--text-tertiary)]">
        {index} of 5
      </p>
      <h2 className="section-heading mt-2.5">{heading}</h2>
      <p className="mt-4 max-w-[52ch] text-[16px] leading-[1.65] text-[var(--text-secondary)]">
        {body}
      </p>
    </div>
  );
}

export default function HomeProductStory() {
  return (
    <>
      {/* 1. The task is work-shaped. */}
      <section className={CHAPTER}>
        <div className="mkt-content">
          <ChapterHeading
            index={1}
            heading="The task is shaped like the job"
            body="One business question, three real files, and a written definition of the metric everyone is arguing about. No multiple choice, and nothing that rewards guessing what the grader wants."
          />
          <div className="mt-9">
            <ProductStage
              title="Evaluation brief"
              source={`${NORTHLINE_SCENARIO.company} · synthetic`}
              label="The evaluation brief a candidate opens, with the business question and the files provided"
              meta={
                <span className="tabular-nums">
                  {NORTHLINE_SCENARIO.duration}
                </span>
              }
            >
              <div className="grid lg:grid-cols-[minmax(0,1fr)_340px]">
                <div className="border-b border-[var(--border-subtle)] p-5 lg:border-b-0 lg:border-r">
                  <p className="text-[11.5px] font-medium text-[var(--text-tertiary)]">
                    Business question
                  </p>
                  <p className="mt-2 max-w-[46ch] text-[15px] leading-[1.55] text-[var(--text-primary)]">
                    {NORTHLINE_SCENARIO.question}
                  </p>
                  <p className="mt-5 text-[11.5px] font-medium text-[var(--text-tertiary)]">
                    What to hand back
                  </p>
                  <p className="mt-2 max-w-[46ch] text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
                    A written conclusion, the claims it rests on, and a citation
                    for each one.
                  </p>
                </div>
                <div className="p-5">
                  <p className="text-[11.5px] font-medium text-[var(--text-tertiary)]">
                    Provided
                  </p>
                  <ul className="mt-2.5 space-y-2.5">
                    {NORTHLINE_RESOURCES.map((r) => (
                      <li key={r.name}>
                        <p className="text-[13px] text-[var(--text-primary)]">
                          {r.name}
                        </p>
                        <p className="mt-0.5 text-[12px] leading-[1.5] text-[var(--text-tertiary)]">
                          {r.detail}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <StageDescription>
                The brief asks whether a fall in reported yield is a real
                production problem or a change in how it was measured. The
                candidate is given a production run file, a quality events file,
                and the written definition of yield.
              </StageDescription>
            </ProductStage>
          </div>
        </div>
      </section>

      {/* 2. The facts can change. */}
      <section className={`${CHAPTER} ${BAND}`}>
        <div className="mkt-content grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
          <ChapterHeading
            className="lg:col-span-5"
            index={2}
            heading="Then one fact changes"
            body="Part way through, the candidate learns something that undercuts the conclusion they already wrote. What they do next is the part of the evaluation that is hardest to fake."
          />
          <div className="min-w-0 lg:col-span-7">
            <ChangedFactsDiff />
          </div>
        </div>
      </section>

      {/* 3. The evidence is inspectable. */}
      <section className={CHAPTER}>
        <div className="mkt-content">
          <ChapterHeading
            index={3}
            heading="Every claim opens onto its source"
            body="You read the conclusion first. Then you open any claim and see the candidate action behind it, the exact rows it cites, and where the candidate said the evidence runs out."
          />
          <div className="mt-9 grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-12">
            <ProductStage
              title="Evidence report"
              source={`${NORTHLINE_SCENARIO.company} · synthetic`}
              label="The employer report, with each claim openable to its cited source"
            >
              <ReportInspector />
            </ProductStage>
            <div className="lg:pt-2">
              <p className="text-[11.5px] font-medium text-[var(--text-tertiary)]">
                The trace behind this report
              </p>
              <EvidenceTrace
                nodes={NORTHLINE_TRACE}
                orientation="vertical"
                className="mt-4"
                caption="The full path from source material to employer judgment."
              />
            </div>
          </div>
        </div>
      </section>

      {/* 4. The follow-up is earned. */}
      <section className={`${CHAPTER} ${BAND}`}>
        <div className="mkt-content max-w-[760px]">
          <ChapterHeading
            index={4}
            heading="The interview starts where the evidence stops"
            body="The follow-up question comes from a limitation the candidate wrote down themselves, so the conversation begins at the edge of what they actually established."
          />
          <div className="mt-8 rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 sm:p-6">
            <p className="text-[11.5px] font-medium text-[var(--text-tertiary)]">
              Limitation the candidate recorded
            </p>
            <p className="mt-2 border-l-2 border-[var(--fydell-risk)] pl-3 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
              {NORTHLINE_DEFENSE_PROMPT.tiedTo}
            </p>
            <p className="mt-6 text-[11.5px] font-medium text-[var(--text-tertiary)]">
              Follow-up question
            </p>
            <p className="mt-2 text-[17px] leading-[1.5] text-[var(--text-primary)]">
              {NORTHLINE_DEFENSE_PROMPT.question}
            </p>
          </div>
        </div>
      </section>

      {/* 5. The candidate controls the receipt. */}
      <section className={CHAPTER}>
        <div className="mkt-content">
          <ChapterHeading
            index={5}
            heading="The candidate keeps their own copy"
            body="A Work Receipt is the candidate's record of what they did. It is private to them and to the company that invited them, and it is not a public profile."
          />
          <div className="mt-8 max-w-[900px]">
            <ProductStage
              title="Work Receipt"
              source={NORTHLINE_SCENARIO.evaluation}
              label="A candidate Work Receipt, showing what it contains and who can read it"
            >
              <div className="grid sm:grid-cols-2">
                <div className="border-b border-[var(--border-subtle)] sm:border-b-0 sm:border-r">
                  <p className="px-4 pb-1 pt-3 text-[11.5px] font-medium text-[var(--text-tertiary)]">
                    What it contains
                  </p>
                  <ul>
                    {NORTHLINE_RECEIPT.includes.map((item) => (
                      <li
                        key={item.label}
                        className="flex items-center justify-between gap-4 px-4 py-2"
                      >
                        <span
                          className={`text-[12.5px] ${
                            item.included
                              ? "text-[var(--text-secondary)]"
                              : "text-[var(--text-tertiary)]"
                          }`}
                        >
                          {item.label}
                        </span>
                        <span
                          className={`shrink-0 text-[11.5px] ${
                            item.included
                              ? "text-[var(--text-primary)]"
                              : "text-[var(--text-tertiary)]"
                          }`}
                        >
                          {item.included ? "Included" : "Not included"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="px-4 pb-1 pt-3 text-[11.5px] font-medium text-[var(--text-tertiary)]">
                    Who can read it
                  </p>
                  <ul>
                    {NORTHLINE_RECEIPT.access.map((row) => (
                      <li
                        key={row.party}
                        className="flex items-center justify-between gap-4 px-4 py-2"
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
                </div>
              </div>
            </ProductStage>
          </div>
        </div>
      </section>

      <section className={`${DIVIDE} ${BAND} mkt-section pb-24`}>
        <div className="mkt-content max-w-[640px]">
          <h2 className="section-heading">Run it on one real role.</h2>
          <p className="mt-4 text-[16px] leading-[1.65] text-[var(--text-secondary)]">
            Create a workspace, invite a candidate, and read the report. There
            is one evaluation, built properly, rather than a catalogue of short
            tests.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup" variant="primary">
              Create your workspace
            </ButtonLink>
            <ButtonLink href="/simulations" variant="secondary">
              See the evaluation
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
