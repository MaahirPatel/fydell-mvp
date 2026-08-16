import MarketingShell from "@/components/layout/MarketingShell";
import { PilotRequestForm } from "@/components/marketing/PilotRequestForm";
import { ContactLink } from "@/components/ui/ContactLink";
import { CitationLink } from "@/components/fydell/CitationLink";
import {
  CITATIONS,
  NORTHLINE_CLAIMS,
  NORTHLINE_RECEIPT,
  NORTHLINE_SCENARIO,
} from "@/lib/fixtures/northline";

export const metadata = {
  title: "Request a pilot",
  description:
    "Tell us the role you are hiring for and we will help you set up your first evaluation cohort.",
};

/**
 * Compact by design: the form must be reachable without scrolling on a 768px
 * viewport, so the supporting copy is short and sits beside it, not above it.
 */
const STEPS: Array<[string, string]> = [
  [
    "We reply with a scope",
    "Which evaluation fits the role, how many candidates, and what you get back.",
  ],
  [
    "Your workspace is set up",
    "A cohort on a published evaluation version, with invitations ready to send.",
  ],
  [
    "You read the first report",
    "A conclusion with its evidence attached, plus questions to take into the interview.",
  ],
];

export default function RequestPilotPage() {
  return (
    <MarketingShell>
      <section className="pb-14 pt-[128px] sm:pt-[144px]">
        <div className="mkt-content">
          <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <h1 className="page-display">Run your first pilot.</h1>
              <p className="page-lead">
                Tell us what you are hiring for. We will set up the cohort with
                you and stay reachable while it runs.
              </p>

              <ol className="mt-8 border-t border-[var(--border-subtle)]">
                {STEPS.map(([title, detail], i) => (
                  <li
                    key={title}
                    className="flex gap-3 border-b border-[var(--border-subtle)] py-3.5"
                  >
                    <span
                      aria-hidden
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[var(--border-default)] text-[11px] tabular-nums text-[var(--text-tertiary)]"
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
                        {title}
                      </p>
                      <p className="mt-0.5 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                        {detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="mt-6 text-[13px] leading-[1.65] text-[var(--text-tertiary)]">
                In a hurry?{" "}
                <a
                  href="/signup"
                  className="text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)]"
                >
                  Create a workspace
                </a>{" "}
                and run the evaluation yourself, or email{" "}
                <ContactLink className="text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)]" />
                .
              </p>
            </div>

            <div className="lg:col-span-6 lg:col-start-7">
              <div className="rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 sm:p-6">
                <PilotRequestForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What a pilot leaves behind. Three outcomes, each shown with the actual
          artefact rather than an icon, so "pilot" means something specific. */}
      <section className="border-t border-[var(--border-subtle)] mkt-section-chapter bg-[var(--surface-band)]">
        <div className="mkt-content">
          <h2 className="section-heading">What you have at the end of it</h2>
          <p className="section-desc mt-4">
            A pilot is not a demo call. It is one real role, run through the
            product, with three things left over.
          </p>

          <div className="mt-8 grid gap-px overflow-hidden rounded-[var(--radius-frame)] border border-[var(--border-default)] bg-[var(--border-subtle)] lg:grid-cols-3">
            <div className="bg-[var(--surface-raised)] p-4">
              <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
                A configured evaluation
              </p>
              <p className="mt-1.5 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                Attached to the role you are actually hiring for, with
                invitations ready to send.
              </p>
              <dl className="mt-3.5 border-t border-[var(--border-subtle)] pt-3 text-[12px]">
                <div className="flex justify-between gap-3 py-[3px]">
                  <dt className="text-[var(--text-tertiary)]">Evaluation</dt>
                  <dd className="text-right text-[var(--text-secondary)]">
                    {NORTHLINE_SCENARIO.evaluation}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 py-[3px]">
                  <dt className="text-[var(--text-tertiary)]">Role</dt>
                  <dd className="text-[var(--text-secondary)]">
                    {NORTHLINE_SCENARIO.role}
                  </dd>
                </div>
                <div className="flex justify-between gap-3 py-[3px]">
                  <dt className="text-[var(--text-tertiary)]">Working time</dt>
                  <dd className="text-[var(--text-secondary)]">
                    {NORTHLINE_SCENARIO.duration}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-[var(--surface-raised)] p-4">
              <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
                Evidence you can open
              </p>
              <p className="mt-1.5 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                One report per candidate. Every claim says what it rests on and
                where it stops.
              </p>
              <div className="mt-3.5 border-t border-[var(--border-subtle)] pt-3">
                <p className="text-[12.5px] leading-[1.5] text-[var(--text-secondary)]">
                  {NORTHLINE_CLAIMS[0].text}
                </p>
                <div className="mt-2 space-y-1">
                  <CitationLink citation={CITATIONS.reclassEvents} />
                  <CitationLink citation={CITATIONS.dictionary} />
                </div>
              </div>
            </div>

            <div className="bg-[var(--surface-raised)] p-4">
              <p className="text-[13.5px] font-medium text-[var(--text-primary)]">
                A receipt the candidate keeps
              </p>
              <p className="mt-1.5 text-[13px] leading-[1.6] text-[var(--text-secondary)]">
                Whatever you decide, they leave with a record of the work they
                did.
              </p>
              <ul className="mt-3.5 border-t border-[var(--border-subtle)] pt-3 text-[12px]">
                {NORTHLINE_RECEIPT.access.map((row) => (
                  <li
                    key={row.party}
                    className="flex justify-between gap-3 py-[3px]"
                  >
                    <span className="text-[var(--text-tertiary)]">
                      {row.party}
                    </span>
                    <span
                      className={
                        row.state === "No access"
                          ? "text-[var(--text-tertiary)]"
                          : "text-[var(--text-secondary)]"
                      }
                    >
                      {row.state}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
