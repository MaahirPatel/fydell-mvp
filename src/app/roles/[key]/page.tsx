import Link from "next/link";
import { notFound } from "next/navigation";
import MarketingShell from "@/components/layout/MarketingShell";
import { ROLES, ROLE_BY_KEY, PATHWAYS } from "@/lib/simulations/roles";
import { simTitleForSlug, simTaglineForSlug } from "@/lib/simulations/sim-titles";
import type { RoleKey } from "@/lib/simulations/types";

export function generateStaticParams() {
  return ROLES.map((r) => ({ key: r.key }));
}

/** Accept both /roles/data_analyst and /roles/data-analyst. */
function normalizeKey(key: string): RoleKey {
  return key.replace(/-/g, "_") as RoleKey;
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const role = ROLE_BY_KEY[normalizeKey(key)];
  if (!role) return { title: "Role | Fydell" };
  return {
    title: `${role.title} | Fydell`,
    description: role.shortDescription,
  };
}

export default async function RolePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const role = ROLE_BY_KEY[normalizeKey(key)];
  if (!role) notFound();

  const pathway = PATHWAYS.find((p) => p.key === role.pathway);

  return (
    <MarketingShell>
      <section className="pb-24">
        <div className="mkt-content pt-[130px] sm:pt-[150px]">
          <p
            className="text-[12.5px] uppercase tracking-[0.09em] text-[rgba(244,245,247,0.4)]"
            style={{ fontWeight: 560 }}
          >
            {pathway?.title}
          </p>
          <h1 className="flat-type mt-3 max-w-3xl text-4xl font-semibold leading-tight text-[#F4F5F7] sm:text-5xl">
            {role.title}
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-[rgba(244,245,247,0.62)]">
            {role.shortDescription}
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link
              href={`/simulations/start/${role.simulationSlug}`}
              className="inline-flex h-[44px] items-center rounded-[10px] bg-violet-500 px-6 text-[14px] font-semibold text-white transition hover:bg-violet-400"
            >
              Try a simulation
            </Link>
            <Link
              href="/request-pilot"
              className="inline-flex h-[44px] items-center rounded-[10px] border border-white/20 px-6 text-[14px] font-semibold text-[#F4F5F7] transition hover:bg-white/[0.06]"
            >
              Invite candidates
            </Link>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
              <h2 className="text-[14px] font-semibold text-white">What the role does</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/60">{role.whatTheyDo}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
              <h2 className="text-[14px] font-semibold text-white">Why it is hard to evaluate</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-white/60">
                {role.whyHardToEvaluate}
              </p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <h2 className="text-[14px] font-semibold text-white">Skills measured</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {role.skillsEvaluated.map((s) => (
                <span
                  key={s}
                  className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[12.5px] text-white/70"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold text-white">Five simulations</h2>
            <p className="mt-1.5 text-[13.5px] text-white/50">
              Each one is a single realistic decision. Five minutes, real materials, a stakeholder
              to question.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {role.simulationSlugs.map((slug, i) => (
                <Link
                  key={slug}
                  href={`/simulations/start/${slug}`}
                  className="group flex items-start gap-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-5 transition hover:border-violet-500/40 hover:bg-white/[0.04]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[13px] font-bold text-violet-300">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-semibold text-white group-hover:text-violet-200">
                      {simTitleForSlug(slug)}
                    </p>
                    {simTaglineForSlug(slug) && (
                      <p className="mt-1 text-[12.5px] leading-relaxed text-white/50">
                        {simTaglineForSlug(slug)}
                      </p>
                    )}
                    <p className="mt-1.5 text-[11px] text-white/35">5 minutes · free to try</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-6">
            <h2 className="text-[14px] font-semibold text-white">Example evidence</h2>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-white/60">
              After a candidate submits, you see the objective answers, the reasoning they wrote,
              the questions they asked the stakeholder and how it all maps to the skills above.
              Every statement in the report cites a specific action or answer.
            </p>
            <Link
              href="/#evidence"
              className="mt-3 inline-block text-[13px] font-semibold text-violet-300 hover:text-violet-200"
            >
              See a full evidence report
            </Link>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
