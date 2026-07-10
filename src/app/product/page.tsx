import MarketingShell from "@/components/layout/MarketingShell";
import { Reveal } from "@/components/motion/Reveal";
import { Container, ButtonLink, SectionHeading } from "@/components/marketing/ui";
import ProjectMeridianWindow from "@/components/marketing/ProjectMeridianWindow";
import EvidenceReportMockup from "@/components/marketing/EvidenceReportMockup";
import CategoryPanels from "@/components/marketing/CategoryPanels";
import FinalCTA from "@/components/marketing/FinalCTA";

export const metadata = {
  title: "Product | Fydell — FP&A work trials for hiring teams",
  description:
    "Fydell gives candidates a realistic FP&A task and gives hiring teams structured evidence from how the work was done.",
};

const CAPTURED_ITEMS = [
  "Documents opened and reviewed in the data room",
  "Model changes and assumption revisions",
  "Assumptions logged with sources",
  "Risks identified or missed",
  "AI tool usage and verification behavior",
  "Manager update response",
  "Final memo content and structure",
];

export default function ProductPage() {
  return (
    <MarketingShell>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="mkt-section pt-[100px] lg:pt-[136px]">
        <Container>
          <Reveal className="max-w-[660px]">
            <h1
              className="text-white"
              style={{ letterSpacing: "-0.04em" }}
            >
              The finance workroom before the interview.
            </h1>
            <p className="mt-6 max-w-[520px] text-[18px] leading-[1.65] text-white/[0.66]">
              Fydell gives candidates a realistic FP&A task and gives hiring teams structured
              evidence from how the work was done.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/request-pilot" variant="primary">
                Request a pilot
              </ButtonLink>
              <ButtonLink href="/how-it-works" variant="secondary">
                See how it works
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── Workroom preview ─────────────────────────────────────────────── */}
      <section className="pb-20 lg:pb-28">
        <Container wide>
          <Reveal>
            <ProjectMeridianWindow />
          </Reveal>
        </Container>
      </section>

      {/* ── Three objects ────────────────────────────────────────────────── */}
      <section className="mkt-section border-t border-white/[0.06]">
        <Container>
          <Reveal className="mb-12">
            <SectionHeading
              title="What the trial produces."
              subtitle="Every completed workroom generates three structured objects your hiring team can read, share, and act on."
            />
          </Reveal>
          <Reveal delay={0.08}>
            <CategoryPanels />
          </Reveal>
        </Container>
      </section>

      {/* ── What gets captured ───────────────────────────────────────────── */}
      <section className="mkt-section border-t border-white/[0.06]">
        <Container>
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <Reveal>
              <SectionHeading
                title="What gets captured."
                subtitle="Every action inside the workroom is logged as evidence — not scored by algorithm, but reviewed by the Fydell team before the report is delivered."
              />
              <ul className="mt-8 space-y-3">
                {CAPTURED_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-2 h-1 w-4 shrink-0 rounded-full bg-[#3B5BFF]" />
                    <span className="text-[15px] leading-[1.6] text-white/[0.66]">{item}</span>
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={0.1}>
              <div className="rounded-[16px] border border-white/[0.08] bg-[#080B12] p-6">
                <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.09em] text-white/[0.38]">
                  Evidence panel — in session
                </p>
                <div className="space-y-3">
                  {[
                    { label: "Documents opened", value: "7" },
                    { label: "Assumptions changed", value: "4" },
                    { label: "Risks flagged", value: "2" },
                    { label: "AI prompts logged", value: "9" },
                    { label: "Sources reviewed", value: "5" },
                    { label: "Notes added", value: "3" },
                  ].map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between border-b border-white/[0.05] pb-3 last:border-0 last:pb-0"
                    >
                      <span className="text-[13px] text-white/[0.55]">{row.label}</span>
                      <span className="text-[14px] font-semibold tabular-nums text-white">
                        {row.value}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-5 border-t border-white/[0.07] pt-4">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] text-white/[0.38]">Session progress</span>
                    <span className="text-[11px] font-semibold text-white">68%</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                    <div className="h-full w-[68%] rounded-full bg-[#3B5BFF]" />
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </Container>
      </section>

      {/* ── Evidence report preview ──────────────────────────────────────── */}
      <section className="mkt-section border-t border-white/[0.06]">
        <Container>
          <Reveal className="mb-12">
            <SectionHeading
              title="What your hiring team receives."
              subtitle="Within 24 hours of a candidate submitting, you get a structured evidence report. Advance, Hold, or Review — with the reasoning behind it."
            />
          </Reveal>
          <Reveal delay={0.08}>
            <EvidenceReportMockup />
          </Reveal>
          <Reveal delay={0.14}>
            <div className="mt-8 flex items-center gap-3">
              <ButtonLink href="/sample-report" variant="primary">
                View a full sample report
              </ButtonLink>
            </div>
          </Reveal>
        </Container>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <FinalCTA />
    </MarketingShell>
  );
}
