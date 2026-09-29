import MarketingShell from "@/components/layout/MarketingShell";
import { PilotRequestForm } from "@/components/marketing/PilotRequestForm";
import { ContactLink } from "@/components/ui/ContactLink";

export const metadata = {
  title: "Contact",
  description:
    "Tell Fydell about the engineering role you are hiring for.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <MarketingShell>
      <div className="pb-24 pt-[132px] sm:pt-[156px]">
        <div className="mkt-content grid items-start gap-12 lg:grid-cols-12 lg:gap-20">
          <section className="lg:col-span-5">
            <h1 className="page-display">Contact</h1>
            <p className="page-lead">
              Share the stack, the level, and the work the engineer will own. We will
              reply with a pilot scope: which simulation fits, and how reviews will run.
            </p>

            <dl className="mt-10 border-y border-[var(--border-subtle)]">
              {[
                [
                  "Verify",
                  "You already have engineering candidates and want evidence from their work before interviewing.",
                ],
                [
                  "Search",
                  "You want a managed, founder-selected search and verification process.",
                ],
                [
                  "Partner",
                  "You hire repeatedly and need an ongoing verified pipeline.",
                ],
              ].map(([term, detail]) => (
                <div
                  key={term}
                  className="grid gap-2 border-t border-[var(--border-subtle)] py-4 first:border-t-0 sm:grid-cols-[90px_1fr]"
                >
                  <dt className="text-app-meta font-medium text-[var(--text-primary)]">
                    {term}
                  </dt>
                  <dd className="text-app-meta leading-[1.55] text-[var(--text-secondary)]">
                    {detail}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 text-app-meta leading-[1.6] text-[var(--text-tertiary)]">
              Prefer email? Write to{" "}
              <ContactLink className="text-[var(--text-secondary)] underline underline-offset-4 hover:text-[var(--text-primary)]" />
              .
            </p>
          </section>

          <section
            className="border-t border-[var(--border-default)] pt-6 lg:col-span-6 lg:col-start-7"
            aria-label="Contact Fydell"
          >
            <PilotRequestForm />
          </section>
        </div>
      </div>
    </MarketingShell>
  );
}
