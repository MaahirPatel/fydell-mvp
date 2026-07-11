import { Container } from "@/components/marketing/ui";
import { Reveal } from "@/components/motion/Reveal";
import HomeReportMock from "@/components/marketing/home/HomeReportMock";

export default function HomeEvidenceReport() {
  return (
    <section className="mkt-section border-t border-[var(--border-subtle)]">
      <Container>
        <div className="grid items-start gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-14">
          <Reveal>
            <div className="overflow-hidden rounded-[16px] border border-white/[0.11] max-md:overflow-x-auto">
              <div className="min-w-[560px] md:min-w-0">
                <HomeReportMock />
              </div>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="max-w-[420px] lg:pt-2">
            <h2
              className="text-[var(--text-primary)] text-balance"
              style={{
                fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
                lineHeight: 1.12,
                letterSpacing: "-0.035em",
                fontWeight: 650,
              }}
            >
              Every conclusion traces back to the work.
            </h2>
            <p
              className="mt-4 text-[16px] leading-[1.6] text-[var(--text-secondary)] sm:text-[17px]"
              style={{ fontWeight: 450 }}
            >
              Hiring teams receive a structured evidence report — recommendation, confidence,
              observed strengths, gaps, and interview questions grounded in what the candidate
              actually did.
            </p>
            <ul className="mt-8 space-y-3">
              {[
                "Recommendation and confidence without fake match scores",
                "Strengths and review items tied to session evidence",
                "Interview questions generated from the work itself",
              ].map((item) => (
                <li
                  key={item}
                  className="flex gap-3 text-[14px] leading-[1.5] text-[var(--text-secondary)]"
                  style={{ fontWeight: 450 }}
                >
                  <span className="mt-2 h-px w-3 shrink-0 bg-[var(--brand-blue)]" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </Container>
    </section>
  );
}
