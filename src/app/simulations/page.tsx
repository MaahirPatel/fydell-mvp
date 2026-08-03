import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import { PATHWAYS, ROLES } from "@/lib/simulations/roles";
import { simTitleForSlug, simTaglineForSlug } from "@/lib/simulations/sim-titles";

export const metadata = {
  title: "Five-Minute Simulations | Fydell",
  description:
    "Thirty curated five-minute work simulations across six Applied Technical Roles. Pick one and try it.",
};

export default function SimulationsCatalogPage() {
  return (
    <MarketingShell>
      <section className="pb-24">
        <div className="mkt-content pt-[140px] sm:pt-[160px]">
          <p
            className="text-[12.5px] uppercase tracking-[0.09em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 560 }}
          >
            Five-minute simulations
          </p>
          <h1 className="flat-type mt-3 max-w-3xl text-4xl font-semibold leading-tight text-[#F4F5F7] sm:text-5xl">
            Pick a role. Solve one realistic problem.
          </h1>
          <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-[rgba(244,245,247,0.62)]">
            Every simulation is one narrow, representative decision from the role: messy data, a
            stakeholder to question, an answer to defend. Five minutes in, you get an
            evidence-backed result.
          </p>

          <div className="mt-14 space-y-14">
            {PATHWAYS.map((pathway) => (
              <div key={pathway.key}>
                <h2
                  className="text-[13px] uppercase tracking-[0.08em] text-[rgba(244,245,247,0.45)]"
                  style={{ fontWeight: 560 }}
                >
                  {pathway.title}
                </h2>
                <p className="mt-1 max-w-2xl text-[13.5px] text-[rgba(244,245,247,0.5)]">
                  {pathway.description}
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {ROLES.filter((r) => r.pathway === pathway.key).map((role) => (
                    <div
                      key={role.key}
                      className="flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[17px] font-semibold text-[#F4F5F7]">{role.title}</h3>
                        <span className="shrink-0 rounded-full bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-300">
                          5 simulations
                        </span>
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-[rgba(244,245,247,0.62)]">
                        {role.shortDescription}
                      </p>
                      <ul className="mt-4 space-y-1.5">
                        {role.simulationSlugs.map((slug, i) => (
                          <li key={slug}>
                            <Link
                              href={`/simulations/start/${slug}`}
                              className="group flex items-center gap-2.5 rounded-lg border border-white/[0.05] bg-black/10 px-3 py-2 transition hover:border-violet-500/40 hover:bg-violet-500/5"
                            >
                              <span className="w-3 text-[11px] font-mono text-white/30">{i + 1}</span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] text-white/80 group-hover:text-white">
                                  {simTitleForSlug(slug)}
                                </span>
                                {simTaglineForSlug(slug) && (
                                  <span className="block truncate text-[11px] text-white/40">
                                    {simTaglineForSlug(slug)}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 text-[10.5px] text-white/30">5 min</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 flex items-center gap-4 pt-1">
                        <Link
                          href={`/roles/${role.key}`}
                          className="text-[12.5px] font-semibold text-violet-300 transition hover:text-violet-200"
                        >
                          About this role
                        </Link>
                        <span className="text-[12px] text-[rgba(244,245,247,0.35)]">
                          Free · no setup
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 text-center">
            <h2 className="text-xl font-semibold text-[#F4F5F7]">Hiring for these roles?</h2>
            <p className="mx-auto mt-2 max-w-xl text-[14px] leading-relaxed text-[rgba(244,245,247,0.62)]">
              Run a pilot: invite candidates by email, they complete a five-minute simulation, and
              you receive an evidence report for every attempt. Founding pilots are scoped
              directly.
            </p>
            <Link
              href="/pricing"
              className="mt-5 inline-flex h-[40px] items-center rounded-[9px] bg-[#F1F2F4] px-5 text-[13.5px] font-semibold text-[#08090C] transition hover:brightness-105"
            >
              Run a pilot
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
