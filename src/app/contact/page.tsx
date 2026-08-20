import MarketingShell from "@/components/layout/MarketingShell";
import { PilotRequestForm } from "@/components/marketing/PilotRequestForm";
import { ContactLink } from "@/components/ui/ContactLink";

export const metadata = {
  title: "Contact",
  description:
    "Tell Fydell about the technical customer-facing role you need to fill.",
};

export default function ContactPage() {
  return (
    <MarketingShell>
      <main className="pb-24 pt-[132px] sm:pt-[156px]">
        <div className="mkt-content grid items-start gap-12 lg:grid-cols-12 lg:gap-20">
          <section className="lg:col-span-5">
            <h1 className="page-display">Bring us an open role.</h1>
            <p className="page-lead">
              Tell us who you need and what the person will actually do. We will
              reply with the right verification or search scope.
            </p>

            <dl className="mt-10 border-y border-[var(--border-subtle)]">
              {[
                [
                  "Verify",
                  "You already have candidates and need evidence before interviewing.",
                ],
                [
                  "Search",
                  "You want Fydell to find, verify, and shortlist candidates.",
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
                  <dt className="text-[13px] font-medium text-[var(--text-primary)]">
                    {term}
                  </dt>
                  <dd className="text-[13px] leading-[1.55] text-[var(--text-secondary)]">
                    {detail}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-6 text-[13px] leading-[1.6] text-[var(--text-tertiary)]">
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
      </main>
    </MarketingShell>
  );
}
