import { Container } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";

const LOOP = [
  "Role outcomes",
  "Work-trial evidence",
  "Hiring decision",
  "30/90-day performance",
  "Better future calibration",
];

export default function HomeCalibration() {
  return (
    <section className="mkt-section border-t border-[var(--border-subtle)]">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
          <Reveal className="max-w-[520px]">
            <h2
              className="text-[var(--text-primary)] text-balance"
              style={{
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                lineHeight: 1.12,
                letterSpacing: "-0.035em",
                fontWeight: 650,
              }}
            >
              The hiring decision is not where the learning stops.
            </h2>
            <p
              className="mt-4 text-[16px] leading-[1.6] text-[var(--text-secondary)] sm:text-[17px]"
              style={{ fontWeight: 450 }}
            >
              Fydell connects pre-hire evidence with structured 30- and 90-day feedback so finance
              teams can learn which signals actually transferred to the job.
            </p>
            <p className="mt-6 text-[12px] leading-[1.55] text-[var(--text-tertiary)]">
              Early-stage calibration. Fydell does not claim predictive validity until sufficient
              outcome data has been collected.
            </p>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="rounded-[16px] border border-[var(--border-subtle)] bg-[var(--surface-0)] px-5 py-5 sm:px-6 sm:py-6">
              <p
                className="text-[10px] uppercase tracking-[0.08em] text-[var(--text-tertiary)]"
                style={{ fontWeight: 550 }}
              >
                Calibration loop
              </p>
              <ol className="mt-5 space-y-0">
                {LOOP.map((step, i) => (
                  <li key={step} className="flex items-start gap-3">
                    <div className="flex w-6 flex-col items-center">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--brand-blue)]" />
                      {i < LOOP.length - 1 && (
                        <span className="mt-1 h-8 w-px bg-[var(--border-default)]" aria-hidden />
                      )}
                    </div>
                    <div className="pb-5">
                      <p className="text-[14px] text-[var(--text-primary)]" style={{ fontWeight: 550 }}>
                        {step}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
