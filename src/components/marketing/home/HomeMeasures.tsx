import { Container } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";

const DIMENSIONS = [
  {
    name: "Financial reasoning",
    description: "Connects drivers, assumptions, and financial effects.",
    evidence: "Revised revenue after reviewing renewal data",
    state: "Strong",
  },
  {
    name: "Commercial judgment",
    description: "Identifies which business risks matter.",
    evidence: "Flagged SMB renewal concentration",
    state: "Strong",
  },
  {
    name: "Data interpretation",
    description: "Finds inconsistencies and missing evidence.",
    evidence: "Reconciled bookings before changing churn",
    state: "Moderate",
  },
  {
    name: "Communication",
    description: "Explains conclusions in decision-ready language.",
    evidence: "Conditioned Advance on renewal confirmation",
    state: "Strong",
  },
  {
    name: "Adaptability",
    description: "Revises work when conditions change.",
    evidence: "Reopened model after manager update",
    state: "Strong",
  },
  {
    name: "AI judgment",
    description: "Uses AI while retaining verification and responsibility.",
    evidence: "Verified AI calculations against sources",
    state: "Moderate",
  },
];

export default function HomeMeasures() {
  return (
    <section className="mkt-section border-t border-[var(--border-subtle)]">
      <Container>
        <Reveal className="max-w-[560px]">
          <h2 className="section-heading flat-type">Evidence across the whole mission.</h2>
          <p className="section-desc mt-5">
            Observable dimensions tied to Project Relay — not personality scores or match
            percentages.
          </p>
        </Reveal>

        <div className="mt-12 border-t border-[var(--border-subtle)]">
          {DIMENSIONS.map((d, i) => (
            <Reveal key={d.name} delay={0.02 * i}>
              <div className="grid items-start gap-3 border-b border-[var(--border-subtle)] py-5 sm:grid-cols-[0.9fr_1.2fr_1.1fr_auto] sm:gap-6">
                <h3
                  className="text-[15px] text-[#F4F5F7]"
                  style={{ fontWeight: 560, letterSpacing: "-0.015em" }}
                >
                  {d.name}
                </h3>
                <p
                  className="text-[14px] leading-[1.5] text-[rgba(244,245,247,0.62)]"
                  style={{ fontWeight: 430 }}
                >
                  {d.description}
                </p>
                <p className="text-[13px] leading-[1.45] text-[rgba(244,245,247,0.4)]">
                  {d.evidence}
                </p>
                <span
                  className="inline-flex h-6 items-center rounded-[6px] border border-[var(--border-subtle)] px-2 text-[11px] text-[rgba(244,245,247,0.62)]"
                  style={{ fontWeight: 500 }}
                >
                  {d.state}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
