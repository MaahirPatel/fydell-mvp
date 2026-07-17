import { requirePlatformRole } from "@/lib/ops/require-platform-role";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ops — Human validation status · Fydell" };

export default async function OpsValidationPage() {
  const admin = await requirePlatformRole(["super_admin", "admin", "operator", "reviewer"]);

  return (
    <main className="min-h-[100dvh] bg-[#050609] px-6 py-10 text-[#F4F5F7]">
      <div className="mx-auto max-w-[720px]">
        <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-white/45">
          Ops · signed in as {admin.email}
        </p>
        <h1 className="mt-1 text-[28px]" style={{ fontWeight: 560, letterSpacing: "-0.03em" }}>
          Human validation status
        </h1>
        <p className="mt-2 max-w-[56ch] text-[14px] leading-relaxed text-white/55">
          Independent, human-run acceptance testing of the Relay simulation and evidence report —
          separate from the automated golden-path and evidence-math test suites, which already
          pass in CI.
        </p>

        <div className="mt-8 rounded-[14px] border border-dashed border-white/15 bg-[#0A0C11]/80 px-6 py-8">
          <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[#e8c07a]">
            Not yet collected
          </p>
          <p className="mt-2 max-w-[52ch] text-[13.5px] leading-relaxed text-white/60">
            No candidate or hiring-lead usability sessions have been run yet. This page will list
            each session (participant role, date, task, findings) once they happen — nothing below
            is fabricated or estimated in advance of real interviews.
          </p>

          <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.06em] text-white/40">
                Candidate sessions (target ≥3)
              </dt>
              <dd className="mt-1 text-[14px] text-white/80">0 completed</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.06em] text-white/40">
                Hiring-lead sessions (target ≥3)
              </dt>
              <dd className="mt-1 text-[14px] text-white/80">0 completed</dd>
            </div>
          </dl>
        </div>

        <p className="mt-6 text-[12px] text-white/35">
          Tracked in <code>docs/fde-rebuild-checkpoints.md</code> (Checkpoint H) — this page
          mirrors that plan, it does not replace it.
        </p>
      </div>
    </main>
  );
}
