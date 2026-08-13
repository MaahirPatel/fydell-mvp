import MarketingShell from "@/components/layout/MarketingShell";
import SimulationsFeed from "@/components/marketing/simulations/SimulationsFeed";
import { ButtonLink } from "@/components/marketing/ui";

export const metadata = {
  title: "Simulations | Fydell",
  description:
    "Realistic work trials across Applied Technical Roles. Investigate messy data, revise when facts change, and leave with inspectable evidence.",
};

export default function SimulationsCatalogPage() {
  return (
    <MarketingShell>
      <section className="pb-28">
        <div className="mkt-content pt-[120px] sm:pt-[140px]">
          <h1
            className="flat-type max-w-3xl text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] text-white sm:text-[52px] lg:text-[56px]"
            style={{ fontWeight: 600 }}
          >
            Simulations
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-relaxed text-white/50">
            Realistic work trials - not quizzes. Investigate, bookmark evidence, revise when the
            facts change, and leave with a result an employer can open.
          </p>

          <div className="mt-14 border-t border-[var(--border-subtle)] pt-8">
            <SimulationsFeed />
          </div>

          <div className="mt-24 max-w-xl border-t border-[var(--border-subtle)] pt-14">
            <h2 className="flat-type text-[28px] font-semibold tracking-[-0.02em] text-white sm:text-[32px]">
              Running a hiring cohort?
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-white/50">
              The October pilot centers one Data Analyst evaluation with secure invites and
              inspectable reports - not a role marketplace.
            </p>
            <div className="mt-8">
              <ButtonLink href="/request-pilot" variant="primary">
                Request a pilot
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
