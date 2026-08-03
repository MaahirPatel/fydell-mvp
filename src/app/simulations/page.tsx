import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import { PATHWAYS, ROLES } from "@/lib/simulations/roles";
import { simTitleForSlug, simTaglineForSlug } from "@/lib/simulations/sim-titles";
import { CREATE_SIMULATION_HREF } from "@/lib/marketing/ctas";

export const metadata = {
  title: "Simulations | Fydell",
  description:
    "Work simulations across six applied technical roles. Pick one and try the candidate experience.",
};

export default function SimulationsCatalogPage() {
  return (
    <MarketingShell>
      <section className="pb-24">
        <div className="mkt-content pt-[140px] sm:pt-[160px]">
          <h1 className="flat-type max-w-3xl text-4xl font-semibold leading-tight text-[#0B1020] sm:text-5xl">
            Pick a role. Solve one realistic problem.
          </h1>
          <p className="mt-5 max-w-2xl text-[15.5px] leading-relaxed text-[#586273]">
            Every simulation is one narrow, representative decision from the role: messy data, a
            stakeholder to question, an answer to defend. Five minutes in, you get an
            evidence-backed result.
          </p>

          <div className="mt-14 space-y-14">
            {PATHWAYS.map((pathway) => (
              <div key={pathway.key}>
                <h2
                  className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#586273]"
                >
                  {pathway.title}
                </h2>
                <p className="mt-1 max-w-2xl text-[13.5px] text-[#586273]">{pathway.description}</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {ROLES.filter((r) => r.pathway === pathway.key).map((role) => (
                    <div
                      key={role.key}
                      className="flex flex-col rounded-[12px] border border-[#D9DEE7] bg-[#FCFCFA] p-6"
                    >
                      <h3 className="text-[17px] font-semibold text-[#0B1020]">{role.title}</h3>
                      <p className="mt-2 text-[13px] leading-relaxed text-[#586273]">
                        {role.shortDescription}
                      </p>
                      <ul className="mt-4 space-y-1.5">
                        {role.simulationSlugs.map((slug) => (
                          <li key={slug}>
                            <Link
                              href={`/simulations/start/${slug}`}
                              className="group flex items-center gap-2.5 rounded-[10px] border border-[#D9DEE7] bg-white px-3 py-2 transition hover:border-[#3157D5]/40"
                            >
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] text-[#0B1020]">
                                  {simTitleForSlug(slug)}
                                </span>
                                {simTaglineForSlug(slug) && (
                                  <span className="block truncate text-[11px] text-[#586273]">
                                    {simTaglineForSlug(slug)}
                                  </span>
                                )}
                              </span>
                              <span className="shrink-0 text-[10.5px] text-[#586273]">5 min</span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                      <div className="mt-4 pt-1">
                        <Link
                          href={`/roles/${role.key}`}
                          className="text-[12.5px] font-semibold text-[#3157D5] transition hover:text-[#2342A2]"
                        >
                          About this role
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-16 border-t border-[#D9DEE7] pt-10">
            <h2 className="text-xl font-semibold text-[#0B1020]">Hiring for these roles?</h2>
            <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-[#586273]">
              Create a simulation, invite candidates by email, and review an evidence report for
              every attempt.
            </p>
            <Link
              href={CREATE_SIMULATION_HREF}
              className="mt-5 inline-flex h-[40px] items-center rounded-[9px] bg-[#3157D5] px-5 text-[13.5px] font-semibold text-white transition hover:bg-[#2342A2]"
            >
              Create a simulation
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
