import MarketingShell from "@/components/layout/MarketingShell";
import { ContactLink } from "@/components/ui/ContactLink";
import { CONTACT_EMAIL } from "@/lib/contact";

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
    "The workspace that issued the invitation, and the candidate themselves. Every table holding candidate work carries a row-level policy scoped to the owning organization, and the server checks membership before returning a session, report or receipt. There is no public directory of candidates or results.",
  ],
  [
    "Candidate control",
    "A candidate holds a Work Receipt for their own attempt. Sharing it is a link the candidate creates: it carries only the fields they choose, stops working on the date they set, and can be revoked afterwards. Sharing is never automatic.",
  ],
  [
    "How long it is kept",
    "There is no automatic deletion window yet. Evaluation data stays until it is deleted on request, which is done by hand. If your organization needs a fixed retention period, agree it with us before running a cohort.",
  ],
  [
    "Selling data",
    "Fydell does not sell personal data, and does not share it with third parties for their own marketing.",
  ],
  [
    "Requests",
    `To access, correct or delete your data, email ${CONTACT_EMAIL} from the address on the record. We will confirm what we hold and act on the request.`,
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
            <ContactLink />.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
