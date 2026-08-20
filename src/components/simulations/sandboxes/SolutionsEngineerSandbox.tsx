"use client";

import { useMemo, useState } from "react";
import type { SimulationRuntime } from "@/lib/sim-engine/runtime/simulationRuntime";
import type { SimulationRendererProps } from "@/lib/sim-engine/registry/rendererRegistry";
import { SimulationHeader } from "../SimulationHeader";
import { SimulationSubmitDialog } from "../SimulationSubmitDialog";
import { ResizablePanels } from "../panels/ResizablePanels";
import {
  AiAssistant,
  ApiConsole,
  ArtifactComposer,
  CodeEditorSurface,
  CustomerComposer,
  DevInspector,
  DocumentationViewer,
  InternalChat,
  NotificationToasts,
  ResourceBrowser,
  TaskList,
} from "../shared/WorkbenchParts";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { useSyncExternalStore } from "react";

function useAttempt(runtime: SimulationRuntime) {
  const subscribe = (cb: () => void) => runtime.subscribe(cb);
  return useSyncExternalStore(subscribe, () => runtime.getAttempt(), () => runtime.getAttempt());
}

export function SolutionsEngineerSandbox({ runtime, debug }: SimulationRendererProps) {
  const attempt = useAttempt(runtime);
  const scenario = runtime.scenario;
  const readOnly = attempt.status === "SUBMITTED";
  const [submitOpen, setSubmitOpen] = useState(false);
  const [centerTab, setCenterTab] = useState("api");
  const [rightTab, setRightTab] = useState("people");
  const [activeResource, setActiveResource] = useState<string | undefined>("res_customer_brief");
  const [resourceQuery, setResourceQuery] = useState("");
  const [activePerson, setActivePerson] = useState<string | undefined>("person_devon");
  const [chatDraft, setChatDraft] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [customerDraft, setCustomerDraft] = useState(
    "Hi Priya, I'm investigating the CRM sync validation failures. I'll confirm root cause against the live error payload and share a supported fix path shortly."
  );
  const [recoDraft, setRecoDraft] = useState("");
  const [execDraft, setExecDraft] = useState("");

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
        <div className="mx-auto flex max-w-2xl flex-1 flex-col justify-center gap-4 p-6">
          <h1 className="text-[22px] font-semibold tracking-tight text-[var(--text-primary)]">
            {scenario.metadata.title}
          </h1>
          <p className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
            {scenario.metadata.description}
          </p>
          <pre className="whitespace-pre-wrap rounded-[var(--radius-panel)] border border-[var(--border-default)] bg-[var(--surface-panel)] p-4 text-[12px] text-[var(--text-secondary)]">
            {scenario.metadata.instructions}
          </pre>
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
          left={
            <div className="flex h-full min-h-0 flex-col">
              <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-[12px] font-medium text-[var(--text-tertiary)]">
                Tasks
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <TaskList tasks={taskRows} onOpen={(id) => runtime.openTask(id)} />
              </div>
              <div className="border-t border-[var(--border-subtle)] px-3 py-2 text-[12px] font-medium text-[var(--text-tertiary)]">
                Resources
              </div>
              <div className="min-h-[40%] overflow-hidden">
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
                  }}
                />
              </div>
            </div>
          }
          center={
            <div className="flex h-full min-h-0 flex-col">
              <Tabs
                label="Workbench"
                idBase="se-center"
                items={[
                  { value: "docs", label: "Docs" },
                  { value: "code", label: "Script" },
                  { value: "api", label: "API Console" },
                ]}
                value={centerTab}
                onValueChange={setCenterTab}
              />
              <TabPanel value="docs" active={centerTab === "docs"} idBase="se-center" className="min-h-0 flex-1 overflow-hidden">
                {activeResDef ? (
                  <DocumentationViewer title={activeResDef.title} content={activeResDef.content} />
                ) : (
                  <div className="p-4 text-[13px] text-[var(--text-tertiary)]">Select a resource</div>
                )}
              </TabPanel>
              <TabPanel value="code" active={centerTab === "code"} idBase="se-center" className="min-h-0 flex-1 overflow-hidden">
                <CodeEditorSurface
                  value={attempt.workbench.code}
                  language={attempt.workbench.language}
                  onChange={(code) => runtime.updateWorkbench({ code })}
                  onLanguageChange={(language) => runtime.updateWorkbench({ language })}
                  onRun={() => runtime.runCode()}
                  output={attempt.workbench.lastCodeOutput}
                  readOnly={readOnly}
                />
              </TabPanel>
              <TabPanel value="api" active={centerTab === "api"} idBase="se-center" className="min-h-0 flex-1 overflow-hidden">
                <ApiConsole
                  method={attempt.workbench.apiMethod}
                  path={attempt.workbench.apiPath}
                  headers={attempt.workbench.apiHeaders}
                  body={attempt.workbench.apiBody}
                  onChange={(patch) =>
                    runtime.updateWorkbench({
                      apiMethod: patch.method ?? attempt.workbench.apiMethod,
                      apiPath: patch.path ?? attempt.workbench.apiPath,
                      apiHeaders: patch.headers ?? attempt.workbench.apiHeaders,
                      apiBody: patch.body ?? attempt.workbench.apiBody,
                    })
                  }
                  onExecute={() => runtime.executeApi()}
                  result={attempt.workbench.lastApiResult}
                  readOnly={readOnly}
                />
              </TabPanel>
            </div>
          }
          right={
            <div className="flex h-full min-h-0 flex-col">
              <Tabs
                label="Collaboration"
                idBase="se-right"
                items={[
                  { value: "people", label: "People" },
                  { value: "customer", label: "Customer" },
                  { value: "ai", label: "AI" },
                  { value: "artifacts", label: "Artifacts" },
                ]}
                value={rightTab}
                onValueChange={setRightTab}
              />
              <TabPanel value="people" active={rightTab === "people"} idBase="se-right" className="min-h-0 flex-1 overflow-hidden">
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
              <TabPanel value="customer" active={rightTab === "customer"} idBase="se-right" className="min-h-0 flex-1 overflow-hidden">
                <CustomerComposer
                  value={customerDraft}
                  onChange={setCustomerDraft}
                  onSave={() => runtime.saveArtifact("customer_message", "Customer update", customerDraft)}
                  readOnly={readOnly}
                />
              </TabPanel>
              <TabPanel value="ai" active={rightTab === "ai"} idBase="se-right" className="min-h-0 flex-1 overflow-hidden">
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
              <TabPanel value="artifacts" active={rightTab === "artifacts"} idBase="se-right" className="min-h-0 flex-1 overflow-hidden">
                <ArtifactComposer
                  technicalRecommendation={recoDraft}
                  executiveSummary={execDraft}
                  onChangeReco={setRecoDraft}
                  onChangeExec={setExecDraft}
                  onSaveReco={() =>
                    runtime.saveArtifact("technical_recommendation", "Technical recommendation", recoDraft)
                  }
                  onSaveExec={() => runtime.saveArtifact("executive_summary", "Executive summary", execDraft)}
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
        <div className="border-t border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">
          Attempt submitted.{" "}
          <a className="text-[var(--action-ink)] underline" href={`/lab/sim/${scenario.metadata.id}/analysis?attempt=${attempt.id}`}>
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
