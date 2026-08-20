import MarketingShell from "@/components/layout/MarketingShell";
import { ButtonLink } from "@/components/marketing/ui";

export const metadata = {
  title: "How it works",
  description:
    "Role, work, change, defense, evidence, and interview: the complete Fydell verification flow.",
};

const FLOW = [
  {
    name: "Role",
    body: "Fydell and the employer define the work, judgment, communication, and environment the role actually requires.",
  },
  {
    name: "Work",
    body: "The candidate enters a realistic job situation with resources, stakeholders, and an open work artifact.",
  },
  {
    name: "Change",
    body: "A deterministic material fact arrives. Fydell records what the candidate changes, preserves, and communicates.",
  },
  {
    name: "Defense",
    body: "Follow-up questions target the candidate’s actual decisions, contradictions, and remaining uncertainty.",
  },
  {
    name: "Evidence",
    body: "The work trail becomes claims with support, counterevidence, confidence, and explicit limits.",
  },
  {
    name: "Interview",
    body: "The employer gets the few candidates worth meeting and exactly what the next conversation should investigate.",
  },
];

const EVENTS = [
  ["16:08", "Engineering confirms a six-week production security review."],
  ["16:09", "Candidate 1 replaces the incompatible endpoint."],
  ["16:11", "The rollout recommendation is revised."],
  ["16:18", "Sales receives the changed delivery assumptions."],
];

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <main>
        <section className="pb-20 pt-[132px] sm:pb-24 sm:pt-[156px]">
          <div className="mkt-content">
            <div className="mx-auto flex max-w-[780px] flex-col items-center text-center">
              <h1 className="page-display text-balance">
                From real work to a better interview.
              </h1>
              <p className="mt-6 max-w-[660px] text-[18px] leading-[1.55] text-[var(--text-secondary)]">
                Fydell does not grade a first answer. It observes how someone
                works, what happens when the situation changes, and whether the
                final decision holds up under questioning.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <ButtonLink href="/contact" variant="primary">
                  Request a pilot
                </ButtonLink>
                <ButtonLink href="/pricing" variant="soft">
                  View pricing
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-[var(--border-subtle)]">
          <div className="mkt-content grid md:grid-cols-2 lg:grid-cols-6">
            {FLOW.map((step, index) => (
              <article
                key={step.name}
                className={`py-7 md:px-6 lg:min-h-[250px] lg:py-8 ${
                  index % 2 === 1
                    ? "md:border-l md:border-[var(--border-subtle)]"
                    : ""
                } ${index > 1 ? "border-t border-[var(--border-subtle)] lg:border-t-0" : ""} ${
                  index > 0 ? "lg:border-l lg:border-[var(--border-subtle)]" : ""
                }`}
              >
                <p className="text-[12px] tabular-nums text-[var(--text-tertiary)]">
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h2 className="mt-8 text-[18px] font-semibold tracking-[-0.02em]">
                  {step.name}
                </h2>
                <p className="mt-3 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                  {step.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mkt-section-chapter">
          <div className="mkt-content grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <h2 className="section-heading">The work changes.</h2>
              <p className="section-desc mt-5">
                The strongest signal is often not the first recommendation. It
                is what someone updates and what they deliberately leave alone
                when new information makes the original plan incomplete.
              </p>
            </div>
            <div className="overflow-hidden border-y border-[var(--border-default)] lg:col-span-7 lg:col-start-6">
              {EVENTS.map(([time, event]) => (
                <div
                  key={time}
                  className="grid grid-cols-[64px_1fr] gap-5 border-t border-[var(--border-subtle)] py-4 first:border-t-0"
                >
                  <span className="font-mono text-[12px] tabular-nums text-[var(--text-tertiary)]">
                    {time}
                  </span>
                  <p className="text-[14px] leading-[1.55] text-[var(--text-secondary)]">
                    {event}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mkt-section-chapter bg-[var(--surface-band)]">
          <div className="mkt-content grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <h2 className="section-heading">The brief compresses the work.</h2>
              <p className="section-desc mt-5">
                Employers see the decision first. Evidence stays underneath for
                the moments when a claim needs to be challenged.
              </p>
            </div>
            <div className="border-y border-[var(--border-default)] lg:col-span-7 lg:col-start-6">
              <div className="py-5">
                <p className="text-[12px] text-[var(--text-tertiary)]">
                  Recommendation
                </p>
                <p className="mt-2 text-[24px] font-semibold tracking-[-0.025em]">
                  Worth interviewing, with a focused probe.
                </p>
              </div>
              {[
                [
                  "Why",
                  "Candidate 1 revised the incompatible authentication path and preserved the unaffected implementation work.",
                ],
                [
                  "Uncertainty",
                  "The retained rollout size still depends on Acme’s unverified adoption estimate.",
                ],
                [
                  "Ask next",
                  "What evidence would make you reduce or increase the rollout before production access?",
                ],
              ].map(([label, body]) => (
                <div
                  key={label}
                  className="grid gap-2 border-t border-[var(--border-subtle)] py-5 sm:grid-cols-[120px_1fr] sm:gap-6"
                >
                  <h3 className="text-[13px] font-medium">{label}</h3>
                  <p className="text-[14px] leading-[1.6] text-[var(--text-secondary)]">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mkt-section-chapter">
          <div className="mkt-content mx-auto max-w-[720px] text-center">
            <h2 className="section-heading text-balance">
              Bring one open role. See the whole system work.
            </h2>
            <p className="section-desc mx-auto mt-5 text-center">
              We calibrate the role, run the work, review the evidence, and
              return the people worth interviewing.
            </p>
            <div className="mt-8 flex justify-center">
              <ButtonLink href="/contact" variant="primary">
                Request a pilot
              </ButtonLink>
            </div>
          </div>
        </section>
      </main>
    </MarketingShell>
  );
}
