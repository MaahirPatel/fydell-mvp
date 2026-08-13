import MarketingShell from "@/components/layout/MarketingShell";
import { ContactLink } from "@/components/ui/ContactLink";

export const metadata = {
  title: "Trust",
  description:
    "How evidence is produced, where candidate data goes, who can read it, and what Fydell explicitly does not claim.",
};

const SECTION = "border-t border-[var(--border-subtle)] mkt-section";

/**
 * Written against the implemented system: the organization and session tables,
 * the row-level security model, and the scoring pipeline. Nothing here is a
 * commercial claim, and no legal terms are asserted.
 */

const PIPELINE = [
  {
    step: "Invitation",
    detail:
      "An employer creates a single-use invitation scoped to one candidate and one published evaluation version. It expires, and it can be revoked before it is opened.",
  },
  {
    step: "Session",
    detail:
      "Opening the invitation creates a session tied to that invitation. Every material the candidate opens, every citation they make and every answer they submit is written as a timestamped event on that session.",
  },
  {
    step: "Submission",
    detail:
      "At the end of the attempt the session is frozen. Nothing can be added to it afterwards, by the candidate or by the employer.",
  },
  {
    step: "Analysis",
    detail:
      "A deterministic scoring pass runs over the submitted answers and the recorded events. The same submission always produces the same result. There is no model deciding the outcome.",
  },
  {
    step: "Evidence report",
    detail:
      "The report is assembled from that analysis. Each claim carries the specific rows and documents the candidate cited, so the employer can check the reasoning rather than accept a number.",
  },
  {
    step: "Work Receipt",
    detail:
      "A receipt belongs to the candidate. Sharing it creates a field-scoped, expiring permission that the candidate can revoke at any time.",
  },
];

const ACCESS = [
  [
    "An employer",
    "Sees only sessions created from invitations issued by their own workspace. Access is enforced by membership in that organization, checked on every read.",
  ],
  [
    "A candidate",
    "Sees their own session and their own receipt. The candidate view is generated separately from the employer view and excludes scoring internals and answer keys.",
  ],
  [
    "Nobody",
    "Sees a public directory of candidates or results. There is no network view, no ranking across companies, and no listing of who has been evaluated.",
  ],
];

const NOT_CLAIMED = [
  "Fydell does not make, recommend, or rank a hire or reject decision.",
  "Fydell does not detect external AI use, screen sharing, or remote desktop control, and does not claim to.",
  "Fydell does not verify identity using biometrics.",
  "Fydell is not a certified psychometric instrument and is not presented as one.",
  "Scenario data is synthetic. Northline Components is fictional and is not modelled on any customer.",
  "A platform failure during an attempt becomes a review state. It is never converted into a low score.",
];

export default function TrustPage() {
  return (
    <MarketingShell>
      <section className="pb-14 pt-[132px] sm:pt-[148px]">
        <div className="mkt-content">
          <h1 className="page-display">
            How the evidence is produced, and who can read it.
          </h1>
          <p className="page-lead">
            An evaluation is only useful if you can check it. This describes the
            pipeline as it is actually implemented, the access model that
            enforces it, and the things Fydell will not claim.
          </p>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h2 className="section-heading">From invitation to receipt</h2>
            <p className="mt-4 max-w-[42ch] text-[16px] leading-[1.65] text-[var(--text-secondary)]">
              Six stages. Each one writes a record; none of them can be edited
              after the fact.
            </p>
          </div>
          <ol className="lg:col-span-8">
            {PIPELINE.map((item, i) => (
              <li
                key={item.step}
                className="flex gap-4 border-b border-[var(--border-subtle)] py-4 first:pt-0 last:border-b-0 last:pb-0"
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] text-[12px] tabular-nums text-[var(--text-tertiary)]"
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-[14.5px] font-medium text-[var(--text-primary)]">
                    {item.step}
                  </p>
                  <p className="mt-1 max-w-[64ch] text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h2 className="section-heading">Who can read what</h2>
            <p className="mt-4 max-w-[42ch] text-[16px] leading-[1.65] text-[var(--text-secondary)]">
              Access is scoped by organization membership at the database level,
              not only in the interface.
            </p>
          </div>
          <div className="lg:col-span-8">
            <dl className="divide-y divide-[var(--border-subtle)] rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)]">
              {ACCESS.map(([who, detail]) => (
                <div key={who} className="grid gap-1.5 px-4 py-3.5 sm:grid-cols-[140px_1fr] sm:gap-6">
                  <dt className="text-[14px] font-medium text-[var(--text-primary)]">
                    {who}
                  </dt>
                  <dd className="text-[13.5px] leading-[1.65] text-[var(--text-secondary)]">
                    {detail}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h2 className="section-heading">Why the scoring is inspectable</h2>
          </div>
          <div className="lg:col-span-8">
            <p className="max-w-[64ch] text-[16px] leading-[1.7] text-[var(--text-secondary)]">
              Scoring is a set of explicit rules applied to the candidate&apos;s
              submitted answers and their recorded event timeline. It is
              deterministic: the same submission scored twice produces an
              identical result, and that property is covered by an automated
              test that runs before every release.
            </p>
            <p className="mt-4 max-w-[64ch] text-[16px] leading-[1.7] text-[var(--text-secondary)]">
              Because the rules are explicit, every consequential claim in a
              report can name what supports it and what it does not establish.
              That is the point of the format. A score you cannot open is a
              score you cannot defend to a candidate who asks why.
            </p>
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <div className="mkt-content grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h2 className="section-heading">What Fydell does not claim</h2>
          </div>
          <ul className="grid gap-3 lg:col-span-8">
            {NOT_CLAIMED.map((line) => (
              <li
                key={line}
                className="rounded-[var(--radius-panel)] border border-[var(--border-subtle)] px-4 py-3 text-[14px] leading-[1.65] text-[var(--text-secondary)]"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={`${SECTION} pb-24`}>
        <div className="mkt-content max-w-[620px]">
          <h2 className="section-heading">Questions about any of this?</h2>
          <p className="mt-4 text-[16px] leading-[1.65] text-[var(--text-secondary)]">
            Ask directly at{" "}
            <ContactLink />. If something on this page is not accurate, we would rather correct
            it than defend it.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
