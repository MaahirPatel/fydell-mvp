import MarketingShell from "@/components/layout/MarketingShell";
import { PilotRequestForm } from "@/components/marketing/PilotRequestForm";
import { ContactLink } from "@/components/ui/ContactLink";

export const metadata = {
  title: "Contact",
  description:
    "Tell Fydell about the engineering role you are hiring for.",
  alternates: { canonical: "/contact" },
};

const PATHS = [
  {
    term: "Review",
    detail: "You already have engineering candidates and want evidence from their work before interviewing.",
  },
  {
    term: "Search",
    detail: "You want a managed search, with each engineer's work shared as evidence you can read.",
  },
  {
    term: "Partner",
    detail: "You hire repeatedly and want the same simulation templates and review process across roles.",
  },
] as const;

export default function ContactPage() {
  return (
    <MarketingShell>
      <div className="pb-24 pt-[132px] sm:pt-[156px]">
        <div className="mkt-content grid items-start gap-12 lg:grid-cols-12 lg:gap-16">
          <section className="lg:col-span-5 lg:pt-4">
            <h1 className="page-display">Talk to us about a role.</h1>
            <p className="page-lead">
              Share the stack, the level, and the work the engineer will own. We will
              reply with a pilot scope: which simulation fits, and how reviews will run.
            </p>

            <dl className="mt-10">
              {PATHS.map(({ term, detail }) => (
                <div
                  key={term}
                  className="grid gap-1 border-t border-[var(--border-default)] py-4 sm:grid-cols-[96px_1fr] sm:gap-2"
                >
                  <dt className="text-[15px] font-medium text-[var(--text-primary)]">{term}</dt>
                  <dd className="text-[15px] leading-[1.55] text-[var(--text-secondary)]">{detail}</dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 text-app-meta leading-[1.6] text-[var(--text-secondary)]">
              Prefer email? Write to{" "}
              <ContactLink className="text-[var(--text-primary)] underline underline-offset-4 hover:text-[var(--accent-ink)]" />
              .
            </p>
          </section>

          <section
            className="rounded-[var(--radius-frame)] bg-[var(--tint-violet)] p-2 sm:p-3 lg:col-span-7"
            aria-label="Contact Fydell"
          >
            <div className="rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 shadow-[var(--shadow-2)] sm:p-7">
              <PilotRequestForm />
            </div>
          </section>
        </div>
      </div>
    </MarketingShell>
  );
}
