import MarketingShell from "@/components/layout/MarketingShell";
import { PilotRequestForm } from "@/components/marketing/PilotRequestForm";

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
      <section className="pb-20 pt-[112px] sm:pt-[124px]">
        <div className="mkt-content">
          <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <h1 className="text-[clamp(2rem,3.4vw,2.6rem)] font-medium leading-[1.08] tracking-[-0.035em] text-[var(--text-primary)]">
                Run your first pilot.
              </h1>
              <p className="mt-4 max-w-[46ch] text-[15.5px] leading-[1.65] text-[var(--text-secondary)]">
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
                <a
                  href="mailto:hello@fydell.com"
                  className="text-[var(--text-secondary)] underline underline-offset-2 hover:text-[var(--text-primary)]"
                >
                  hello@fydell.com
                </a>
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
    </MarketingShell>
  );
}
