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
      <section className="relative overflow-hidden pb-10 pt-[112px] sm:pt-[120px] lg:pb-14">
        <div className="mkt-content relative z-10">
          <div className="max-w-[640px]">
            <h1
              className="flat-type text-[36px] font-semibold leading-[1.08] tracking-[-0.03em] text-white sm:text-[44px] lg:text-[48px]"
              style={{ textWrap: "balance" }}
            >
              Real work before you interview - with evidence you can open.
            </h1>
            <p className="mt-5 max-w-[520px] text-[15px] leading-relaxed text-white/50 sm:text-[16px]">
              Candidates complete a realistic Data Analyst investigation. Fydell turns their
              decisions, artifacts, revisions, and follow-up defense into an inspectable report.
              Candidates keep a private Work Receipt they control.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href="/request-pilot" variant="primary">
                Request a pilot
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary">
                Sign in
              </ButtonLink>
            </div>
          </div>

          <div className="relative mt-12 sm:mt-14">
            <HeroSimPreview />
          </div>
        </div>
      </section>

      <HomeProductStory />
    </MarketingShell>
  );
}
