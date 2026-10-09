import { redirect } from "next/navigation";
import { requireUser } from "@/lib/simulations/auth";
import { CandidateShell } from "@/components/candidate/CandidateShell";
import { CandidatePageHead } from "@/components/candidate/CandidatePageHead";
import { PracticeActions } from "@/components/candidate/BuilderPractice";
import { PRACTICE_HOME } from "@/components/candidate/practice-paths";
import { demoScenario } from "@/lib/sandbox-demo/catalog";
import { DEMO_SCENARIO_KEY } from "@/lib/employer-demo/fixtures";

export const metadata = { title: "Practice simulation" };
export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const user = await requireUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(PRACTICE_HOME)}`);
  const scenario = demoScenario(DEMO_SCENARIO_KEY);
  if (!scenario) redirect("/app/candidate");

  return (
    <CandidateShell current="practice">
      <CandidatePageHead
        title="Practice simulation"
        lead="Try a Fydell simulation before an employer invites you. You get a brief, a real codebase, simulated teammates to ask, and a report built from the tests that ran on your files."
        meta={[
          { label: "Task", value: scenario.title },
          { label: "Stack", value: scenario.stackLabel },
          { label: "Suggested time", value: `${scenario.minutes} min` },
        ]}
      />

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-labelledby="practice-brief" className="rounded-[12px] border border-[var(--border-default)] bg-[var(--surface-raised)] p-5 sm:p-6">
          <h2 id="practice-brief" className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
            The brief
          </h2>
          <p className="mt-2 text-app-body leading-[1.6] text-[var(--text-primary)]">{scenario.summary}</p>
          {scenario.criteria.length ? (
            <>
              <h3 className="mt-5 text-app-meta font-medium text-[var(--text-primary)]">What the report checks</h3>
              <ul className="mt-2 space-y-1.5">
                {scenario.criteria.map((c) => (
                  <li key={c.id} className="flex gap-2 text-app-body leading-[1.55] text-[var(--text-secondary)]">
                    <span aria-hidden className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--brand-teal)]" />
                    {c.text}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
          <div className="mt-6">
            <PracticeActions userId={user.id} />
          </div>
        </section>

        <aside className="space-y-3 text-app-body leading-[1.55] text-[var(--text-secondary)]">
          <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">How practice works</h2>
          <p>Your work is saved in this browser as you go, so you can leave and come back.</p>
          <p>Public tests run whenever you choose. Protected tests run when you submit, the same as in a real simulation.</p>
          <p>Practice runs are never sent to an employer and never appear on your profile.</p>
        </aside>
      </div>
    </CandidateShell>
  );
}
