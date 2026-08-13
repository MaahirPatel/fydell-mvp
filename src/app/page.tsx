import MarketingShell from "@/components/layout/MarketingShell";
import { ButtonLink } from "@/components/marketing/ui";
import HeroSimPreview from "@/components/marketing/home/HeroSimPreview";
import HomeProductStory from "@/components/marketing/home/HomeProductStory";
import HeroEvidenceScene from "@/components/marketing/home/HeroEvidenceScene";
import { EvidenceTrace } from "@/components/fydell/EvidenceTrace";
import { NORTHLINE_TRACE } from "@/lib/fixtures/northline";

export const metadata = {
  title: "See the work before you make the hire",
  description:
    "Fydell gives one candidate a real problem, then gives your team a conclusion you can open claim by claim. Create a workspace and invite your first candidate.",
};

export default function HomePage() {
  return (
    <MarketingShell>
      {/* The first viewport answers four questions in order: what Fydell is, what
          happens, what the employer receives, and what to do next. The report
          scene sits opposite the headline so the answer to the third question is
          visible rather than promised. */}
      <section className="pb-14 pt-[116px] sm:pt-[124px]">
        <div className="mkt-content">
          <div className="grid items-start gap-y-10 lg:grid-cols-12 lg:gap-x-12">
            <div className="lg:col-span-5">
              <h1 className="hero-display-split">
                See the work before you make the hire.
              </h1>
              <p className="mt-5 max-w-[46ch] text-[16.5px] leading-[1.6] text-[var(--text-secondary)]">
                A candidate investigates a real operations problem, cites what
                they used, and defends a conclusion when the facts change. You
                read the conclusion and open the evidence behind every claim.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <ButtonLink href="/signup" variant="primary">
                  Create your workspace
                </ButtonLink>
                <ButtonLink href="/simulations" variant="secondary">
                  See the evaluation
                </ButtonLink>
              </div>
            </div>

            <div className="lg:col-span-7">
              <HeroEvidenceScene />
            </div>
          </div>

          {/* The connector. Without it the workbench below reads as an unrelated
              second screenshot instead of the thing that produced the report. */}
          <div className="mt-10 border-t border-[var(--border-subtle)] pt-5 lg:mt-12">
            <p className="text-[12.5px] text-[var(--text-tertiary)]">
              That report came from this work.
            </p>
            <EvidenceTrace
              nodes={NORTHLINE_TRACE.slice(0, 4)}
              className="mt-3.5 hidden lg:block"
              caption="How a source becomes a cited claim: source, candidate action, claim, citation."
            />
          </div>

          <div className="mt-5">
            <HeroSimPreview />
          </div>
        </div>
      </section>

      <HomeProductStory />
    </MarketingShell>
  );
}
