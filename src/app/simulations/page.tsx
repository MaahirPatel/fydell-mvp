import MarketingShell from "@/components/layout/MarketingShell";
import HeroSimPreview from "@/components/marketing/home/HeroSimPreview";
import { PageIntro } from "@/components/marketing/PageIntro";
import { ButtonLink } from "@/components/marketing/ui";
import { DesktopStage } from "@/components/fydell/ProductDesktop";
import { ChangedFactsDiff } from "@/components/fydell/ChangedFactsDiff";
import { ProductStage } from "@/components/fydell/ProductStage";
import {
  NORTHLINE_DEFENSE_PROMPT,
  NORTHLINE_RECEIPT,
  NORTHLINE_RESOURCES,
  NORTHLINE_SCENARIO,
} from "@/lib/fixtures/northline";

/**
 * One evaluation, described properly.
 *
 * This route previously rendered all 31 entries of the static `ALL_SIMULATIONS`
 * array behind six role filters, which read as a marketplace and diluted the one
 * evaluation that is actually published. The catalogue data is untouched; it is
 * simply no longer used for public positioning.
 */

export const metadata = {
  title: "Operations performance investigation",
  description:
    "A 20-minute operations investigation for data analysts. The candidate separates a reporting change from real production risk and defends the conclusion with evidence you can open.",
};

const SECTION = "border-t border-[var(--border-subtle)] mkt-section-chapter";
const BAND = "bg-[var(--surface-band)]";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12.5px] text-[var(--text-tertiary)]">{label}</dt>
      <dd className="mt-1 text-[14px] text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

const MATERIALS = [
  ...NORTHLINE_RESOURCES.map((r) => ({ name: r.name, detail: r.detail })),
  {
    name: "A stakeholder to question",
    detail:
      "One operations contact who answers what is asked and nothing more. Asking well is part of the work.",
  },
];

const STAGES = [
  {
    title: "Investigate",
    detail:
      "Read the files, decide which of them bears on the question, and record what they find.",
  },
  {
    title: "Write a conclusion",
    detail:
      "State what happened, cite the rows behind it, and say where the evidence stops.",
  },
  {
    title: "Receive changed information",
    detail:
      "A fact the first conclusion depended on turns out to be different. The clock keeps running.",
  },
  {
    title: "Revise or defend",
    detail:
      "Rework the affected claim, or argue that it still holds. Both are recorded; neither is assumed correct.",
  },
  {
    title: "Submit",
    detail:
      "The report closes and becomes readable by the inviting company. Nothing is editable afterwards.",
  },
];

const MEASURES = [
  [
    "Metric judgement",
    "Whether they check the definition before trusting the number, and notice the two periods are not comparable.",
  ],
  [
    "Investigation and evidence use",
    "Whether the conclusion is tied to specific rows and documents, or asserted and then decorated.",
  ],
  [
    "Adaptation under new information",
    "Whether they revise honestly when the ground moves, or defend a position that no longer holds.",
  ],
  [
    "Communication with uncertainty",
    "Whether the recommendation states what is still unknown and names a concrete next step.",
  ],
];

const NOT_MEASURED = [
  "It does not decide who to hire or reject. It produces evidence; your team decides.",
  "It does not score personality, culture fit, or anything it cannot show you the basis for.",
  "It does not claim to detect external AI use, remote desktop control, or identity by biometrics.",
  "When the platform fails mid-attempt, the session becomes a review state. It never becomes a low score.",
];

const DEPLOYMENT = [
  [
    "Invite",
    "You send one email from the Candidates screen. The link is single-use, tied to that address, and expires.",
  ],
  [
    "Attempt",
    "The candidate works in the browser, wherever they are. Progress saves as they go, so a dropped connection does not end the attempt.",
  ],
  [
    "Report",
    "On submission the report appears under Reports and is marked for review. You read it, open the claims, and record a decision.",
  ],
  [
    "Receipt",
    "The candidate keeps their own copy of what they produced, whatever you decide.",
  ],
];

