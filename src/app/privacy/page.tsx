import MarketingShell from "@/components/layout/MarketingShell";

export const metadata = {
  title: "Privacy",
  description:
    "What data Fydell collects, why, who can see it, and how a candidate controls their own record.",
};

const FACTS: Array<[string, string]> = [
  [
    "What is collected",
    "For an employer: name, work email and company name. For a candidate: the email their invitation was sent to, the answers they submit, and the activity recorded during the attempt, such as which materials they opened and what they cited.",
  ],
  [
    "Why it is collected",
    "To run the evaluation the candidate was invited to and produce the report the employer requested. It is not used to build a profile, train a model on identifiable work, or target advertising.",
  ],
  [
    "Who can see it",
    "The workspace that issued the invitation, and the candidate themselves. Access is enforced by organization membership at the database level. There is no public directory of candidates or results.",
  ],
  [
    "Candidate control",
    "A candidate holds a Work Receipt for their own attempt. Sharing it is per-field, per-recipient and time-limited, and can be revoked immediately. Sharing is never automatic.",
  ],
  [
    "Selling data",
    "Fydell does not sell personal data, and does not share it with third parties for their own marketing.",
  ],
  [
    "Requests",
    "To access, correct or delete your data, email hello@fydell.com from the address on the record. We will confirm what we hold and act on the request.",
  ],
];

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <section className="pb-14 pt-[132px] sm:pt-[148px]">
        <div className="mkt-content">
          <h1 className="page-display">Privacy.</h1>
          <p className="page-lead">
            A plain summary of what Fydell holds and why. A full policy will
            replace this page; until then, this describes actual practice rather
            than boilerplate.
          </p>
        </div>
      </section>

      <section className="mkt-section border-t border-[var(--border-subtle)] pb-24">
        <div className="mkt-content max-w-[760px]">
          <dl className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            {FACTS.map(([title, detail]) => (
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
            Questions go to{" "}
            <a
              href="mailto:hello@fydell.com"
              className="text-[var(--text-primary)] underline underline-offset-2"
            >
              hello@fydell.com
            </a>
            .
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
