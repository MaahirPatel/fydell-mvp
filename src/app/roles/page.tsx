import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import { PATHWAYS, ROLES } from "@/lib/simulations/roles";

export const metadata = {
  title: "Applied Technical Roles | Fydell",
  description:
    "Six roles, three pathways, five simulations each. See what each role does and try a five-minute simulation.",
};

export default function RolesPage() {
  return (
    <MarketingShell>
      <section className="pb-24">
        <div className="mkt-content pt-[130px] sm:pt-[150px]">
          <p
            className="text-[12.5px] uppercase tracking-[0.09em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 560 }}
          >
            Applied Technical Roles
          </p>
          <h1 className="flat-type mt-3 max-w-3xl text-4xl font-semibold leading-tight text-[#F4F5F7] sm:text-5xl">
            The roles between the systems and the business.
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[rgba(244,245,247,0.62)]">
            People in these roles use data, software and judgment to solve real problems. Each
            role has five curated five-minute simulations you can try right now.
          </p>

          <div className="mt-12 space-y-12">
            {PATHWAYS.map((pathway) => (
              <div key={pathway.key}>
                <h2 className="text-[13px] uppercase tracking-[0.08em] text-[rgba(244,245,247,0.45)]" style={{ fontWeight: 560 }}>
                  {pathway.title}
                </h2>
                <p className="mt-1 max-w-2xl text-[13.5px] text-[rgba(244,245,247,0.5)]">
                  {pathway.description}
                </p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {ROLES.filter((r) => r.pathway === pathway.key).map((role) => (
                    <Link
                      key={role.key}
                      href={`/roles/${role.key}`}
                      className="group flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6 transition hover:border-violet-500/40 hover:bg-white/[0.05]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[17px] font-semibold text-[#F4F5F7]">{role.title}</h3>
                        <span className="shrink-0 rounded-full bg-violet-500/15 px-2.5 py-1 text-[11px] font-semibold text-violet-300">
                          5 simulations
                        </span>
                      </div>
                      <p className="mt-2 text-[13.5px] leading-relaxed text-[rgba(244,245,247,0.62)]">
                        {role.shortDescription}
                      </p>
                      <p className="mt-4 text-[12.5px] font-semibold text-violet-300 group-hover:text-violet-200">
                        View role and simulations
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
