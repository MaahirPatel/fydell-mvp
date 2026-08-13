import MarketingShell from "@/components/layout/MarketingShell";
import HeroSimPreview from "@/components/marketing/home/HeroSimPreview";
import { ButtonLink } from "@/components/marketing/ui";

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

const SECTION = "border-t border-[var(--border-subtle)] mkt-section";

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[12.5px] text-[var(--text-tertiary)]">{label}</dt>
      <dd className="mt-1 text-[14px] text-[var(--text-primary)]">{value}</dd>
    </div>
  );
}

export default function EvaluationPage() {
  return (
    <MarketingShell>
      <section className="pb-14 pt-[132px] sm:pt-[148px]">
        <div className="mkt-content">
          <p className="text-[13px] font-medium text-[var(--text-tertiary)]">
            Data analysis · 20 minutes
          </p>
          <h1 className="page-display mt-3">Operations performance investigation</h1>
          <p className="page-lead">
            Reported yield fell last period at Northline Components. The candidate
            has to work out how much of that is a measurement change and how much
            is real, then say what to do before the next shift.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup" variant="primary">
              Create your workspace
            </ButtonLink>
            <ButtonLink href="/product" variant="secondary">
              How the product works
            </ButtonLink>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-14 gap-y-5 border-t border-[var(--border-subtle)] pt-6">
            <Fact label="Discipline" value="Data analysis" />
            <Fact label="Duration" value="20 minutes, one sitting" />
            <Fact label="Company in the scenario" value="Northline Components" />
            <Fact label="Data" value="Synthetic, not a customer's" />
            <Fact label="Produces" value="Evidence report and Work Receipt" />
          </dl>
        </div>
      </section>

      <section className="pb-4">
        <div className="mkt-content">
          <HeroSimPreview />
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 className="section-heading">What the candidate is given</h2>
            <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.65] text-[var(--text-secondary)]">
              No instructions on where to look. The material is realistic enough
              that deciding what matters is itself part of the work.
            </p>
          </div>
          <div className="lg:col-span-7">
            <ul className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)]">
              {[
                [
                  "production_runs.csv",
                  "Planned and completed units, rework, scrap and downtime by line, shift and period.",
                ],
                [
                  "quality_events.csv",
                  "Individual quality events with reason codes and timestamps, including the reclassification code.",
                ],
                [
                  "Metric dictionary and reporting note",
                  "The official yield definition, its grain, and a note describing a mid-period reporting change.",
                ],
                [
                  "A stakeholder to question",
                  "One operations contact who answers what is asked and nothing more. Asking well is scored.",
                ],
              ].map(([title, detail]) => (
                <li key={title} className="px-4 py-3.5">
                  <p className="text-[14px] font-medium text-[var(--text-primary)]">
                    {title}
                  </p>
                  <p className="mt-1 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
                    {detail}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 className="section-heading">What it actually measures</h2>
            <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.65] text-[var(--text-secondary)]">
              Four things that are hard to fake in an interview and impossible to
              read off a CV.
            </p>
          </div>
          <div className="lg:col-span-7">
            <ol className="grid gap-4">
              {[
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
                  "A new fact arrives mid-investigation. Whether they revise honestly, or defend a position that no longer holds.",
                ],
                [
                  "Communication with uncertainty",
                  "Whether the recommendation states what is still unknown and names a concrete next validation step.",
                ],
              ].map(([title, detail], i) => (
                <li key={title} className="flex gap-4">
                  <span
                    aria-hidden
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] text-[12px] tabular-nums text-[var(--text-tertiary)]"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-medium text-[var(--text-primary)]">
                      {title}
                    </p>
                    <p className="mt-1 text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
                      {detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h2 className="section-heading">What it does not do</h2>
            <p className="mt-4 max-w-[46ch] text-[16px] leading-[1.65] text-[var(--text-secondary)]">
              Stated plainly, because an evaluation you cannot audit is not worth
              putting in front of a candidate.
            </p>
          </div>
          <div className="lg:col-span-7">
            <ul className="grid gap-3">
              {[
                "It does not decide who to hire or reject. It produces evidence; your team decides.",
                "It does not score personality, culture fit, or anything it cannot show you the basis for.",
                "It does not claim to detect external AI use, remote desktop control, or identity by biometrics.",
                "When the platform fails mid-attempt, the session becomes a review state. It never becomes a low score.",
              ].map((line) => (
                <li
                  key={line}
                  className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-4 py-3 text-[13.5px] leading-[1.65] text-[var(--text-secondary)]"
                >
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className={`${SECTION} pb-24`}>
        <div className="mkt-content max-w-[620px]">
          <h2 className="section-heading">Send it to one candidate.</h2>
          <p className="mt-4 text-[16px] leading-[1.65] text-[var(--text-secondary)]">
            Create a workspace, invite someone by email, and read the report when
            they finish.
          </p>
          <div className="mt-8">
            <ButtonLink href="/signup" variant="primary">
              Create your workspace
            </ButtonLink>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
