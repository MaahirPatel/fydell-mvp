import MarketingShell from "@/components/layout/MarketingShell";
import { PageIntro } from "@/components/marketing/PageIntro";
import { ButtonLink } from "@/components/marketing/ui";
import { ContactLink } from "@/components/ui/ContactLink";

export const metadata = {
  title: "Pricing",
  description:
    "Fydell is in founding pilots. Scope is agreed in writing with each company before anything starts.",
};

/**
 * Commercial claims (billing terms, invoicing, credit-card policy) are removed
 * pending owner sign-off. Only the definitions below are stated, because they
 * describe how the product counts things, not what it charges.
 */
const TERMS: Array<[string, string]> = [
  [
    "Evaluation",
    "One published work investigation at a specific version. Today that is the Operations performance investigation.",
  ],
  [
    "Invitation",
    "One single-use link sent to one candidate. An invitation that is never opened produces nothing.",
  ],
  [
    "Completion",
    "One candidate's submitted attempt, which is what produces a report. Pilots are scoped in completions.",
  ],
  [
    "Technical failure",
    "An attempt invalidated by a fault on Fydell's side rather than the candidate's. It becomes a review state and does not count as a completion.",
  ],
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <PageIntro
        title="Founding pilots are scoped directly."
        lead="Fydell is early enough that a price grid would be a guess. We agree the scope with each company in writing first: which evaluation, how many completions, and what support you want around them."
        actions={
          <>
            <ButtonLink href="/request-pilot" variant="primary">
              Request a pilot
            </ButtonLink>
            <ButtonLink href="/signup" variant="secondary">
              Or create a workspace
            </ButtonLink>
          </>
        }
      />

      <section className="mkt-section border-t border-[var(--border-subtle)] pb-24">
        <div className="mkt-content max-w-[760px]">
          <h2 className="section-heading">What the words mean</h2>
          <p className="section-desc mt-4">
            Every pilot scope uses these four terms with the same definitions.
          </p>
          <dl className="mt-8 divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            {TERMS.map(([term, definition]) => (
              <div
                key={term}
                className="grid gap-2 py-5 sm:grid-cols-[200px_1fr] sm:gap-8"
              >
                <dt className="text-[14.5px] font-medium text-[var(--text-primary)]">
                  {term}
                </dt>
                <dd className="text-[14px] leading-[1.7] text-[var(--text-secondary)]">
                  {definition}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-[14px] leading-[1.7] text-[var(--text-secondary)]">
            For a specific number, email{" "}
            <ContactLink />{" "}
            with the role you are hiring for and roughly how many candidates you
            expect to evaluate.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
