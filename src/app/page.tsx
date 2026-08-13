import MarketingShell from "@/components/layout/MarketingShell";
import HeroSimPreview from "@/components/marketing/home/HeroSimPreview";
import HomeProductStory from "@/components/marketing/home/HomeProductStory";
import { ButtonLink } from "@/components/marketing/ui";

export const metadata = {
  title: "Fydell | See how candidates work before you interview",
  description:
    "Realistic role-specific work simulations with inspectable evidence reports and candidate-controlled Work Receipts.",
};

export default function HomePage() {
  return (
    <MarketingShell>
      <section className="relative overflow-hidden pb-16 pt-[96px] sm:pt-[104px] lg:pb-20">
        <div className="mkt-content relative z-10">
          <div className="max-w-[740px]">
            <h1
              className="flat-type text-[40px] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[52px] lg:text-[58px]"
              style={{ textWrap: "balance", fontWeight: 600 }}
            >
              Real work before you interview - with evidence you can open.
            </h1>
            <p className="mt-6 max-w-[540px] text-[16px] leading-relaxed text-white/50">
              A candidate investigates real work, collects evidence, and produces an inspectable
              conclusion you can open claim by claim.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink href="/request-pilot" variant="primary">
                Request a pilot
              </ButtonLink>
              <ButtonLink href="/product" variant="secondary">
                See the product
              </ButtonLink>
            </div>
          </div>

          <div className="relative mt-14 sm:mt-16 lg:mt-[72px]">
            <HeroSimPreview />
          </div>
        </div>
      </section>

      <HomeProductStory />
    </MarketingShell>
  );
}
