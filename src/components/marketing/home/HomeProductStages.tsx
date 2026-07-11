import { Container } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";

const STAGES = [
  {
    n: "01",
    title: "Define the role",
    body: "Map the job to the outcomes the hire must own.",
  },
  {
    n: "02",
    title: "Run the work trial",
    body: "Candidates complete realistic finance work under changing conditions.",
  },
  {
    n: "03",
    title: "Review the evidence",
    body: "See assumptions, decisions, risks, communication, and AI judgment.",
  },
  {
    n: "04",
    title: "Focus the interview",
    body: "Use questions generated from what the candidate actually did.",
  },
];

export default function HomeProductStages() {
  return (
    <section className="mkt-section border-t border-[var(--border-subtle)]">
      <Container>
        <Reveal>
          <h2
            className="max-w-[720px] text-[var(--text-primary)] text-balance"
            style={{
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              lineHeight: 1.12,
              letterSpacing: "-0.035em",
              fontWeight: 650,
            }}
          >
            From role requirements to interview evidence.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-0 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {STAGES.map((stage, i) => (
            <Reveal key={stage.n} delay={0.04 * i}>
              <div
                className={[
                  "border-t border-[var(--border-default)] pt-5",
                  i > 0 ? "mt-8 sm:mt-0" : "",
                  "sm:border-t sm:pt-5",
                ].join(" ")}
              >
                <p className="text-[12px] tabular-nums text-[var(--text-tertiary)]" style={{ fontWeight: 520 }}>
                  {stage.n}
                </p>
                <h3
                  className="mt-3 text-[15px] text-[var(--text-primary)] sm:text-[16px]"
                  style={{ fontWeight: 580, letterSpacing: "-0.02em" }}
                >
                  {stage.title}
                </h3>
                <p
                  className="mt-2 text-[13px] leading-[1.55] text-[var(--text-secondary)] sm:text-[14px]"
                  style={{ fontWeight: 450 }}
                >
                  {stage.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Container>
    </section>
  );
}
