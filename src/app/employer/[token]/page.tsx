import Logo from "@/components/Logo";
import PasscodeGate from "@/components/employer/PasscodeGate";
import FeedbackForm from "@/components/employer/FeedbackForm";
import RequestReportButton from "@/components/employer/RequestReportButton";
import { getEmployerSession } from "@/lib/auth";
import {
  getEmployerByToken,
  getEmployerLeaderboard,
  type EmployerLeaderboardRow
} from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function EmployerPage({
  params
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let employer = null;
  try {
    employer = await getEmployerByToken(token);
  } catch {
    employer = null;
  }

  if (!employer) {
    return (
      <main className="grid min-h-screen place-items-center px-6">
        <div className="w-full max-w-md rounded-2xl border border-line bg-white p-10 text-center shadow-[var(--shadow-card)]">
          <Logo size={26} className="mb-6 justify-center" />
          <h1 className="text-2xl">This link isn&apos;t valid</h1>
          <p className="mt-3 text-ink-2">
            Check the employer link the Fydell team shared with you.
          </p>
        </div>
      </main>
    );
  }

  const session = await getEmployerSession();
  if (!session || session.token !== token) {
    return <PasscodeGate token={token} employerName={employer.name} />;
  }

  const rows: EmployerLeaderboardRow[] = await getEmployerLeaderboard(employer.id);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Logo size={24} />
          <span className="text-sm text-muted">{employer.name}</span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl">Candidate leaderboard</h1>
        <p className="mt-1 text-sm text-muted">
          Ranked by evaluation completeness. Most thoroughly verified candidates at the
          top.
        </p>

        <div className="mt-6 grid gap-3">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-line bg-white p-10 text-center text-muted shadow-[var(--shadow-card)]">
              No candidates yet.
            </div>
          ) : (
            rows.map((r, i) => (
              <div
                key={r.candidate.id}
                className="rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-card)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-sm font-bold text-white tabular">
                      {i + 1}
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-navy">
                        {r.candidate.name}
                      </h2>
                      <p className="mt-0.5 text-sm text-muted">
                        {r.candidate.role} |{" "}
                        <span className="capitalize">{r.candidate.status}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl border border-line bg-bg px-3 py-1.5 text-center">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Errors found
                      </div>
                      <div className="text-lg font-bold tabular text-teal-600">
                        {r.errorsFound}
                        <span className="text-sm text-muted">/3</span>
                      </div>
                    </div>
                    <RequestReportButton
                      token={token}
                      candidateName={r.candidate.name}
                    />
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-line bg-bg p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-teal">
                    Preliminary read to the MD
                  </p>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink-2">
                    {r.preliminaryRead && r.preliminaryRead.trim() ? (
                      r.preliminaryRead
                    ) : (
                      <span className="italic text-muted">Not yet submitted.</span>
                    )}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Feedback */}
        <section className="mt-10 rounded-2xl border border-line bg-white p-6 shadow-[var(--shadow-card)]">
          <h2 className="text-xl">How are we doing?</h2>
          <p className="mt-1 text-sm text-muted">
            Three quick questions. Your answers shape the pilot.
          </p>
          <div className="mt-5">
            <FeedbackForm token={token} />
          </div>
        </section>
      </main>
    </div>
  );
}
