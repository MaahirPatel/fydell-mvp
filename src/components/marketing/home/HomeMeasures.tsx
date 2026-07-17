import { Container } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";

const DIMENSIONS = [
  {
    name: "Discovery and problem framing",
    description: "Clarifies what is broken before coding the first fix.",
    evidence: "Asked a question that changed system scope",
    state: "Supporting",
  },
  {
    name: "Technical scoping and prioritization",
    description: "Chooses the highest-risk failure path first.",
    evidence: "Prioritized the policy hole over cosmetic cleanup",
    state: "Supporting",
  },
  {
    name: "Engineering and applied-AI execution",
    description: "Implements a verified fix; AI output is checked, not trusted.",
    evidence: "Fixed routing + approval check; evals passed",
    state: "Strong",
  },
  {
    name: "Evaluation and production judgment",
    description: "Reads metrics honestly and refuses unsafe automation.",
    evidence: "Called out residual privacy risk in the handoff",
    state: "Supporting",
  },
  {
    name: "Adaptation and customer communication",
    description: "Adjusts after a mid-session change and tells the customer.",
    evidence: "Updated plan after the refund-policy curveball",
    state: "Supporting",
  },
];

export default function HomeMeasures() {
  return (
    <section className="mkt-section border-t border-[var(--border-subtle)]">
      <Container>
        <Reveal className="max-w-[560px]">
          <h2 className="section-heading flat-type">Evidence across the whole mission.</h2>
          <p className="section-desc mt-5">
            Five primary dimensions for a ~55-minute Relay session — each needs independent
            evidence opportunities. No overall candidate score. Activity volume is context only.
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
