import MarketingShell from "@/components/layout/MarketingShell";
import { ContactLink } from "@/components/ui/ContactLink";

export const metadata = {
  title: "Security",
  description:
    "How Fydell isolates workspace data, scopes candidate invitations, and handles credentials.",
};

/** Only describes controls that exist in the implementation today. */
const CONTROLS: Array<[string, string]> = [
  [
    "Workspace isolation",
    "Every candidate, invitation, session and report belongs to one organization. Reads are filtered by organization membership in row-level security policies on the database itself, so a query from one workspace cannot return another workspace's rows.",
  ],
  [
    "Scoped invitations",
    "A candidate link is single-use, bound to one email and one evaluation version, and expires. Opening it does not grant access to anything else in the workspace.",
  ],
  [
    "Authentication",
    "Accounts are managed by Supabase Auth. Passwords are never stored by Fydell, sessions are cookie-based and server-verified, and post-login redirects are validated against an internal path allowlist.",
  ],
  [
    "Frozen sessions",
    "Once an attempt is submitted its events and answers are immutable. Neither the candidate nor the employer can alter the record a report was built from.",
  ],
  [
    "Separated candidate and employer views",
    "The candidate-facing result is generated from a different projection than the employer report. Scoring internals and expected answers are not exposed to the candidate surface.",
  ],
  [
    "Synthetic scenario data",
    "Evaluations run against authored fictional materials in the browser. No live customer system or production data is involved in an attempt.",
  ],
];

export default function SecurityPage() {
  return (
    <MarketingShell>
      <section className="pb-14 pt-[132px] sm:pt-[148px]">
        <div className="mkt-content">
          <h1 className="page-display">Security.</h1>
          <p className="page-lead">
            The controls below are implemented today. Fydell holds no
            third-party security certification, and does not imply one.
          </p>
        </div>
      </section>

      <section className="mkt-section border-t border-[var(--border-subtle)] pb-24">
        <div className="mkt-content max-w-[760px]">
          <dl className="divide-y divide-[var(--border-subtle)] border-y border-[var(--border-subtle)]">
            {CONTROLS.map(([title, detail]) => (
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
            To report a vulnerability, email{" "}
            <ContactLink kind="security" />
            . We will confirm receipt and tell you what we are doing about it.
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
