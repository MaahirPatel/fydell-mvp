import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { listScenarios } from "@/lib/sim-engine/scenarios/catalog";
import { ROLE_DISPLAY } from "@/lib/sim-engine/types/roles";
import { isSimEngineEnabled } from "@/lib/sim-engine/featureFlag";

export const metadata = { title: "Simulations" };
export const dynamic = "force-dynamic";

export default async function WorkspaceSimulationsPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=%2Fapp%2Femployer%2Fsimulations");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/app/employer");

  if (!isSimEngineEnabled()) {
    return (
      <div className="max-w-[900px]">
        <PageHeader
          title="Simulations"
          description="The work environments a candidate is put into."
        />
        <div className="mt-7">
          <EmptyState
            title="The simulation engine is turned off in this environment"
            description="Set SIM_ENGINE_ENABLED=1 to run simulations here. Published evaluations are unaffected."
          />
        </div>
      </div>
    );
  }

  const scenarios = listScenarios();

  return (
    <div>
      <PageHeader
        title="Simulations"
        description="The work environments behind your evaluations. Open one to run it exactly as a candidate does, or read the analysis it produces."
      />

      <div className="mt-7 overflow-hidden rounded-[var(--radius-panel)] border border-[var(--border-default)]">
        {scenarios.map((scenario, index) => {
          const meta = scenario.metadata;
          const role = ROLE_DISPLAY[meta.roleKey]?.label ?? meta.roleKey;
          return (
            <div
              key={meta.id}
              className={`flex flex-wrap items-start justify-between gap-4 bg-[var(--surface-panel)] px-5 py-4 ${
                index > 0 ? "border-t border-[var(--border-subtle)]" : ""
              }`}
            >
              <div className="min-w-0 max-w-[640px]">
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                  <Link
                    href={`/app/employer/workbench/${meta.id}`}
                    className="text-app-body font-medium text-[var(--text-primary)] hover:underline"
                  >
                    {meta.title}
                  </Link>
                  <span className="text-app-meta text-[var(--text-tertiary)]">{role}</span>
                </div>
                <p className="mt-1 text-app-meta leading-[1.55] text-[var(--text-secondary)]">
                  {meta.description}
                </p>
                <p className="mt-2 font-mono text-[11.5px] text-[var(--text-tertiary)]">
                  {meta.id} &middot; scenario {scenario.versions.scenarioVersion} &middot;
                  engine {scenario.versions.engineVersion} &middot;{" "}
                  {meta.estimatedDurationMinutes} min &middot; {meta.difficulty}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/app/employer/workbench/${meta.id}`}
                  className="inline-flex h-8 items-center rounded-[var(--radius-control)] bg-[var(--control-solid)] px-3 text-[13px] font-medium text-[var(--control-solid-ink)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--control-solid-hover)]"
                >
                  Open workbench
                </Link>
                <Link
                  href={`/app/employer/workbench/${meta.id}/analysis`}
                  className="inline-flex h-8 items-center rounded-[var(--radius-control)] border border-[var(--border-strong)] px-3 text-[13px] font-medium text-[var(--text-primary)] transition-colors duration-[var(--motion-fast)] hover:bg-[var(--surface-hover)]"
                >
                  Analysis
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 max-w-[720px] text-app-meta leading-[1.6] text-[var(--text-tertiary)]">
        Opening a workbench here runs the real simulation, but the attempt is
        yours and is not recorded against any candidate. Candidate attempts
        arrive through an invitation and appear under Candidates.
      </p>
    </div>
  );
}
