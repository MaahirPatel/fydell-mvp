import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Panel, PanelLabel, PanelSection } from "@/components/ui/Panel";
import { DEMO_HOME, DEMO_TASK_PATH, demoScenarioOrThrow } from "@/lib/employer-demo/fixtures";
import { requireDemoUser } from "@/lib/employer-demo/session";

export const metadata = { title: "Demo simulation template" };

export default async function DemoSimulationPage() {
  await requireDemoUser(`${DEMO_HOME}/simulation`);
  const scenario = demoScenarioOrThrow();
  const publicTests = scenario.tests.filter((t) => t.visibility === "public").length;
  const protectedTests = scenario.tests.length - publicTests;
  const taskHref = `${DEMO_TASK_PATH}?return=${encodeURIComponent(`${DEMO_HOME}/simulation`)}`;

  return (
    <div className="grid gap-8">
      <PageHeader
        title={scenario.title}
        description={scenario.summary}
        meta={
          <>
            <span className="text-app-meta text-[var(--text-secondary)]">{scenario.minutes} minutes</span>
            <span className="text-app-meta text-[var(--text-secondary)]">{scenario.stackLabel}</span>
            <span className="text-app-meta text-[var(--text-secondary)]">
              {publicTests} public tests, {protectedTests} protected
            </span>
          </>
        }
        action={
          <ButtonLink href={taskHref} variant="primary" size="md">
            Run the sample task
          </ButtonLink>
        }
      />

      <Panel>
        <PanelSection
          title="Try it as the applicant"
          description="The sample task opens full screen, exactly as an applicant sees it. Tests run in your browser. When you submit, your files and their test run are added to this workspace as “Your sample submission”, and you return here to review it beside the fictional applicants. Leave at any time with Return to review; your draft stays in this browser."
        />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <PanelSection title="What the applicant reads">
            <div className="grid gap-4">
              {scenario.brief.context.map((p) => (
                <p key={p} className="text-app-body text-[var(--text-secondary)]">
                  {p}
                </p>
              ))}
              <div>
                <PanelLabel>Task</PanelLabel>
                <p className="mt-1.5 text-app-body text-[var(--text-primary)]">{scenario.brief.task}</p>
              </div>
              <div>
                <PanelLabel>Constraints</PanelLabel>
                <ul className="mt-1.5 grid gap-1.5">
                  {scenario.brief.constraints.map((c) => (
                    <li key={c} className="text-app-body text-[var(--text-primary)]">
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <PanelLabel>AI assistance</PanelLabel>
                <p className="mt-1.5 text-app-body text-[var(--text-primary)]">{scenario.brief.aiPolicy}</p>
              </div>
            </div>
          </PanelSection>
        </Panel>

        <Panel>
          <PanelSection title="Requirements and the tests that check them" description="Protected test code stays private to applicants; reviewers see which requirement each one checks.">
            <ul className="grid gap-4">
              {scenario.criteria.map((c) => {
                const tests = scenario.tests.filter((t) => t.criterionIds.includes(c.id));
                return (
                  <li key={c.id}>
                    <p className="text-app-body font-medium text-[var(--text-primary)]">{c.text}</p>
                    <p className="mt-0.5 text-app-meta text-[var(--text-secondary)]">
                      {tests.length === 0
                        ? "No automated test. The reviewer reads the code for this one."
                        : `${tests.length} ${tests.length === 1 ? "test" : "tests"}: ${tests.map((t) => t.name).join(", ")}`}
                    </p>
                  </li>
                );
              })}
            </ul>
          </PanelSection>
        </Panel>
      </div>
    </div>
  );
}
