import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { getOwnerPassport } from "@/lib/passport/store";
import { getAnalysis, latestAnalysis, latestCompleteReport } from "@/lib/builder-analysis/store";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";
import BuilderAnalysisView from "@/components/passport/BuilderAnalysisView";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

type SimulationReport = { key: string; title: string; organization: string; submittedAt: string | null; href: string };

async function simulationReports(userId: string): Promise<SimulationReport[]> {
  const admin = createAdminSupabaseClient();
  const [{ data: attempts }, { data: sessions }] = await Promise.all([
    admin
      .from("eng_attempts")
      .select("id, submitted_at, eng_invitations(role_snapshot)")
      .eq("candidate_user_id", userId)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false }),
    admin
      .from("sim_sessions")
      .select("id, status, submitted_at, organizations(name), sim_templates(title)")
      .eq("candidate_user_id", userId)
      .not("status", "in", "(accepted,active)")
      .order("submitted_at", { ascending: false }),
  ]);
  const eng = ((attempts ?? []) as unknown as { id: string; submitted_at: string | null; eng_invitations: { role_snapshot: { title?: string; organizationName?: string } } | null }[]).map((a) => ({
    key: `eng-${a.id}`,
    title: a.eng_invitations?.role_snapshot.title ?? "Engineering task",
    organization: a.eng_invitations?.role_snapshot.organizationName ?? "",
    submittedAt: a.submitted_at,
    href: `/assess/${a.id}#report`,
  }));
  const sims = ((sessions ?? []) as unknown as { id: string; submitted_at: string | null; organizations: { name?: string } | null; sim_templates: { title?: string } | null }[]).map((x) => ({
    key: `sim-${x.id}`,
    title: x.sim_templates?.title ?? "Simulation",
    organization: x.organizations?.name ?? "",
    submittedAt: x.submitted_at,
    href: `/sim/${x.id}/result`,
  }));
  return [...eng, ...sims].sort((a, b) => (b.submittedAt ?? "").localeCompare(a.submittedAt ?? ""));
}

function day(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Recently";
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ run?: string }> }) {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent("/app/candidate/reports")}`);
  const { run } = await searchParams;
  const [passport, analysis, lastReport, opened, simReports] = await Promise.all([
    getOwnerPassport(user.id),
    latestAnalysis(user.id),
    latestCompleteReport(user.id),
    run ? getAnalysis(user.id, run) : Promise.resolve(null),
    simulationReports(user.id).catch(() => []),
  ]);
  const hasSources = !!passport?.githubLogin || (passport?.projects.length ?? 0) > 0;
  const viewing = opened?.status === "complete" && opened.report && opened.report.generatedAt !== lastReport?.generatedAt ? opened : null;

  return (
    <CandidateShell width="wide" current="reports">
      <CandidatePageHead
        title="Reports"
        lead="Your Builder Analysis across all projects, and the reports from simulations you have submitted. Each project's own report opens from Projects."
      />

      <section aria-labelledby="sim-reports" className="mt-8">
        <h2 id="sim-reports" className="text-app-section font-semibold text-[var(--text-primary)]">
          Simulation reports
        </h2>
        {simReports.length === 0 ? (
          <p className="mt-2 text-app-body text-[var(--text-secondary)]">
            When you submit a simulation, its report appears here once the hiring team releases it.{" "}
            <Link href="/app/candidate/practice" className="font-medium text-[var(--text-primary)] underline underline-offset-4">
              Try the practice simulation
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-[var(--border-subtle)] rounded-[10px] border border-[var(--border-default)] bg-[var(--surface-raised)]">
            {simReports.map((r) => (
              <li key={r.key}>
                <Link href={r.href} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-[var(--surface-hover)]">
                  <span className="min-w-0">
                    <span className="block text-app-body font-medium text-[var(--text-primary)] [overflow-wrap:anywhere]">{r.title}</span>
                    {r.organization ? <span className="block text-app-meta text-[var(--text-tertiary)]">{r.organization}</span> : null}
                  </span>
                  <span className="text-app-meta text-[var(--text-secondary)]">Submitted {day(r.submittedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="builder-analysis" className="mt-10">
        <h2 id="builder-analysis" className="text-app-section font-semibold text-[var(--text-primary)]">
          Builder Analysis
        </h2>
        <p className="mt-1 text-app-meta text-[var(--text-secondary)]">
          One report across all your projects: what each piece of work shows, where evidence is thin, and concrete next steps. Private to you.
        </p>
        <div className="mt-4">
          <BuilderAnalysisView initial={analysis} lastReport={lastReport} hasSources={hasSources} viewing={viewing} />
        </div>
      </section>
    </CandidateShell>
  );
}
