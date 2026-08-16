import MarketingShell from "@/components/layout/MarketingShell";
import { PageIntro } from "@/components/marketing/PageIntro";
import { ContactLink } from "@/components/ui/ContactLink";

export const metadata = {
  title: "Terms",
  description: "Fydell terms of use.",
};

/**
 * Deliberately not fabricated. Publishing invented terms of service would be
 * worse than admitting there are none, so this page says what actually governs
 * a pilot today and where to read it.
 */
const TERMS: Array<[string, string]> = [
  [
    "What the service is",
    "Fydell runs work evaluations for hiring teams and produces evidence reports from them. It does not make hiring decisions and does not represent that a result predicts job performance.",
  ],
  [
    "What governs use today",
    "A written pilot agreement signed with your organization. Where anything on this website differs from that agreement, the agreement is what applies.",
  ],
  [
    "If you have not signed one",
    "Creating a workspace lets you try the product with synthetic data. Do not put candidate personal data into Fydell before an agreement is in place.",
  ],
  [
    "Candidate use",
    "A candidate is bound by nothing beyond the invitation they accept. They keep a copy of their own work, and a result is never published or listed anywhere.",
  ],
  [
    "When this changes",
    "Standard terms will be published before self-serve paid subscriptions open. Existing pilot customers will be told before anything they signed is replaced.",
  ],
];

export default function TermsPage() {
  return (
    <MarketingShell>
      <PageIntro
        title="Terms."
        lead="Effective 14 August 2026. Standard terms of use have not been published yet. Rather than post boilerplate that says nothing, this page states what currently governs use of Fydell and how to get a copy of it."
      />

      <section className="mkt-section border-t border-[var(--border-subtle)] pb-24">
        <div className="mkt-content max-w-[720px]">
          <dl className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            {TERMS.map(([title, detail]) => (
              <div
                key={title}
                className="grid gap-2 py-5 sm:grid-cols-[220px_1fr] sm:gap-8"
              >
                <dt className="text-[14.5px] font-medium text-[var(--text-primary)]">
                  {title}
                </dt>
                <dd className="text-[14px] leading-[1.7] text-[var(--text-secondary)]">
                  {detail}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-8 text-[14px] leading-[1.7] text-[var(--text-secondary)]">
            To read the current agreement before you commit to anything, ask at{" "}
            <ContactLink />.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
