import MarketingShell from "@/components/layout/MarketingShell";
import { ButtonLink, TextLink } from "@/components/marketing/ui";
import HomeProductStory from "@/components/marketing/home/HomeProductStory";
import HeroEvidenceScene from "@/components/marketing/home/HeroEvidenceScene";
import { ProductSpotlight } from "@/components/fydell/ProductSpotlight";

export const metadata = {
  title: "See the work before you make the hire",
  description:
    "Fydell gives one candidate a real problem, then gives your team a conclusion you can open claim by claim. Request a pilot to run the Data Analyst evaluation.",
};

export default function HomePage() {
  return (
    <MarketingShell>
      <section className="pb-8 pt-[128px] sm:pt-[144px]">
        <div className="mkt-content">
          <p className="section-eyebrow reveal-in">
            Verified work evidence for hiring
          </p>
          <h1 className="hero-display reveal-in mt-5 max-w-[18ch]">
            See the work before you make the hire.
          </h1>
          <p className="reveal-in reveal-in-delay-1 mt-6 max-w-[42ch] text-[1.25rem] leading-[1.55] text-[var(--text-secondary)]">
            A candidate investigates a real operations problem, cites what they
            used, and defends a conclusion when the facts change. You open the
            evidence behind every claim.
          </p>
          <div className="reveal-in reveal-in-delay-1 mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <ButtonLink href="/request-pilot" variant="primary">
              Request a pilot
            </ButtonLink>
            <TextLink href="/simulations">See the evaluation</TextLink>
          </div>

          <ProductSpotlight brand className="reveal-in reveal-in-delay-2 mt-14 lg:mt-16">
            <HeroEvidenceScene />
          </ProductSpotlight>
        </div>
      </section>

      <HomeProductStory />
    </MarketingShell>
  );
}
