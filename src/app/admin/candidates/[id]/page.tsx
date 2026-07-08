import Link from "next/link";
import { redirect } from "next/navigation";
import Logo from "@/components/Logo";
import LogoutButton from "@/components/admin/LogoutButton";
import ScoringPanel from "@/components/admin/ScoringPanel";
import CompareSelect from "@/components/admin/CompareSelect";
import { getAdminSession } from "@/lib/auth";
import {
  getCandidateFull,
  listCandidatesForAdmin,
  type CandidateFull
} from "@/lib/db";
import { STAGE_LABELS } from "@/lib/scenario";
import type { Response, Stage } from "@/lib/types";

export const dynamic = "force-dynamic";

const STAGE_ORDER: Stage[] = [
  "associate_update",
  "manager_read",
  "market_update",
  "final_q1",
  "final_q2",
  "final_q3"
];

function byStage(responses: Response[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const r of responses) o[r.stage] = r.response_text ?? "";
  return o;
}

function fmtTime(seconds: number | null | undefined): string {
  if (seconds == null) return "-";
  return `${Math.floor(seconds / 60)}m ${(seconds % 60).toString().padStart(2, "0")}s`;
}

function ResponseBlock({ label, text }: { label: string; text: string | undefined }) {
  return (
    <div className="rounded-xl border border-line bg-bg p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">
        {text && text.trim() ? text : <span className="italic text-muted">No response.</span>}
      </p>
    </div>
  );
}

export default async function CandidateReportPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ compare?: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin");

  const { id } = await params;
  const { compare } = await searchParams;

  const full = await getCandidateFull(id);
  if (!full) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="rounded-2xl border border-line bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <h1 className="text-2xl">Candidate not found</h1>
          <Link href="/admin/dashboard" className="mt-4 inline-block text-blue">
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { candidate, employer, session: sess, responses, score } = full;
  const answers = byStage(responses);

  const allCandidates = await listCandidatesForAdmin();
  const compareOptions = allCandidates
    .filter((c) => c.id !== id)
    .map((c) => ({ id: c.id, name: `${c.name} - ${c.employer_name}` }));

  let compareFull: CandidateFull | null = null;
  if (compare) compareFull = await getCandidateFull(compare);
  const compareAnswers = compareFull ? byStage(compareFull.responses) : null;

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Logo size={22} />
            <Link href="/admin/dashboard" className="text-sm font-semibold text-blue">
              ← Dashboard
            </Link>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* Header card */}
        <div className="rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl">{candidate.name}</h1>
              <p className="mt-1 text-ink-2">
                {candidate.email} | {employer.name} | {candidate.role}
              </p>
              <p className="mt-1 text-sm text-muted">
                Status: <span className="capitalize">{candidate.status}</span> | Time
                spent: {fmtTime(sess?.time_spent_seconds)} | Submitted:{" "}
                {sess?.submitted_at
                  ? new Date(sess.submitted_at).toLocaleString()
                  : "-"}
              </p>
            </div>
            <a
              href={`/api/admin/candidates/${id}/pdf`}
              className="inline-flex h-11 items-center justify-center rounded-xl bg-navy px-5 font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:bg-teal"
            >
              Generate PDF Report
            </a>
          </div>
        </div>

        {/* Section 1 - Simulation Responses */}
        <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-lg">1 | Simulation Responses</h2>
          <p className="mt-0.5 text-sm text-muted">Verbatim, as the candidate wrote them.</p>
          <div className="mt-4 grid gap-3">
            {STAGE_ORDER.map((stage) => (
              <ResponseBlock
                key={stage}
                label={STAGE_LABELS[stage]}
                text={answers[stage]}
              />
            ))}
          </div>
        </section>

        {/* Section 2 + 3 - Scoring rubric + Admin notes */}
        <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            2 &amp; 3 | Evaluation
          </p>
          <div className="mt-3">
            <ScoringPanel candidateId={id} initial={score} />
          </div>
        </section>

        {/* Section 4 - Comparison */}
        <section className="mt-6 rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg">4 | Comparison</h2>
            <CompareSelect options={compareOptions} current={compare ?? null} />
          </div>

          {compareFull && compareAnswers ? (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-bold text-navy">{candidate.name}</h3>
                <div className="mt-3 grid gap-3">
                  {STAGE_ORDER.map((stage) => (
                    <ResponseBlock
                      key={stage}
                      label={STAGE_LABELS[stage]}
                      text={answers[stage]}
                    />
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-bold text-navy">
                  {compareFull.candidate.name}
                </h3>
                <div className="mt-3 grid gap-3">
                  {STAGE_ORDER.map((stage) => (
                    <ResponseBlock
                      key={stage}
                      label={STAGE_LABELS[stage]}
                      text={compareAnswers[stage]}
                    />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Select another candidate to view their responses side by side.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
