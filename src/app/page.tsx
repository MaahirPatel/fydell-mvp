import MarketingShell from "@/components/layout/MarketingShell";
import { ButtonLink } from "@/components/marketing/ui";
import HomeProductStory from "@/components/marketing/home/HomeProductStory";
import HeroComposition from "@/components/marketing/home/HeroComposition";
import { ProductSpotlight } from "@/components/fydell/ProductSpotlight";

export const metadata = {
  title: "See the work before you make the hire",
  description:
    "Fydell gives one candidate a real problem, then gives your team a conclusion you can open claim by claim. Run the Data Analyst evaluation.",
};

function CtaArrow() {
  return (
    <span
      aria-hidden
      className="-mr-0.5 transition-transform duration-150 ease-[var(--ease)] group-hover:translate-x-[3px]"
    >
      →
    </span>
  );
}

export default function HomePage() {
  return (
    <MarketingShell>
      <section className="pb-10 pt-[132px] sm:pt-[152px]">
        <div className="mkt-content">
          {/* The break is authored rather than left to text-wrap, because the
              two lines are the composition. */}
          <h1 className="hero-centered">
            See the work before{" "}
            <br className="hero-break" />
            you make the hire.
          </h1>
          <p className="hero-centered-lede">
            Give a candidate a realistic data problem, then review the
            conclusion, evidence, and reasoning behind it.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <ButtonLink href="/signup" variant="primary" className="group">
              Create your workspace
              <CtaArrow />
            </ButtonLink>
            <ButtonLink href="/simulations" variant="secondary" className="group">
              See the evaluation
              <CtaArrow />
            </ButtonLink>
          </div>

          <ProductSpotlight brand className="mt-16 lg:mt-20">
            <HeroComposition />
          </ProductSpotlight>
        </div>
      </section>

      <HomeProductStory />
    </MarketingShell>
  );
}
