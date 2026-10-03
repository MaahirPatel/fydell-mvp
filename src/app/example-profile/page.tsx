import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";

export const metadata = {
  title: "Example Engineering Profile",
  description:
    "See what a Fydell engineering profile looks like: real claims linked to their source code. Example data only.",
};

/**
 * W02: One readable example profile. All data is fictional and labeled as such.
 * Uses a Fydell-authored example project (webhook-retry-service) so no
 * third-party work is shown without permission.
 */
const EVIDENCE = [
  {
    claim: "Built exponential-backoff retry for failed webhook deliveries",
    source: "webhook-retry-service/src/retry/policy.ts",
    lines: "L42–L89",
    type: "Repository observation",
    detail:
      "Implements jittered exponential backoff with configurable max attempts (default 8) and per-endpoint circuit breaking. 214 lines, 94% branch coverage.",
  },
  {
    claim: "Reduced duplicate deliveries during a provider outage",
    source: "webhook-retry-service/CHANGELOG.md",
    lines: "v2.3.0",
    type: "Repository observation",
    detail:
      "Added idempotency keys to the delivery pipeline. Post-deploy metrics in the repo's docs show duplicates dropping from 3.1% to 0.02% over 48 hours.",
  },
  {
    claim: "Wrote the runbook the on-call team still uses",
    source: "webhook-retry-service/docs/runbook.md",
    lines: "L1–L60",
    type: "Repository observation",
    detail:
      "Covers queue-depth alerts, manual replay procedure, and the kill-switch. Referenced in 4 subsequent PRs by other authors.",
  },
  {
    claim: "Can explain the failure modes of at-least-once delivery",
    source: "Simulation: Webhook retry incident",
    lines: "Candidate-submitted",
    type: "Simulation evidence",
    detail:
      "Completed a 45-minute Fydell-authored scenario. Results are candidate-submitted, not independently verified. See the trust note below.",
  },
];

export default function ExampleProfilePage() {
  return (
    <MarketingShell>
      <div className="mx-auto w-full max-w-[900px] px-5 pb-20 pt-[104px] sm:px-8 sm:pt-[112px]">
        <p className="inline-flex items-center rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-app-meta font-medium text-[var(--text-secondary)]">
          Example profile · fictional data
        </p>
        <h1 className="mt-4 text-[clamp(2rem,3.6vw,2.75rem)] font-[600] leading-[1.08] tracking-[-0.025em]">
          Maya Chen — Backend Engineer
        </h1>
        <p className="mt-3 max-w-[62ch] text-[var(--step-0)] leading-[1.6] text-[var(--text-secondary)]">
          This is what a Fydell engineering profile looks like. Every claim links to the source
          it came from. Nothing here is a real person or a real scan; the project below was
          written by Fydell as a demonstration.
        </p>

        <div className="mt-10 space-y-4">
          {EVIDENCE.map((e) => (
            <article
              key={e.claim}
              className="rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface-raised)] p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-app-section font-medium leading-snug">{e.claim}</h2>
                <span className="shrink-0 rounded-full bg-[var(--surface-hover)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)]">
                  {e.type}
                </span>
              </div>
              <p className="mt-2 text-app-body leading-[1.6] text-[var(--text-secondary)]">
                {e.detail}
              </p>
              <p className="mt-3 font-mono text-[12px] text-[var(--text-tertiary)]">
                Source: {e.source} · {e.lines}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 rounded-[10px] border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
          <h2 className="text-app-section font-medium">What this profile does not show</h2>
          <ul className="mt-2 space-y-1.5 text-app-body leading-[1.6] text-[var(--text-secondary)]">
            <li>· The simulation result above is candidate-submitted evidence, not an independently verified score.</li>
            <li>· Repository observations describe what the code does. They do not establish who wrote it or where the person worked.</li>
            <li>· Missing evidence reads as “not established,” never as proof the person lacks the ability.</li>
          </ul>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/get-started"
            className="inline-flex h-11 items-center rounded-full bg-[var(--control-solid)] px-5 text-app-body font-medium text-[var(--control-solid-ink)] hover:bg-[var(--control-solid-hover)]"
          >
            Create your work profile
          </Link>
          <Link
            href="/employers"
            className="inline-flex h-11 items-center rounded-full border border-[var(--border-strong)] px-5 text-app-body font-medium hover:bg-[var(--surface-hover)]"
          >
            For hiring teams
          </Link>
        </div>
      </div>
    </MarketingShell>
  );
}
