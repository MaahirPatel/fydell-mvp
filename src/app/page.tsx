import MarketingShell from "@/components/layout/MarketingShell";
import { Container, ButtonLink, SectionHeading } from "@/components/marketing/ui";
import ProjectMeridianWindow from "@/components/marketing/ProjectMeridianWindow";
import CategoryPanels from "@/components/marketing/CategoryPanels";
import WorkroomMockup from "@/components/marketing/WorkroomMockup";
import EvidenceReportMockup from "@/components/marketing/EvidenceReportMockup";
import FeedbackLoop from "@/components/marketing/FeedbackLoop";
import FinalCTA from "@/components/marketing/FinalCTA";

export const metadata = {
  title: "Fydell — Hire on real work, not polished resumes",
  description:
    "Fydell lets finance teams run realistic FP&A work trials and review structured evidence before deciding who to interview.",
};

const WORKROOM_FEATURES = [
  "Real documents",
  "Live manager updates",
  "Forecast model changes",
  "AI allowed with verification",
  "Final recommendation memo",
];

export default function HomePage() {
  return (
    <MarketingShell>
      {/* ─── 1. HERO ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-[120px] pb-16 sm:pt-[140px] sm:pb-24 lg:pt-[150px]">
        <div
          className="pointer-events-none absolute left-1/2 top-[10%] h-[520px] w-[900px] -translate-x-1/2 rounded-full opacity-90"
          style={{
            background: "radial-gradient(ellipse at center, rgba(59,91,255,0.10), transparent 68%)",
          }}
          aria-hidden
        />

        <Container wide className="relative z-10">
          <div className="mx-auto max-w-[980px] text-center">
            <h1
              className="text-white"
              style={{
                fontSize: "clamp(2.75rem, 6.5vw, 5.5rem)",
                lineHeight: 0.96,
                letterSpacing: "-0.04em",
                fontWeight: 650,
              }}
            >
              Hire on real work, not polished resumes.
            </h1>
            <p className="mx-auto mt-6 max-w-[680px] text-[17px] leading-[1.65] text-white/[0.66] sm:text-[18px] sm:leading-[1.7]">
              Fydell lets finance teams run realistic FP&A work trials and review structured
              evidence before deciding who to interview.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
              <ButtonLink href="/request-pilot" variant="primary" className="h-11 min-w-[148px] px-5 text-[15px]">
                Request a pilot
              </ButtonLink>
              <ButtonLink href="/sample-report" variant="secondary" className="h-11 min-w-[148px] px-5 text-[15px]">
                See sample report
              </ButtonLink>
            </div>
          </div>

          <div className="relative mx-auto mt-14 max-w-[1320px] sm:mt-16 lg:mt-20">
            <div
              className="pointer-events-none absolute -inset-8 rounded-[40px] opacity-80"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 40%, rgba(59,91,255,0.10), transparent 65%)",
              }}
              aria-hidden
            />
            {/* overflow-x only on small screens — overflow-x:auto creates a scrollport that fights wheel */}
            <div className="relative max-lg:overflow-x-auto lg:overflow-x-clip rounded-[20px]">
              <div className="min-w-[860px] lg:min-w-0">
                <ProjectMeridianWindow />
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── 2. CATEGORY / PHILOSOPHY ──────────────────────────── */}
      <section className="mkt-section border-t border-white/[0.06]" style={{ contentVisibility: "auto", containIntrinsicSize: "1px 900px" }}>
        <Container>
          <div className="max-w-[820px]">
            <h2
              className="text-white"
              style={{
                fontSize: "clamp(2rem, 4vw, 3.5rem)",
                lineHeight: 1.05,
                letterSpacing: "-0.04em",
                fontWeight: 620,
              }}
            >
              A new hiring signal for the AI era.
            </h2>
            <p className="mt-5 max-w-[640px] text-[17px] leading-[1.7] text-white/[0.66] sm:text-[18px]">
              Resumes show claims. Interviews show polish. Fydell shows how someone works through
              the actual job.
            </p>
          </div>
          <div className="mt-14 sm:mt-16">
            <CategoryPanels />
          </div>
        </Container>
      </section>

      {/* ─── 3. WORKROOM ───────────────────────────────────────── */}
      <section className="mkt-section border-t border-white/[0.06]" style={{ contentVisibility: "auto", containIntrinsicSize: "1px 1000px" }}>
        <Container wide>
          <div className="grid items-start gap-12 lg:grid-cols-[0.9fr_1.35fr] lg:gap-16 xl:gap-20">
            <div>
              <SectionHeading
                title="The workroom mirrors the job."
                subtitle="Candidates review documents, update assumptions, respond to new information, use AI carefully, and write a recommendation."
              />
              <ul className="mt-10 space-y-3.5">
                {WORKROOM_FEATURES.map((item) => (
                  <li key={item} className="flex items-center gap-3 text-[15px] text-white/[0.78]">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#3B5BFF]"
                      aria-hidden
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative min-w-0">
              <div className="max-lg:overflow-x-auto lg:overflow-x-clip rounded-[20px]">
                <div className="min-w-[780px] lg:min-w-0">
                  <WorkroomMockup />
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ─── 4. EVIDENCE REPORT ────────────────────────────────── */}
      <section className="mkt-section border-t border-white/[0.06]" style={{ contentVisibility: "auto", containIntrinsicSize: "1px 1200px" }}>
        <Container wide>
          <div className="mb-12 max-w-[720px] sm:mb-14">
            <SectionHeading
              title="Evidence your hiring team can act on."
              subtitle="See what the candidate changed, what they missed, how they reasoned, and what to ask next."
            />
          </div>
          <div className="max-lg:overflow-x-auto lg:overflow-x-clip rounded-[20px]">
            <div className="min-w-[720px] lg:min-w-0">
              <EvidenceReportMockup />
            </div>
          </div>
        </Container>
      </section>

      {/* ─── 5. FEEDBACK LOOP ──────────────────────────────────── */}
      <section className="mkt-section border-t border-white/[0.06]" style={{ contentVisibility: "auto", containIntrinsicSize: "1px 900px" }}>
        <Container>
          <div className="mb-12 max-w-[720px] sm:mb-14">
            <SectionHeading
              title="Every hiring decision improves the signal."
              subtitle="Fydell connects work-trial evidence with interview feedback and post-hire outcomes so the signal gets sharper over time."
            />
          </div>
          <FeedbackLoop />
        </Container>
      </section>

      {/* ─── 6. FINAL CTA ──────────────────────────────────────── */}
      <FinalCTA />
    </MarketingShell>
  );
}
