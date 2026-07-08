import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import { getMvpSession } from "@/lib/mvp/auth";
import { createWorkspaceIfMissing, getAttemptReport } from "@/lib/mvp/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import DecisionControls from "./DecisionControls";

export const dynamic = "force-dynamic";

const SIGNAL_COLORS: Record<string, string> = {
  strong: "text-teal",
  moderate: "text-amber-600",
  weak: "text-orange-600",
  insufficient: "text-muted"
};

export default async function AttemptReportPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Logo size={26} className="mb-8" />
        <p className="text-ink-2">
          Supabase isn&apos;t configured in this environment. Set the env vars to view reports.
        </p>
      </main>
    );
  }

  const session = await getMvpSession();
  if (!session) redirect("/login");

  const workspace = await createWorkspaceIfMissing(session.userId);
  const data = await getAttemptReport(id);
  if (!data || data.attempt.workspace_id !== workspace.id) {
    return (
      <main className="mx-auto max-w-3xl px-6 py-16">
        <Logo size={26} className="mb-8" />
        <p className="text-ink-2">Report not found.</p>
      </main>
    );
  }

  const { attempt, simulation, report } = data;
  const signal = report?.overall_signal ?? "insufficient";

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <Logo size={26} className="mb-8" />

      <header className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
        <p className="text-sm text-muted">{simulation?.title ?? "Simulation"}</p>
        <h1 className="mt-1 text-2xl">
          {attempt.candidate_name ?? attempt.candidate_email ?? "Candidate"}
        </h1>
        <div className="mt-3 flex items-center gap-4">
          <span className="text-3xl font-semibold">{attempt.score ?? "Not scored"}</span>
          <span className="text-sm text-muted">/ 100 preliminary simulation signal</span>
          <span className={`text-sm font-semibold uppercase ${SIGNAL_COLORS[signal]}`}>
            {signal}
          </span>
        </div>
      </header>

      {!report && (
        <p className="mt-6 rounded-xl border border-line bg-white p-6 text-ink-2 shadow-[var(--shadow-card)]">
          No report yet. This attempt hasn&apos;t been submitted and scored.
        </p>
      )}

      {report && (
        <>
          <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">Summary</h2>
            <p className="mt-2 text-ink-2">{report.summary}</p>
          </section>

          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <section className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
                Strengths
              </h2>
              <ul className="mt-2 list-inside list-disc text-sm text-ink-2">
                {report.strengths_json.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
            <section className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">Risks</h2>
              <ul className="mt-2 list-inside list-disc text-sm text-ink-2">
                {report.risks_json.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
              Evidence
            </h2>
            <p className="mt-1 text-xs text-muted">
              Every signal is tied back to the candidate&apos;s own submitted work.
            </p>
            <ul className="mt-3 space-y-1 text-sm text-ink-2">
              {report.evidence_json.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </section>

          <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
              Suggested interview questions
            </h2>
            <ul className="mt-2 list-inside list-decimal text-sm text-ink-2">
              {report.interview_questions_json.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </section>
        </>
      )}

      <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-2">
          Hiring decision
        </h2>
        <DecisionControls attemptId={attempt.id} current={attempt.hiring_decision} />
      </section>
    </main>
  );
}
