import MarketingShell from "@/components/layout/MarketingShell";
import { ButtonLink } from "@/components/marketing/ui";
import HeroSimPreview from "@/components/marketing/home/HeroSimPreview";
import HomeProductStory from "@/components/marketing/home/HomeProductStory";

export const metadata = {
  title: "See the work before you make the hire",
  description:
    "Fydell gives one candidate a real problem, then gives your team a conclusion you can open claim by claim. Create a workspace and invite your first candidate.",
};

export default function HomePage() {
  return (
    <MarketingShell>
      <section className="pb-16 pt-[132px] sm:pt-[148px] lg:pb-20">
        <div className="mkt-content">
          <h1 className="hero-display">See the work before you make the hire.</h1>
          <p className="mt-6 max-w-[64ch] text-[17px] leading-[1.6] text-[var(--text-secondary)]">
            A candidate investigates a real operations problem, cites what they
            used, and defends a conclusion when the facts change. You read the
            conclusion and open the evidence behind every claim.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <ButtonLink href="/signup" variant="primary">
              Create your workspace
            </ButtonLink>
            <ButtonLink href="/simulations" variant="secondary">
              See the evaluation
            </ButtonLink>
          </div>

          <div className="mt-14 sm:mt-16 lg:mt-[72px]">
            <HeroSimPreview />
          </div>
        </div>
      </section>

      <HomeProductStory />
    </MarketingShell>
  );
}
