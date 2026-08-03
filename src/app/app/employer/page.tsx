import Link from "next/link";
import { redirect } from "next/navigation";
import { requireOrgMember, requireUser } from "@/lib/simulations/auth";
import RecentCandidates from "@/components/employer/RecentCandidates";
import SimulationLibrary from "@/components/employer/SimulationLibrary";
import { getEmployerCatalog } from "./_lib/catalog";
import { getInvitationRecords, getOverviewMetrics, getReportRecords } from "./_lib/data";

export const metadata = { title: "Overview | Fydell" };
export const dynamic = "force-dynamic";

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-[28px] font-semibold leading-none text-slate-900">{value}</p>
      <p className="mt-2 text-[13.5px] text-slate-500">{label}</p>
    </div>
  );
}

export default async function EmployerOverviewPage() {
  const user = await requireUser();
  if (!user) redirect("/login?next=/app/employer");
  const org = await requireOrgMember(user.id);
  if (!org) redirect("/onboarding/employer");

  const [metrics, invitations, reports, catalog] = await Promise.all([
    getOverviewMetrics(org.organizationId),
    getInvitationRecords(org.organizationId, 8),
    getReportRecords(org.organizationId, 5),
    getEmployerCatalog(),
  ]);

  const recentRows = invitations.map((r) => ({
    invitationId: r.invitationId,
    candidate: r.name || r.email,
    roleTitle: r.roleTitle,
    simulation: r.simulation,
    status: r.status,
    statusLabel: r.statusLabel,
    result: r.result,
    sessionId: r.sessionId,
    reportReady: r.reportReady,
  }));

  return (
    <div className="max-w-[1080px]">
      <h1 className="text-[24px] font-semibold text-slate-900">Overview</h1>
      <p className="mt-1 text-[15px] text-slate-500">
        Five-minute work simulations for six applied technical roles.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <Metric label="Candidates in progress" value={metrics.inProgress} />
        <Metric label="Completed simulations" value={metrics.completed} />
        <Metric label="Reports ready" value={metrics.reportsReady} />
      </div>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[17px] font-semibold text-slate-900">Recent candidates</h2>
          {recentRows.length > 0 && (
            <Link
              href="/app/employer/candidates"
              className="text-[13.5px] font-semibold text-violet-700 hover:text-violet-600"
            >
              View all
            </Link>
          )}
        </div>
        <div className="mt-3">
          <RecentCandidates rows={recentRows} />
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-[17px] font-semibold text-slate-900">Available simulations</h2>
          <Link
            href="/app/employer/assessments"
            className="text-[13.5px] font-semibold text-violet-700 hover:text-violet-600"
          >
            Browse the library
          </Link>
        </div>
        <div className="mt-3">
          <SimulationLibrary roles={catalog} compact />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-[17px] font-semibold text-slate-900">Recent reports</h2>
        {reports.length === 0 ? (
          <p className="mt-3 rounded-xl border border-slate-200 bg-white p-5 text-[14.5px] text-slate-500">
            Reports appear here after a candidate completes a simulation.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
            {reports.map((r) => (
              <li key={r.sessionId} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-slate-900">{r.candidate}</p>
                  <p className="truncate text-[13px] text-slate-500">
                    {r.simulation}
                    {r.bandLabel ? ` · ${r.bandLabel}` : ""}
                    {r.score !== null ? ` · ${r.score}/100` : ""}
                  </p>
                </div>
                <Link
                  href={`/app/employer/assessments/report/${r.sessionId}`}
                  className="shrink-0 text-[13.5px] font-semibold text-violet-700 hover:text-violet-600"
                >
                  View report
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
