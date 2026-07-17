import { Container, EditorialHeader } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";

const ROLE_OUTCOMES = [
  "Ship deployment work independently",
  "Surface risks and edge cases early",
  "Adapt when requirements change mid-task",
  "Communicate clearly with the customer",
];

const PRE_HIRE = [
  "Strong handling of the mid-session curveball",
  "Strong iteration across multiple file saves",
  "Moderate customer chat communication",
  "Limited evidence of test coverage without prompting",
];

const DAY_90 = [
  "Shipped changes within agreed review tolerance",
  "Edge cases surfaced early",
  "Customer updates consistently usable",
  "Test coverage improving",
];

const PATH = [
  "Role outcomes",
  "Work-trial evidence",
  "Hiring decision",
  "30-day check-in",
  "90-day outcome",
  "Calibration",
];

export default function HomeCalibration() {
  return (
    <section className="mkt-section border-t border-[var(--border-subtle)]">
      <Container>
        <Reveal>
          <EditorialHeader
            heading="Learn what transferred to the job."
            description="Structured 30- and 90-day feedback connects pre-hire evidence with real performance, helping hiring teams learn which signals actually mattered."
            stageHref="#request-pilot"
            stageLabel="4.0 · Outcome calibration"
          />
        </Reveal>

        <Reveal delay={0.08} className="mt-[72px] lg:mt-20">
          <div className="overflow-hidden rounded-[15px] border border-[rgba(255,255,255,0.10)] bg-[#090B10]">
            <div className="border-b border-[var(--border-subtle)] px-5 py-4">
              <div className="flex flex-wrap items-center gap-2 text-[12px]">
                {PATH.map((step, i) => (
                  <span key={step} className="inline-flex items-center gap-2">
                    <span
                      className={
                        i === PATH.length - 1
                          ? "text-[#F4F5F7]"
                          : "text-[rgba(244,245,247,0.5)]"
                      }
                      style={{ fontWeight: i === PATH.length - 1 ? 560 : 450 }}
                    >
                      {step}
                    </span>
                    {i < PATH.length - 1 && (
                      <span className="text-[rgba(244,245,247,0.28)]" aria-hidden>
                        →
                      </span>
                    )}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-0 md:grid-cols-3">
              <div className="border-b border-[var(--border-subtle)] p-5 md:border-b-0 md:border-r">
                <p
                  className="text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
                  style={{ fontWeight: 500 }}
                >
                  Role outcomes
                </p>
                <ul className="mt-3 space-y-2.5">
                  {ROLE_OUTCOMES.map((item) => (
                    <li key={item} className="text-[13px] text-[rgba(244,245,247,0.72)]">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="border-b border-[var(--border-subtle)] p-5 md:border-b-0 md:border-r">
                <p
                  className="text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
                  style={{ fontWeight: 500 }}
                >
                  Pre-hire evidence
                </p>
                <ul className="mt-3 space-y-2.5">
                  {PRE_HIRE.map((item) => (
                    <li key={item} className="text-[13px] text-[rgba(244,245,247,0.72)]">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-5">
                <p
                  className="text-[10px] uppercase tracking-[0.055em] text-[rgba(244,245,247,0.4)]"
                  style={{ fontWeight: 500 }}
                >
                  90-day observations
                </p>
                <ul className="mt-3 space-y-2.5">
                  {DAY_90.map((item) => (
                    <li key={item} className="text-[13px] text-[rgba(244,245,247,0.72)]">
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-5 py-3.5">
              <p className="text-[12px] text-[#F4F5F7]" style={{ fontWeight: 520 }}>
                Early calibration
              </p>
              <p className="text-[12px] text-[rgba(244,245,247,0.4)]">
                Insufficient sample for predictive claims
              </p>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
