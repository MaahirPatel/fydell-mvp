import MarketingShell from "@/components/layout/MarketingShell";
import { ButtonLink } from "@/components/marketing/ui";

export const metadata = {
  title: "Pricing",
  description:
    "Verify candidates you already know, let Fydell search, or build an ongoing verified hiring pipeline.",
};

const OFFERS = [
  {
    name: "Verify",
    price: "$250",
    cadence: "per completed candidate",
    description: "Bring the candidates. Fydell verifies the work.",
    features: [
      "Role-specific work simulation",
      "Material information changes mid-run",
      "Candidate oral defense",
      "Human-reviewed evidence brief",
      "Candidate-specific interview probes",
    ],
    action: "Start verifying",
  },
  {
    name: "Search",
    price: "15%",
    cadence: "of first-year base salary",
    description: "Fydell finds, verifies, and shortlists the people worth meeting.",
    features: [
      "Role calibration with Fydell",
      "Candidate sourcing",
      "Full verification workflow",
      "Curated three-to-five person shortlist",
      "No hire, no placement fee",
    ],
    action: "Start a search",
    recommended: true,
  },
  {
    name: "Partner",
    price: "$2,500",
    cadence: "per month + 10% per hire",
    description: "An ongoing verified pipeline for teams hiring repeatedly.",
    features: [
      "Continuous role calibration",
      "Priority candidate sourcing",
      "Verification and human review",
      "Recurring decision-ready shortlists",
      "Interview and outcome tracking",
    ],
    action: "Discuss a partnership",
  },
  {
    name: "Candidates",
    price: "Free",
    cadence: "always",
    description: "Candidates never pay to demonstrate how they work.",
    features: [
      "No application fee",
      "No evaluation fee",
      "Plain-language recording disclosure",
      "Candidate-controlled Work Receipts",
      "No score sold back to candidates",
    ],
    action: "How candidate work is used",
  },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <main className="pb-24 pt-[132px] sm:pt-[156px]">
        <div className="mkt-content">
          <header className="mx-auto flex max-w-[980px] flex-col items-center text-center">
            <h1 className="text-[clamp(3rem,5vw,4.6rem)] font-semibold leading-[0.99] tracking-[-0.04em]">
              Pay for verified hiring work, not software seats.
            </h1>
            <p className="mt-6 max-w-[680px] text-[18px] leading-[1.55] text-[var(--text-secondary)]">
              Bring candidates to Verify, ask Fydell to Search, or build an
              ongoing verified pipeline with Partner.
            </p>
          </header>

          <section className="mt-20 overflow-hidden rounded-[16px] bg-[var(--surface-raised)] shadow-[0_0_0_1px_var(--border-default),0_12px_36px_rgba(45,38,32,0.08)]">
            <header className="flex min-h-12 flex-wrap items-center justify-between gap-4 border-b border-[var(--border-default)] bg-[var(--surface-band)] px-5 text-[12px] text-[var(--text-tertiary)]">
              <span>Ways to work with Fydell</span>
              <span>Candidates never pay</span>
            </header>
            <div className="grid min-[900px]:grid-cols-4">
            {OFFERS.map((offer, index) => (
            <article
              key={offer.name}
              className={`flex min-h-[560px] flex-col px-6 py-8 ${
                index === 0
                  ? ""
                  : "border-t border-[var(--border-subtle)] min-[900px]:border-l min-[900px]:border-t-0"
              } ${offer.recommended ? "bg-[var(--surface-selected)]" : ""}`}
            >
              <div className="min-h-6">
                {offer.recommended ? (
                  <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                    Core offer
                  </span>
                ) : null}
              </div>
              <h2 className="mt-3 text-[18px] font-semibold tracking-[-0.02em]">
                {offer.name}
              </h2>
              <div className="mt-3 min-h-[58px]">
                <p className="text-[22px] font-medium tracking-[-0.025em] tabular-nums">
                  {offer.price}
                </p>
                <p className="mt-1 text-[12px] text-[var(--text-tertiary)]">
                  {offer.cadence}
                </p>
              </div>
              <p className="mt-6 min-h-[68px] border-t border-[var(--border-subtle)] pt-4 text-[13.5px] leading-[1.6] text-[var(--text-secondary)]">
                {offer.description}
              </p>
              <ul className="mt-5 space-y-3">
                {offer.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex gap-2.5 text-[13px] leading-[1.45] text-[var(--text-secondary)]"
                  >
                    <span
                      aria-hidden
                      className="mt-[5px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-[var(--border-strong)] text-[9px] text-[var(--text-primary)]"
                    >
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-10">
                <ButtonLink
                  href={offer.name === "Candidates" ? "/trust" : "/contact"}
                  variant={offer.recommended ? "primary" : "soft"}
                  className="w-full"
                >
                  {offer.action}
                </ButtonLink>
              </div>
            </article>
          ))}
            </div>
          </section>

          <p className="mt-6 max-w-[720px] text-[13px] leading-[1.6] text-[var(--text-tertiary)]">
            Search placement fees apply only when a candidate is hired. Partner
            agreements define the active roles, expected hiring volume, and
            sourcing scope before work begins.
          </p>
        </div>
      </main>
    </MarketingShell>
  );
}
