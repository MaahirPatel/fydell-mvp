import MarketingShell from "@/components/layout/MarketingShell";
import { ButtonLink } from "@/components/marketing/ui";
import HeroSimPreview from "@/components/marketing/home/HeroSimPreview";
import HomeProductStory from "@/components/marketing/home/HomeProductStory";
import HeroEvidenceScene from "@/components/marketing/home/HeroEvidenceScene";
import { EvidenceTrace } from "@/components/fydell/EvidenceTrace";
import { NORTHLINE_TRACE } from "@/lib/fixtures/northline";
import HomeClientAnimator from "@/components/marketing/home/HomeClientAnimator";

export const metadata = {
  title: "See the work before you make the hire",
  description:
    "Fydell gives one candidate a real problem, then gives your team a conclusion you can open claim by claim. Create a workspace and invite your first candidate.",
};

export default function HomePage() {
  return (
    <MarketingShell>
      <HomeClientAnimator>
        <section className="pb-14 pt-[116px] sm:pt-[124px]">
          <div className="mkt-content">
            <div className="grid items-start gap-y-10 lg:grid-cols-12 lg:gap-x-12">
              <div className="lg:col-span-5">
                <h1 className="hero-display-split hero-text-anim">
                  See the work before you make the hire.
                </h1>
                <p className="mt-5 max-w-[46ch] text-[16.5px] leading-[1.6] text-[var(--text-secondary)] hero-text-anim">
                  A candidate investigates a real operations problem, cites what
                  they used, and defends a conclusion when the facts change. You
                  read the conclusion and open the evidence behind every claim.
                </p>
                <div className="mt-7 flex flex-wrap items-center gap-3 hero-text-anim">
                  <ButtonLink href="/signup" variant="primary">
                    Create your workspace
                  </ButtonLink>
                  <ButtonLink href="/simulations" variant="secondary">
                    See the evaluation
                  </ButtonLink>
                </div>
              </div>

              <div className="lg:col-span-7 relative hero-scene-anim">
                {/* Subtle Linear-inspired brand glow behind the product scene */}
                <div className="absolute inset-0 bg-gradient-to-tr from-[var(--fydell-brand-blue)]/20 to-transparent blur-[80px] -z-10 rounded-full mix-blend-screen" />
                <HeroEvidenceScene />
              </div>
            </div>

            <div className="mt-10 border-t border-[var(--border-subtle)] pt-5 lg:mt-12 scroll-reveal">
              <p className="text-[12.5px] text-[var(--text-tertiary)]">
                That report came from this work.
              </p>
              <EvidenceTrace
                nodes={NORTHLINE_TRACE.slice(0, 4)}
                className="mt-3.5 hidden lg:block"
                caption="How a source becomes a cited claim: source, candidate action, claim, citation."
              />
            </div>

            <div className="mt-5 scroll-reveal">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--fydell-brand-blue)]/10 to-transparent blur-[60px] -z-10 mix-blend-screen opacity-50" />
                <HeroSimPreview />
              </div>
            </div>
          </div>
        </section>

        <div className="scroll-reveal">
          <HomeProductStory />
        </div>
      </HomeClientAnimator>
    </MarketingShell>
  );
}
