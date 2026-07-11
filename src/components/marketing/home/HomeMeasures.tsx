import { Container } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";

const DIMENSIONS = [
  {
    name: "Financial reasoning",
    description: "Finds the business drivers behind the numbers.",
    evidence: "Revised forecast assumptions after reviewing renewal data.",
  },
  {
    name: "Commercial judgment",
    description: "Weighs tradeoffs that affect the operating plan.",
    evidence: "Conditioned hiring ramp on renewal pipeline quality.",
  },
  {
    name: "Data interpretation",
    description: "Separates signal from incomplete or conflicting inputs.",
    evidence: "Reconciled bookings and revenue before changing churn.",
  },
  {
    name: "Communication",
    description: "Writes a recommendation a finance leader can act on.",
    evidence: "Memo linked runway impact to a clear Advance / Hold call.",
  },
  {
    name: "Adaptability",
    description: "Updates the thesis when new information arrives.",
    evidence: "Reopened the model after the SMB renewal update.",
  },
  {
    name: "AI judgment",
    description: "Uses AI carefully and verifies sources before relying on it.",
    evidence: "Logged AI interactions and cited source documents.",
  },
];

export default function HomeMeasures() {
  return (
    <section className="mkt-section border-t border-[var(--border-subtle)]">
      <Container>
        <Reveal className="max-w-[640px]">
          <h2
            className="text-[var(--text-primary)] text-balance"
            style={{
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              lineHeight: 1.12,
              letterSpacing: "-0.035em",
              fontWeight: 650,
            }}
          >
            What Fydell measures.
          </h2>
          <p
            className="mt-4 text-[16px] leading-[1.6] text-[var(--text-secondary)] sm:text-[17px]"
            style={{ fontWeight: 450 }}
          >
            Six evidence dimensions — each tied to observable work inside the trial, not abstract
            personality scores.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-x-10 gap-y-0 sm:mt-12 md:grid-cols-2">
          {DIMENSIONS.map((d, i) => (
            <Reveal key={d.name} delay={0.03 * i}>
              <div className="border-t border-[var(--border-subtle)] py-5">
                <h3
                  className="text-[15px] text-[var(--text-primary)]"
                  style={{ fontWeight: 580, letterSpacing: "-0.015em" }}
                >
                  {d.name}
                </h3>
                <p
                  className="mt-1.5 text-[13px] leading-[1.5] text-[var(--text-secondary)]"
                  style={{ fontWeight: 450 }}
                >
                  {d.description}
                </p>
                <p className="mt-2 text-[12px] leading-[1.5] text-[var(--text-tertiary)]">
                  Evidence: {d.evidence}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
