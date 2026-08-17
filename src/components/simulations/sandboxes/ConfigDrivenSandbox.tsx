"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { SimulationRendererProps } from "@/lib/sim-engine/registry/rendererRegistry";
import {
  centerTabsForScenario,
  defaultCenterTab,
  defaultRightTab,
  rightTabsForScenario,
} from "@/lib/sim-engine/registry/workbenchLayout";
import { SimulationHeader } from "../SimulationHeader";
import { SimulationSubmitDialog } from "../SimulationSubmitDialog";
import { ResizablePanels } from "../panels/ResizablePanels";
import {
  AiAssistant,
  AnalysisMemoComposer,
  ApiConsole,
  ArtifactComposer,
  CodeEditorSurface,
  CutoverChecklist,
  CutoverPlanComposer,
  DevInspector,
  DocumentationViewer,
  EscalationComposer,
  FieldMappingPanel,
  InternalChat,
  NotificationToasts,
  ResourceBrowser,
  RulesWorkbenchPanel,
  SqlWorkbench,
  TaskList,
  TicketQueue,
} from "../shared/WorkbenchParts";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";

function useAttempt(runtime: SimulationRendererProps["runtime"]) {
  const subscribe = (cb: () => void) => runtime.subscribe(cb);
  return useSyncExternalStore(subscribe, () => runtime.getAttempt(), () => runtime.getAttempt());
}

/**
 * Config-driven polymorphic workbench.
 * Tabs and panels are composed from scenario.capabilities + workbench configs.
 * BSA Phase Four proof: no RoleKey layout switch required.
 */