export default function EvaluationPage() {
  return (
    <MarketingShell>
      <PageIntro
        title={NORTHLINE_SCENARIO.evaluation}
        meta={
          <p className="text-[14px] tabular-nums text-[var(--text-tertiary)]">
            {NORTHLINE_SCENARIO.role} · {NORTHLINE_SCENARIO.duration}
          </p>
        }
        lead={`Reported yield fell last period at ${NORTHLINE_SCENARIO.company}. The candidate has to work out how much of that is a measurement change and how much is real, then say what to do before the next shift.`}
        actions={
          <>
            <ButtonLink href="/request-pilot" variant="primary">
              Request a pilot
            </ButtonLink>
            <ButtonLink href="/product" variant="secondary">
              How the product works
            </ButtonLink>
          </>
        }
      />

      <section className="pb-12">
        <div className="mkt-content">
          <dl className="flex flex-wrap gap-x-14 gap-y-5 border-t border-[var(--border-subtle)] pt-6">
            <Fact label="Discipline" value="Data analysis" />
            <Fact label="Duration" value="20 minutes, one sitting" />
            <Fact label="Company in the scenario" value={NORTHLINE_SCENARIO.company} />
            <Fact label="Data" value="Synthetic, not a customer's" />
            <Fact label="Produces" value="Evidence report and Work Receipt" />
          </dl>
        </div>
      </section>

      <section className="pb-4">
        <div className="mkt-content">
          <DesktopStage>
            <HeroSimPreview />
          </DesktopStage>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 className="section-heading">What the candidate is given</h2>
            <p className="section-desc mt-4">
              No instructions on where to look. The material is realistic enough
              that deciding what matters is itself part of the work.
            </p>
          </div>
          <div className="lg:col-span-7">
            <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)]">
              {MATERIALS.map((item) => (
                <li key={item.name} className="px-4 py-3.5">
                  <p className="text-[14px] font-medium text-[var(--text-primary)]">
                    {item.name}
                  </p>
                  <p className="mt-1 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
                    {item.detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* The stages, with the third one shown rather than named: the changed
          fact is the mechanism buyers ask about most and the hardest to
          believe from a sentence. */}
      <section className={`${SECTION} ${BAND}`}>
        <div className="mkt-content">
          <h2 className="section-heading">The twenty minutes, in order</h2>
          <div className="mt-8 grid items-start gap-10 lg:grid-cols-12 lg:gap-16">
            <ol className="lg:col-span-5">
              {STAGES.map((stage, i) => (
                <li
                  key={stage.title}
                  className="flex gap-4 border-t border-[var(--border-subtle)] py-4 first:border-t-0 first:pt-0"
                >
                  <span
                    aria-hidden
                    className="mt-[2px] inline-flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-[6px] border border-[var(--border-default)] text-[11.5px] tabular-nums text-[var(--text-tertiary)]"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-medium text-[var(--text-primary)]">
                      {stage.title}
                    </p>
                    <p className="mt-1 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
                      {stage.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="lg:col-span-7">
              <DesktopStage>
                <ProductStage
                  title="Stage 3, as the candidate sees it"
                  source={`${NORTHLINE_SCENARIO.company} · synthetic`}
                  label="The changed fact, the claim it affects, and the candidate's response"
                >
                  <div className="p-4">
                    <ChangedFactsDiff />
                  </div>
                </ProductStage>
              </DesktopStage>
            </div>
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div>
            <h2 className="section-heading">What it measures</h2>
            <ol className="mt-6">
              {MEASURES.map(([title, detail]) => (
                <li
                  key={title}
                  className="border-t border-[var(--border-subtle)] py-3.5 first:border-t-0 first:pt-0"
                >
                  <p className="text-[14.5px] font-medium text-[var(--text-primary)]">
                    {title}
                  </p>
                  <p className="mt-1 text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
                    {detail}
                  </p>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="section-heading">What it does not</h2>
            <ul className="mt-6">
              {NOT_MEASURED.map((line) => (
                <li
                  key={line}
                  className="flex gap-2.5 border-t border-[var(--border-subtle)] py-3.5 text-[13.5px] leading-[1.65] text-[var(--text-secondary)] first:border-t-0 first:pt-0"
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
        </div>
      </section>

      <section className={`${SECTION} ${BAND}`}>
        <div className="mkt-content">
          <h2 className="section-heading">What comes out of it</h2>
          <p className="section-desc mt-4 max-w-[58ch]">
            Two artefacts, one for each side. They contain the same work; they do
            not contain the same things.
          </p>
          <div className="mt-8 grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
            <ProductStage
              title="For your team"
              label="What the employer receives from a completed evaluation"
            >
              <ul className="divide-y divide-[var(--border-subtle)]">
                {[
                  [
                    "The conclusion",
                    "What the candidate decided, in their words, at the top of the report.",
                  ],
                  [
                    "Claims you can open",
                    "Each one shows how it was reached and the rows it rests on.",
                  ],
                  [
                    "The changed-fact response",
                    "Whether they revised, defended, or left it alone.",
                  ],
                  [
                    "A follow-up question",
                    "Drawn from a limitation the candidate wrote, for the interview.",
                  ],
                ].map(([title, detail]) => (
                  <li key={title} className="px-4 py-3">
                    <p className="text-[13.5px] text-[var(--text-primary)]">
                      {title}
                    </p>
                    <p className="mt-0.5 text-[12.5px] leading-[1.55] text-[var(--text-tertiary)]">
                      {detail}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="border-t border-[var(--border-subtle)] p-4">
                <p className="text-[11.5px] font-medium text-[var(--text-tertiary)]">
                  A follow-up this evaluation produced
                </p>
                <p className="mt-1.5 text-[13px] leading-[1.5] text-[var(--text-primary)]">
                  {NORTHLINE_DEFENSE_PROMPT.question}
                </p>
              </div>
            </ProductStage>

            <ProductStage
              title="For the candidate"
              source="Work Receipt"
              label="What the candidate keeps and who else can read it"
            >
              <ul className="divide-y divide-[var(--border-subtle)]">
                {NORTHLINE_RECEIPT.includes.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center justify-between gap-4 px-4 py-2.5"
                  >
                    <span
                      className={`text-[13px] ${
                        row.included
                          ? "text-[var(--text-secondary)]"
                          : "text-[var(--text-tertiary)]"
                      }`}
                    >
                      {row.label}
                    </span>
                    <span className="shrink-0 text-[11.5px] text-[var(--text-tertiary)]">
                      {row.included ? "Included" : "Not included"}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-[var(--border-subtle)] p-4">
                <p className="text-[12.5px] leading-[1.6] text-[var(--text-secondary)]">
                  The receipt is private to the candidate and the company that
                  invited them. It is not a public profile, it is not searchable,
                  and no other employer can open it.
                </p>
              </div>
            </ProductStage>
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content">
          <h2 className="section-heading">How you run it</h2>
          <ol className="mt-7 grid gap-x-12 gap-y-5 sm:grid-cols-2">
            {DEPLOYMENT.map(([title, detail], i) => (
              <li key={title} className="flex gap-3.5">
                <span
                  aria-hidden
                  className="mt-[2px] inline-flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-[6px] border border-[var(--border-default)] text-[11.5px] tabular-nums text-[var(--text-tertiary)]"
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-medium text-[var(--text-primary)]">
                    {title}
                  </p>
                  <p className="mt-1 max-w-[46ch] text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
                    {detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={`${SECTION} pb-24`}>
        <div className="mkt-content max-w-[620px]">
          <h2 className="section-heading">Send it to one candidate.</h2>
          <p className="section-desc mt-4">
            Create a workspace, invite someone by email, and read the report when
            they finish.
          </p>
          <div className="mt-8">
            <ButtonLink href="/request-pilot" variant="primary">
              Request a pilot
            </ButtonLink>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
