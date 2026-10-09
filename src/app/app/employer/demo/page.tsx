import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelSection } from "@/components/ui/Panel";
import DemoResetPanel from "@/components/employer/demo/DemoResetPanel";
import { DEMO_APPLICANTS, DEMO_HOME, DEMO_ROLE, SAMPLE_APPLICANT_KEY, demoScenarioOrThrow } from "@/lib/employer-demo/fixtures";
import { loadDemoWorkspace } from "@/lib/employer-demo/store";
import { requireDemoUser } from "@/lib/employer-demo/session";

export const metadata = { title: "Demo workspace" };
export const dynamic = "force-dynamic";

const STAGE_LABEL = { new: "New", reviewing: "Question sent", decided: "Decided" } as const;
const DECISION_LABEL = { advance: "Advance", hold: "Hold", decline: "Decline" } as const;

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default async function DemoOverviewPage() {
  const user = await requireDemoUser(DEMO_HOME);
  const snapshot = await loadDemoWorkspace(user.id);
  const scenario = demoScenarioOrThrow();
  const latest = new Map<string, (typeof snapshot.decisions)[number]>();
  for (const d of snapshot.decisions) if (!latest.has(d.applicantKey)) latest.set(d.applicantKey, d);
  const headline = new Map(DEMO_APPLICANTS.map((a) => [a.key, a.headline]));
  const hasSample = snapshot.applicants.some((a) => a.key === SAMPLE_APPLICANT_KEY);

  return (
    <div className="grid gap-8">
      <PageHeader
        title={DEMO_ROLE.title}
        description={`${DEMO_ROLE.company}. ${DEMO_ROLE.summary}`}
        meta={
          <>
            <span className="text-app-meta text-[var(--text-secondary)]">{DEMO_ROLE.level}</span>
            <span className="text-app-meta text-[var(--text-secondary)]">{DEMO_ROLE.location}</span>
            <span className="text-app-meta text-[var(--text-secondary)]">{DEMO_ROLE.companyNote}</span>
          </>
        }
        action={
          <ButtonLink href={`${DEMO_HOME}/applicants/${snapshot.applicants[0]?.key ?? DEMO_APPLICANTS[0].key}`} variant="primary" size="md">
            Review the first applicant
          </ButtonLink>
        }
      />

      <Panel>
        <PanelSection title="Applicants" description="Each applicant completed the simulation below. Open one to see requirement evidence, their tests, the follow-up thread and the decision brief.">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-left text-app-body">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-app-meta text-[var(--text-tertiary)]">
                  <th scope="col" className="py-2 pr-4 font-medium">Applicant</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Submitted</th>
                  <th scope="col" className="py-2 pr-4 font-medium">Stage</th>
                  <th scope="col" className="py-2 font-medium">Latest decision</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.applicants.map((a) => {
                  const d = latest.get(a.key);
                  return (
                    <tr key={a.key} className="border-b border-[var(--border-subtle)] last:border-0">
                      <td className="py-3 pr-4">
                        <Link href={`${DEMO_HOME}/applicants/${a.key}`} className="font-medium text-[var(--text-primary)] underline-offset-2 hover:underline">
                          {a.name}
                        </Link>
                        <span className="block text-app-meta text-[var(--text-secondary)]">
                          {a.source === "sample" ? "Your own run of the sample task" : headline.get(a.key)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-[var(--text-secondary)]">{shortDate(a.submittedAt)}</td>
                      <td className="py-3 pr-4 text-[var(--text-secondary)]">{STAGE_LABEL[a.stage]}</td>
                      <td className="py-3 text-[var(--text-secondary)]">{d ? `${DECISION_LABEL[d.decision]}, ${shortDate(d.decidedAt)}` : "None yet"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </PanelSection>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelSection title="Requirements for this role" description="Every applicant's evidence is mapped to these, by name.">
            <ul className="grid gap-2.5">
              {scenario.criteria.map((c) => (
                <li key={c.id} className="text-app-body text-[var(--text-primary)]">
                  {c.text}
                </li>
              ))}
            </ul>
          </PanelSection>
        </Panel>

        <Panel>
          <PanelSection
            title="Simulation template"
            description={`${scenario.title}. ${scenario.minutes} minutes, ${scenario.stackLabel}. Applicants fix a real bug against public tests; protected tests run when they submit.`}
          >
            <div className="grid gap-3">
              <p className="text-app-body text-[var(--text-secondary)]">
                {hasSample
                  ? "Your own sample submission is in the applicant list. Run the task again to replace it."
                  : "Try the task the way an applicant does. Your submission is added to the applicant list with a report built from your code and test run."}
              </p>
              <Link href={`${DEMO_HOME}/simulation`} className="inline-flex items-center gap-1.5 text-app-body font-medium text-[var(--text-primary)] underline-offset-2 hover:underline">
                Open the simulation template
                <ArrowRight aria-hidden className="h-4 w-4" strokeWidth={1.7} />
              </Link>
            </div>
          </PanelSection>
        </Panel>
      </div>

      <DemoResetPanel storageScope={user.id} resetAt={snapshot.resetAt} />
    </div>
  );
}