export function ConfigDrivenSandbox({ runtime, debug }: SimulationRendererProps) {
  const attempt = useAttempt(runtime);
  const scenario = runtime.scenario;
  const readOnly = attempt.status === "SUBMITTED";
  const centerTabs = useMemo(() => centerTabsForScenario(scenario), [scenario]);
  const rightTabs = useMemo(() => rightTabsForScenario(scenario), [scenario]);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [centerTab, setCenterTab] = useState(() => defaultCenterTab(scenario));
  const [rightTab, setRightTab] = useState(() => defaultRightTab(scenario));
  const [activeResource, setActiveResource] = useState<string | undefined>(
    scenario.resources.find((r) => r.initiallyVisible)?.id
  );
  const [resourceQuery, setResourceQuery] = useState("");
  const [activePerson, setActivePerson] = useState<string | undefined>(scenario.people[0]?.id);
  const [chatDraft, setChatDraft] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [summaryDraft, setSummaryDraft] = useState(
    "System behavior:\n\nPolicy intent:\n\nImpact:\n\nRecommendation:\n"
  );
  const [execDraft, setExecDraft] = useState("");
  const [planDraft, setPlanDraft] = useState("");
  const [customerDraft, setCustomerDraft] = useState("");
  const [escalationDraft, setEscalationDraft] = useState("");
  const [recoDraft, setRecoDraft] = useState("");
  const [memoDraft, setMemoDraft] = useState("");

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
              <div className="border-b border-[var(--border-subtle)] px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
                Tasks
              </div>
              <div className="min-h-0 flex-1 overflow-auto">
                <TaskList tasks={taskRows} onOpen={(id) => runtime.openTask(id)} />
              </div>
              <div className="border-t border-[var(--border-subtle)] px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[var(--text-tertiary)]">
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
                idBase="cfg-center"
                items={centerTabs}
                value={centerTab}
                onValueChange={setCenterTab}
              />
              {centerTabs.map((tab) => (
                <TabPanel
                  key={tab.value}
                  value={tab.value}
                  active={centerTab === tab.value}
                  idBase="cfg-center"
                  className="min-h-0 flex-1 overflow-hidden"
                >
                  {tab.value === "docs" ? (
                    activeResDef ? (
                      <DocumentationViewer title={activeResDef.title} content={activeResDef.content} />
                    ) : (
                      <div className="p-4 text-[13px] text-[var(--text-tertiary)]">Select a resource</div>
                    )
                  ) : null}
                  {tab.value === "rules" && scenario.rulesWorkbench ? (
                    <RulesWorkbenchPanel
                      title={scenario.rulesWorkbench.title}
                      rules={scenario.rulesWorkbench.rules}
                      selectedRuleId={attempt.workbench.selectedRuleId}
                      selectedFixId={attempt.workbench.selectedFixId}
                      selectedImpactCount={attempt.workbench.selectedImpactCount}
                      impactPrompt={scenario.rulesWorkbench.impactPrompt}
                      impactOptions={scenario.rulesWorkbench.impactOptions}
                      fixOptions={scenario.rulesWorkbench.fixOptions}
                      onSelectRule={(id) => runtime.selectRule(id)}
                      onSelectFix={(id) => runtime.selectFix(id)}
                      onSelectImpact={(n) => runtime.selectImpactCount(n)}
                      readOnly={readOnly}
                    />
                  ) : null}
                  {tab.value === "sql" ? (
                    <SqlWorkbench
                      dialectLabel={scenario.sqlRuntime?.dialectLabel}
                      knownTables={scenario.sqlRuntime?.knownTables}
                      value={attempt.workbench.sqlQuery}
                      onChange={(sqlQuery) => runtime.updateWorkbench({ sqlQuery })}
                      onExecute={() => runtime.executeSql()}
                      result={attempt.workbench.lastSqlResult}
                      readOnly={readOnly}
                    />
                  ) : null}
                  {tab.value === "api" ? (
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
                  ) : null}
                  {tab.value === "code" ? (
                    <CodeEditorSurface
                      value={attempt.workbench.code}
                      language={attempt.workbench.language}
                      onChange={(code) => runtime.updateWorkbench({ code })}
                      onLanguageChange={(language) => runtime.updateWorkbench({ language })}
                      onRun={() => runtime.runCode()}
                      output={attempt.workbench.lastCodeOutput}
                      readOnly={readOnly}
                    />
                  ) : null}
                  {tab.value === "mapping" && scenario.implementationWorkbench ? (
                    <FieldMappingPanel
                      mappings={scenario.implementationWorkbench.fieldMappings}
                      values={attempt.workbench.fieldMappings}
                      onChange={(id, target) => runtime.setFieldMapping(id, target)}
                      readOnly={readOnly}
                    />
                  ) : null}
                  {tab.value === "checklist" && scenario.implementationWorkbench ? (
                    <CutoverChecklist
                      title={scenario.implementationWorkbench.checklistTitle}
                      items={scenario.implementationWorkbench.checklist}
                      completed={attempt.workbench.checklist}
                      onToggle={(id) => runtime.toggleChecklistItem(id)}
                      readOnly={readOnly}
                    />
                  ) : null}
                  {tab.value === "tickets" && scenario.supportWorkbench ? (
                    <TicketQueue
                      title={scenario.supportWorkbench.ticketsTitle}
                      tickets={scenario.supportWorkbench.tickets}
                      selectedId={attempt.workbench.selectedTicketId}
                      triage={attempt.workbench.ticketTriage}
                      onSelect={(id) => runtime.selectTicket(id)}
                      onTriage={(id, classification) => runtime.triageTicket(id, classification)}
                      readOnly={readOnly}
                    />
                  ) : null}
                </TabPanel>
              ))}
            </div>
          }
          right={
            <div className="flex h-full min-h-0 flex-col">
              <Tabs
                label="Collaboration"
                idBase="cfg-right"
                items={rightTabs}
                value={rightTab}
                onValueChange={setRightTab}
              />
              {rightTabs.map((tab) => (
                <TabPanel
                  key={tab.value}
                  value={tab.value}
                  active={rightTab === tab.value}
                  idBase="cfg-right"
                  className="min-h-0 flex-1 overflow-hidden"
                >
                  {tab.value === "people" ? (
                    <InternalChat
                      people={people}
                      activePersonId={activePerson}
                      messages={messages.map((m) => ({
                        id: m.id,
                        direction: m.direction,
                        body: m.body,
                      }))}
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
                  ) : null}
                  {tab.value === "ai" ? (
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
                  ) : null}
                  {tab.value === "summary" ? (
                    <AnalysisMemoComposer
                      memo={summaryDraft}
                      execSummary={execDraft}
                      onChangeMemo={setSummaryDraft}
                      onChangeExec={setExecDraft}
                      onSaveMemo={() =>
                        runtime.saveArtifact("analysis_memo", "Stakeholder summary", summaryDraft)
                      }
                      onSaveExec={() =>
                        runtime.saveArtifact("executive_summary", "Executive summary", execDraft)
                      }
                      readOnly={readOnly}
                    />
                  ) : null}
                  {tab.value === "memo" ? (
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
                  ) : null}
                  {tab.value === "plan" ? (
                    <CutoverPlanComposer
                      plan={planDraft}
                      customerMessage={customerDraft}
                      onChangePlan={setPlanDraft}
                      onChangeCustomer={setCustomerDraft}
                      onSavePlan={() => runtime.saveArtifact("cutover_plan", "Cutover plan", planDraft)}
                      onSaveCustomer={() =>
                        runtime.saveArtifact("customer_message", "Customer message", customerDraft)
                      }
                      readOnly={readOnly}
                    />
                  ) : null}
                  {tab.value === "write" ? (
                    <EscalationComposer
                      escalation={escalationDraft}
                      customerMessage={customerDraft}
                      onChangeEscalation={setEscalationDraft}
                      onChangeCustomer={setCustomerDraft}
                      onSaveEscalation={() =>
                        runtime.saveArtifact("escalation_note", "Escalation", escalationDraft)
                      }
                      onSaveCustomer={() =>
                        runtime.saveArtifact("customer_message", "Customer update", customerDraft)
                      }
                      readOnly={readOnly}
                    />
                  ) : null}
                  {tab.value === "artifacts" ? (
                    <ArtifactComposer
                      technicalRecommendation={recoDraft}
                      executiveSummary={execDraft}
                      onChangeReco={setRecoDraft}
                      onChangeExec={setExecDraft}
                      onSaveReco={() =>
                        runtime.saveArtifact("technical_recommendation", "Technical recommendation", recoDraft)
                      }
                      onSaveExec={() =>
                        runtime.saveArtifact("executive_summary", "Executive summary", execDraft)
                      }
                      readOnly={readOnly}
                    />
                  ) : null}
                </TabPanel>
              ))}
            </div>
          }
        />
      </div>
      <NotificationToasts items={attempt.world.notifications} />
      {debug ? <DevInspector attempt={attempt} /> : null}
      {attempt.status === "SUBMITTED" ? (
        <div className="border-t border-[var(--border-default)] bg-[var(--surface-panel)] px-4 py-3 text-[13px] text-[var(--text-secondary)]">
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
