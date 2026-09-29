import { Panel, PanelSection } from "@/components/ui/Panel";
import ReportEditor from "./ReportEditor";
import ReviewerEvidence from "./ReviewerEvidence";
import type { ScenarioDefinition } from "@/lib/eng/scenarios/types";
import type { MessageRow, ProbeResult, ReportRow, SubmissionRow, UploadRow } from "@/lib/eng/types";

export default function ReviewWorkspace({
  apiBase,
  scenario,
  suiteVersion,
  results,
  submission,
  files,
  messages,
  draft,
  released,
  showEvidence = true,
}: {
  apiBase: string;
  scenario: ScenarioDefinition;
  suiteVersion: string;
  results: ProbeResult[];
  submission: SubmissionRow;
  files: UploadRow["file_list"];
  messages: MessageRow[];
  draft: ReportRow | null;
  released: ReportRow | null;
  showEvidence?: boolean;
}) {
  const teammates = Object.fromEntries(scenario.teammates.map((t) => [t.id, t.name]));
  const base = draft ?? released;
  return (
    <div className="grid gap-6">
      {showEvidence ? (
        <Panel>
          <PanelSection title="Evidence" description={`Checks ${suiteVersion}. Archive SHA-256 ${submission.archive_sha256.slice(0, 16)}…`}>
            <ReviewerEvidence
              apiBase={apiBase}
              results={results}
              files={files}
              messages={messages}
              handoff={{ ...submission.handoff }}
              aiDisclosure={submission.ai_disclosure}
              teammates={teammates}
            />
          </PanelSection>
        </Panel>
      ) : null}
      <Panel>
        <PanelSection
          title={released ? (draft ? `Correction draft (will become v${draft.version})` : `Released v${released.version}: start a correction`) : draft ? "Report draft" : "Write the report"}
          description="Every finding must cite the file lines, test, message or handoff it rests on. Release is refused until every citation checks out against this submission."
        >
          <ReportEditor
            apiBase={apiBase}
            rubric={scenario.rubric.map((r) => ({ key: r.key, label: r.label, question: r.question, anchors: r.anchors }))}
            evidence={{
              files,
              probes: results.map((p) => ({ id: p.id, title: p.title, outcome: p.outcome })),
              messages: messages.map((m) => ({
                id: m.id,
                label: `${m.sender === "candidate" ? "Candidate" : teammates[m.teammate_id ?? ""] ?? "Teammate"}: ${m.body.replace(/\s+/g, " ").slice(0, 70)}`,
              })),
              handoffFields: [
                ...Object.entries(submission.handoff)
                  .filter(([, v]) => typeof v === "string" && v.trim())
                  .map(([k]) => k),
                ...(submission.ai_disclosure.trim() ? ["ai_use"] : []),
              ],
            }}
            initialBrief={base?.brief ?? null}
            initialFindings={base?.findings ?? []}
            needsChangeReason={Boolean(released)}
            initialChangeReason={draft?.change_reason ?? ""}
            hasDraft={Boolean(draft)}
          />
        </PanelSection>
      </Panel>
    </div>
  );
}
