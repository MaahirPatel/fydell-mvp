import { Container } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";
import WorkroomDetailMock from "@/components/marketing/home/WorkroomDetailMock";

const CAPABILITIES = [
  {
    title: "Forecasting under incomplete information",
    body: "Candidates revise a live model when source data conflicts with the base case.",
  },
  {
    title: "Stakeholder judgment under pressure",
    body: "Mid-session manager updates force a re-read of risk and prioritization.",
  },
  {
    title: "Executive communication tied to evidence",
    body: "The memo must connect assumptions and sources to a clear recommendation.",
  },
];

export default function HomeWorkroomDetail() {
  return (
    <section className="mkt-section border-t border-[var(--border-subtle)]">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:gap-14">
          <Reveal className="max-w-[480px]">
            <h2
              className="text-[var(--text-primary)] text-balance"
              style={{
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                lineHeight: 1.12,
                letterSpacing: "-0.035em",
                fontWeight: 650,
              }}
            >
              The workroom, not a quiz.
            </h2>
            <p
              className="mt-4 text-[16px] leading-[1.6] text-[var(--text-secondary)] sm:text-[17px]"
              style={{ fontWeight: 450 }}
            >
              Candidates review source material, revise a live forecast, respond to stakeholder
              updates, and submit a recommendation your team can inspect.
            </p>

            <div className="mt-9 space-y-0">
              {CAPABILITIES.map((item, i) => (
                <div
                  key={item.title}
                  className={[
                    "border-t border-[var(--border-subtle)] py-4",
                    i === CAPABILITIES.length - 1 ? "border-b" : "",
                  ].join(" ")}
                >
                  <h3
                    className="text-[14px] text-[var(--text-primary)]"
                    style={{ fontWeight: 580, letterSpacing: "-0.015em" }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="mt-1.5 text-[13px] leading-[1.55] text-[var(--text-secondary)]"
                    style={{ fontWeight: 450 }}
                  >
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="overflow-hidden rounded-[16px] border border-white/[0.11] max-md:overflow-x-auto">
              <div className="min-w-[560px] md:min-w-0">
                <WorkroomDetailMock />
              </div>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
