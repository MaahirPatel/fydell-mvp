import ClosingCTA from "@/components/marketing/ClosingCTA";
import { ProductStage, StageDescription } from "@/components/fydell/ProductStage";
import { ProductSpotlight } from "@/components/fydell/ProductSpotlight";
import { ChangedFactsDiff } from "@/components/fydell/ChangedFactsDiff";
import { ReportInspector } from "@/components/fydell/ReportInspector";
import HeroSimPreview from "@/components/marketing/home/HeroSimPreview";
import {
  NORTHLINE_DEFENSE_PROMPT,
  NORTHLINE_RECEIPT,
  NORTHLINE_RESOURCES,
  NORTHLINE_SCENARIO,
} from "@/lib/fixtures/northline";

const DIVIDE = "border-t border-[var(--border-subtle)]";
const BAND = "bg-[var(--surface-band)]";
const CHAPTER = `${DIVIDE} mkt-section-chapter`;

function ChapterHeading({
  eyebrow,
  heading,
  body,
}: {
  eyebrow: string;
  heading: string;
  body: string;
}) {
  return (
    <div className="max-w-[720px]">
      <p className="section-eyebrow">{eyebrow}</p>
      <h2 className="section-heading mt-3">{heading}</h2>
      <p className="mt-5 max-w-[46ch] text-[1.2rem] leading-[1.55] text-[var(--text-secondary)]">
        {body}
      </p>
    </div>
  );
}

export default function HomeProductStory() {
  return (
    <>
      <section className={CHAPTER}>
        <div className="mkt-content">
          <ChapterHeading
            eyebrow="Work simulation"
            heading="The task is shaped like the job"
            body="One business question, three real files, and a written definition of the metric everyone is arguing about. No multiple choice."
          />
          <ProductSpotlight intensity="soft" className="mt-12">
            <HeroSimPreview />
          </ProductSpotlight>
        </div>
      </section>

      <section className={`${CHAPTER} ${BAND}`}>
        <div className="mkt-content">
          <ChapterHeading
            eyebrow="Evidence under pressure"
            heading="Then one fact changes"
            body="Part way through, the candidate learns something that undercuts the conclusion they already wrote. What they do next is the part that is hardest to fake."
          />
          <div className="mt-12">
            <ChangedFactsDiff />
          </div>
        </div>
      </section>

      <section className={CHAPTER}>
        <div className="mkt-content">
          <ChapterHeading
            eyebrow="Auditable conclusions"
            heading="Every claim opens onto its source"
            body="You read the conclusion first. Then you open any claim and see the candidate action behind it, the exact rows it cites, and where the evidence runs out."
          />
          <ProductSpotlight intensity="soft" className="mt-12">
            <ProductStage
              chrome="app"
              title="Evidence report"
              source={`${NORTHLINE_SCENARIO.company} · synthetic`}
              label="The employer report, with each claim openable to its cited source"
            >
              <ReportInspector />
              <StageDescription>
                An employer opening a claim to the cited source rows and the
                candidate action that produced it.
              </StageDescription>
            </ProductStage>
          </ProductSpotlight>
        </div>
      </section>

      <section className={`${CHAPTER} ${BAND}`}>
        <div className="mkt-content">
          <ChapterHeading
            eyebrow="Interview from the work"
            heading="The interview starts where the evidence stops"
            body="The follow-up question comes from a limitation the candidate wrote down themselves, so the conversation begins at the edge of what they actually established."
          />
          <div className="mt-12 max-w-[900px] rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-6 sm:p-8">
            <p className="text-[13px] font-medium text-[var(--text-tertiary)]">
              Limitation the candidate recorded
            </p>
            <p className="mt-3 text-[15px] leading-[1.6] text-[var(--text-secondary)]">
              {NORTHLINE_DEFENSE_PROMPT.tiedTo}
            </p>
            <p className="mt-8 text-[13px] font-medium text-[var(--text-tertiary)]">
              Follow-up question
            </p>
            <p className="mt-3 text-[22px] leading-[1.35] tracking-[-0.02em] text-[var(--text-primary)]">
              {NORTHLINE_DEFENSE_PROMPT.question}
            </p>
          </div>
        </div>
      </section>

      <section className={CHAPTER}>
        <div className="mkt-content">
          <ChapterHeading
            eyebrow="Portable work record"
            heading="The candidate keeps their own copy"
            body="A Work Receipt is the candidate's record of what they did. It is private to them and to the company that invited them, and it is not a public profile."
          />
          <div className="mt-12">
            <ProductStage
              title="Work Receipt"
              source={NORTHLINE_SCENARIO.evaluation}
              label="A candidate Work Receipt, showing what it contains and who can read it"
            >
              <div className="grid sm:grid-cols-2">
                <div className="border-b border-[var(--border-subtle)] sm:border-b-0 sm:border-r">
                  <p className="px-5 pb-1 pt-4 text-[12.5px] font-medium text-[var(--text-tertiary)]">
                    What it contains
                  </p>
                  <ul>
                    {NORTHLINE_RECEIPT.includes.map((item) => (
                      <li
                        key={item.label}
                        className="flex items-center justify-between gap-4 px-5 py-2.5"
                      >
                        <span className="text-[14px] text-[var(--text-secondary)]">
                          {item.label}
                        </span>
                        <span className="shrink-0 text-[13px] text-[var(--text-primary)]">
                          {item.included ? "Included" : "Not included"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="px-5 pb-1 pt-4 text-[12.5px] font-medium text-[var(--text-tertiary)]">
                    Who can read it
                  </p>
                  <ul>
                    {NORTHLINE_RECEIPT.access.map((row) => (
                      <li
                        key={row.party}
                        className="flex items-center justify-between gap-4 px-5 py-2.5"
                      >
                        <span className="text-[14px] text-[var(--text-secondary)]">
                          {row.party}
                        </span>
                        <span className="shrink-0 text-[13px] text-[var(--text-primary)]">
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

      <ClosingCTA
        eyebrow="Start with one role"
        title="Run it on one real hire."
        body="Request a pilot, invite a Data Analyst candidate, and read the evidence report. There is one evaluation, built properly."
        note={`Provided materials include ${NORTHLINE_RESOURCES.map((r) => r.name).join(", ")}.`}
        primary={{ href: "/request-pilot", label: "Request a pilot" }}
        secondary={{ href: "/trust", label: "Read how access works" }}
      />
    </>
  );
}
