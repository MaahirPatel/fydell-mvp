import Link from "next/link";
import MarketingShell from "@/components/layout/MarketingShell";
import { PATHWAYS, ROLES } from "@/lib/simulations/roles";
import { TRY_CANDIDATE_HREF } from "@/lib/marketing/ctas";

export const metadata = {
  title: "Applied Technical Roles | Fydell",
  description:
    "Six roles across three pathways. See what each role does and try a five-minute simulation.",
};

export default function RolesPage() {
  return (
    <MarketingShell>
      <section className="pb-24">
        <div className="mkt-content pt-[130px] sm:pt-[150px]">
          <h1 className="flat-type mt-3 max-w-3xl text-4xl font-semibold leading-tight text-[#0B1020] sm:text-5xl">
            The roles between the systems and the business.
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[#586273]">
            People in these roles use data, software and judgment to solve real problems. Try a
            simulation to see the work, not just the job title.
          </p>
          <Link
            href={TRY_CANDIDATE_HREF}
            className="mt-6 inline-flex h-[40px] items-center rounded-[9px] bg-[#3157D5] px-5 text-[13.5px] font-semibold text-white transition hover:bg-[#2342A2]"
          >
            Try the candidate experience
          </Link>

          <div className="mt-12 space-y-12">
            {PATHWAYS.map((pathway) => (
              <div key={pathway.key}>
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#586273]">
                  {pathway.title}
                </h2>
                <p className="mt-1 max-w-2xl text-[13.5px] text-[#586273]">{pathway.description}</p>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {ROLES.filter((r) => r.pathway === pathway.key).map((role) => (
                    <Link
                      key={role.key}
                      href={`/roles/${role.key}`}
                      className="group flex flex-col rounded-[12px] border border-[#D9DEE7] bg-[#FCFCFA] p-6 transition hover:border-[#3157D5]/40"
                    >
                      <h3 className="text-[17px] font-semibold text-[#0B1020]">{role.title}</h3>
                      <p className="mt-2 text-[13.5px] leading-relaxed text-[#586273]">
                        {role.shortDescription}
                      </p>
                      <p className="mt-4 text-[12.5px] font-semibold text-[#3157D5]">
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
