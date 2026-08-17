"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { SimulationRuntime } from "@/lib/sim-engine/runtime/simulationRuntime";
import type { SimulationRendererProps } from "@/lib/sim-engine/registry/rendererRegistry";
import { SimulationHeader } from "../SimulationHeader";
import { SimulationSubmitDialog } from "../SimulationSubmitDialog";
import { ResizablePanels } from "../panels/ResizablePanels";
import {
  AiAssistant,
  AnalysisMemoComposer,
  DatasetTable,
  DevInspector,
  DocumentationViewer,
  EvidenceInspector,
  InternalChat,
  NotificationToasts,
  ResourceBrowser,
  SqlWorkbench,
  TaskList,
} from "../shared/WorkbenchParts";
import {
  claimsToJson,
  EVIDENCE_CLAIMS_KEY,
  readEvidenceClaims,
  type EvidenceClaim,
} from "@/lib/sim-engine/evidence/claims";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";

function useAttempt(runtime: SimulationRuntime) {
  const subscribe = (cb: () => void) => runtime.subscribe(cb);
  return useSyncExternalStore(subscribe, () => runtime.getAttempt(), () => runtime.getAttempt());
}

export function DataAnalystSandbox({ runtime, debug }: SimulationRendererProps) {
  const attempt = useAttempt(runtime);
  const scenario = runtime.scenario;
  const readOnly = attempt.status === "SUBMITTED";
  const [submitOpen, setSubmitOpen] = useState(false);

  const tables = scenario.sqlRuntime?.tables ?? [];
  const firstResourceId = scenario.resources[0]?.id;
  const firstPersonId = scenario.people[0]?.id;

  const [centerTab, setCenterTab] = useState(tables.length ? "data" : "sql");
  const [rightTab, setRightTab] = useState("evidence");
  const [activeResource, setActiveResource] = useState<string | undefined>(firstResourceId);
  const [resourceQuery, setResourceQuery] = useState("");
  const [activePerson, setActivePerson] = useState<string | undefined>(firstPersonId);
  const [chatDraft, setChatDraft] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [memoDraft, setMemoDraft] = useState(
    "Answer:\n\nEvidence:\n\nWhat changed:\n\nCaveats / next check:\n"
  );
  const [execDraft, setExecDraft] = useState("");

  const [activeTable, setActiveTable] = useState<string | undefined>(tables[0]?.name);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | undefined>(undefined);
  const [pendingCitation, setPendingCitation] = useState<string | undefined>(undefined);

  // The evidence pack is candidate work, so it lives in the attempt rather than
  // in component state and is captured by the durable snapshot.
  const claims = useMemo(() => readEvidenceClaims(attempt.extras), [attempt.extras]);
  const writeClaims = (next: EvidenceClaim[]) =>
    runtime.updateExtras({ [EVIDENCE_CLAIMS_KEY]: claimsToJson(next) });

  const activeTableDef = tables.find((t) => t.name === activeTable) ?? tables[0];

  const citationSources = useMemo(() => {
    const openedResources = scenario.resources
      .filter((r) => attempt.resources[r.id]?.opened)
      .map((r) => r.title);
    const tableNames = tables.map((t) => t.name);
    return Array.from(new Set([...tableNames, ...openedResources]));
  }, [scenario.resources, attempt.resources, tables]);

  const resourceItems = useMemo(
    () =>
      scenario.resources.map((r) => ({
        id: r.id,
        title: r.title,
        summary: r.summary,
        visible: attempt.resources[r.id]?.visible ?? r.initiallyVisible,
        opened: attempt.resources[r.id]?.opened ?? false,
      })),
    [scenario.resources, attempt.resources]
  );

  const activeResDef = scenario.resources.find((r) => r.id === activeResource);

  const people = scenario.people.map((p) => ({
    id: p.id,
    name: p.name,
    title: p.title,
    channel: p.channel,
  }));

  const conversation = Object.values(attempt.conversations).find((c) => c.personId === activePerson);
  const messages = conversation
    ? conversation.messageIds.map((id) => attempt.messages[id]).filter(Boolean)
    : [];

  const taskRows = scenario.tasks
    .filter((t) => attempt.tasks[t.id])
    .map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: attempt.tasks[t.id]?.status ?? t.initialStatus,
      priority: attempt.tasks[t.id]?.priority ?? t.priority,
    }));

  if (attempt.status === "NOT_STARTED") {
    return (
      <div className="flex h-full flex-col bg-[var(--surface-canvas)]">
        <SimulationHeader
          title={scenario.metadata.title}
          roleKey={scenario.metadata.roleKey}
          remainingSeconds={attempt.remainingTimeSeconds}
          status={attempt.status}
          saveLabel="Not started"
          onSubmit={() => undefined}
          submitDisabled
        />
        <div className="mx-auto flex max-w-[42rem] flex-1 flex-col justify-center gap-5 px-6 py-10">
          <h1 className="text-app-page font-medium text-[var(--text-primary)]">
            {scenario.metadata.title}
          </h1>
          <p className="text-app-body leading-relaxed text-[var(--text-secondary)]">
            {scenario.metadata.description}
          </p>
          <div className="border-y border-[var(--border-subtle)] py-4">
            <pre className="whitespace-pre-wrap font-sans text-app-meta leading-relaxed text-[var(--text-secondary)]">
              {scenario.metadata.instructions}
            </pre>
          </div>
          <div>
            <Button
              variant="primary"
              onClick={() => {
                runtime.start();
                if (activeResource) runtime.openResource(activeResource);
              }}
            >
              Start simulation
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[var(--surface-canvas)]">
      <SimulationHeader
        title={scenario.metadata.title}
        roleKey={scenario.metadata.roleKey}
        remainingSeconds={attempt.remainingTimeSeconds}
        status={attempt.status}
        saveLabel={readOnly ? "Submitted" : "Autosaved locally (dev)"}
        onSubmit={() => setSubmitOpen(true)}
      />
      <div className="min-h-0 flex-1">
        <ResizablePanels
          leftDefault={208}
          rightDefault={280}
          left={
            <div className="flex h-full min-h-0 flex-col bg-[var(--surface-panel)]">
              <div className="border-b border-[var(--border-subtle)] px-3 py-2.5 text-app-meta font-medium text-[var(--text-tertiary)]">
                Mission
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <TaskList tasks={taskRows} onOpen={(id) => runtime.openTask(id)} />
              </div>
              <div className="border-t border-[var(--border-subtle)] px-3 py-2.5 text-app-meta font-medium text-[var(--text-tertiary)]">
                Sources
              </div>
              <div className="min-h-[42%] overflow-hidden">
                <ResourceBrowser
                  items={resourceItems}
                  activeId={activeResource}
                  query={resourceQuery}
                  onSearch={(q) => {
                    setResourceQuery(q);
                    runtime.searchResources(q);
                  }}
                  onOpen={(id) => {
                    setActiveResource(id);
                    runtime.openResource(id);
                    setCenterTab("docs");
                  }}
                />
              </div>
            </div>
          }
          center={
            <div className="flex h-full min-h-0 flex-col">
              <Tabs
                label="Workbench"
                idBase="da-center"
                items={[
                  ...(tables.length ? [{ value: "data", label: "Data" }] : []),
                  { value: "sql", label: "Query" },
                  { value: "docs", label: "Sources" },
                ]}
                value={centerTab}
                onValueChange={setCenterTab}
              />
              {tables.length ? (
                <TabPanel value="data" active={centerTab === "data"} idBase="da-center" className="min-h-0 flex-1 overflow-hidden">
                  <div className="flex h-full min-h-0 flex-col">
                    {tables.length > 1 ? (
                      <div className="flex gap-1 border-b border-[var(--border-subtle)] px-2 py-1.5">
                        {tables.map((t) => (
                          <button
                            key={t.name}
                            type="button"
                            onClick={() => {
                              setActiveTable(t.name);
                              setSelectedRowIndex(undefined);
                            }}
                            className={
                              (activeTableDef?.name === t.name
                                ? "bg-[var(--surface-selected)] text-[var(--text-primary)] "
                                : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] ") +
                              "rounded-[var(--radius-control)] px-2 py-0.5 font-mono text-app-meta"
                            }
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    {activeTableDef ? (
                      <div className="min-h-0 flex-1">
                        <DatasetTable
                          columns={activeTableDef.columns}
                          rows={activeTableDef.rows}
                          caption={`${activeTableDef.name} · ${activeTableDef.rows.length} rows`}
                          selectedRowIndex={selectedRowIndex}
                          onSelectRow={(index) => {
                            setSelectedRowIndex(index);
                            setPendingCitation(`${activeTableDef.name} · row ${index + 1}`);
                            setRightTab("evidence");
                          }}
                        />
                      </div>
                    ) : null}
                  </div>
                </TabPanel>
              ) : null}
              <TabPanel value="sql" active={centerTab === "sql"} idBase="da-center" className="min-h-0 flex-1 overflow-hidden">
                <SqlWorkbench
                  dialectLabel={scenario.sqlRuntime?.dialectLabel}
                  knownTables={scenario.sqlRuntime?.knownTables}
                  value={attempt.workbench.sqlQuery}
                  onChange={(sqlQuery) => runtime.updateWorkbench({ sqlQuery })}
                  onExecute={() => runtime.executeSql()}
                  result={attempt.workbench.lastSqlResult}
                  readOnly={readOnly}
                />
              </TabPanel>
              <TabPanel value="docs" active={centerTab === "docs"} idBase="da-center" className="min-h-0 flex-1 overflow-hidden">
                {activeResDef ? (
                  <DocumentationViewer title={activeResDef.title} content={activeResDef.content} />
                ) : (
                  <div className="p-4 text-app-body text-[var(--text-tertiary)]">Select a source from the mission rail</div>
                )}
              </TabPanel>
            </div>
          }
          right={
            <div className="flex h-full min-h-0 flex-col bg-[var(--surface-panel)]">
              <Tabs
                label="Evidence"
                idBase="da-right"
                items={[
                  { value: "evidence", label: "Evidence" },
                  { value: "memo", label: "Memo" },
                  { value: "people", label: "People" },
                  { value: "ai", label: "Assistant" },
                ]}
                value={rightTab}
                onValueChange={setRightTab}
              />
              <TabPanel value="evidence" active={rightTab === "evidence"} idBase="da-right" className="min-h-0 flex-1 overflow-hidden">
                <EvidenceInspector
                  claims={claims}
                  availableSources={citationSources}
                  pendingCitation={pendingCitation}
                  onAddClaim={(claim) =>
                    writeClaims([...claims, { ...claim, id: `claim-${Date.now()}` }])
                  }
                  onRemoveClaim={(id) => writeClaims(claims.filter((c) => c.id !== id))}
                  onClearPending={() => {
                    setPendingCitation(undefined);
                    setSelectedRowIndex(undefined);
                  }}
                  readOnly={readOnly}
                />
              </TabPanel>
              <TabPanel value="memo" active={rightTab === "memo"} idBase="da-right" className="min-h-0 flex-1 overflow-hidden">
                <AnalysisMemoComposer
                  memo={memoDraft}
                  execSummary={execDraft}
                  onChangeMemo={setMemoDraft}
                  onChangeExec={setExecDraft}
                  onSaveMemo={() => runtime.saveArtifact("analysis_memo", "Analysis memo", memoDraft)}
                  onSaveExec={() =>
                    runtime.saveArtifact("executive_summary", "Executive summary", execDraft)
                  }
                  readOnly={readOnly}
                />
              </TabPanel>
              <TabPanel value="people" active={rightTab === "people"} idBase="da-right" className="min-h-0 flex-1 overflow-hidden">
                <InternalChat
                  people={people}
                  activePersonId={activePerson}
                  messages={messages.map((m) => ({ id: m.id, direction: m.direction, body: m.body }))}
                  draft={chatDraft}
                  onSelectPerson={setActivePerson}
                  onDraftChange={setChatDraft}
                  onSend={() => {
                    if (!activePerson || !chatDraft.trim()) return;
                    runtime.contactPerson(activePerson, chatDraft.trim());
                    setChatDraft("");
                  }}
                  readOnly={readOnly}
                />
              </TabPanel>
              <TabPanel value="ai" active={rightTab === "ai"} idBase="da-right" className="min-h-0 flex-1 overflow-hidden">
                <AiAssistant
                  history={attempt.aiInteractions}
                  draft={aiDraft}
                  onDraftChange={setAiDraft}
                  onAsk={() => {
                    runtime.askAiAssistant(aiDraft.trim());
                    setAiDraft("");
                  }}
                  readOnly={readOnly}
                />
              </TabPanel>
            </div>
          }
        />
      </div>
      <NotificationToasts items={attempt.world.notifications} />
      {debug ? <DevInspector attempt={attempt} /> : null}
      {attempt.status === "SUBMITTED" ? (
        <div className="border-t border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-3 text-app-body text-[var(--text-secondary)]">
          Attempt submitted.{" "}
          <a
            className="text-[var(--action-ink)] underline"
            href={`/lab/sim/${scenario.metadata.id}/analysis?attempt=${attempt.id}`}
          >
            Open employer analysis
          </a>
        </div>
      ) : null}
      <SimulationSubmitDialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onConfirm={() => {
          runtime.submit();
          setSubmitOpen(false);
          if (typeof window !== "undefined") {
            void import("@/lib/sim-engine/adapters/persistence").then(({ LocalStoragePersistenceAdapter }) => {
              const adapter = new LocalStoragePersistenceAdapter();
              void adapter.save(runtime.getAttempt());
            });
          }
        }}
      />
    </div>
  );
}
