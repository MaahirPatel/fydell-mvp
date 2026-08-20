"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { SimulationRuntime } from "@/lib/sim-engine/runtime/simulationRuntime";
import type { SimulationRendererProps } from "@/lib/sim-engine/registry/rendererRegistry";
import { SimulationHeader } from "../SimulationHeader";
import { SimulationSubmitDialog } from "../SimulationSubmitDialog";
import { ResizablePanels } from "../panels/ResizablePanels";
import {
  AiAssistant,
  DevInspector,
  DocumentationViewer,
  EscalationComposer,
  InternalChat,
  NotificationToasts,
  ResourceBrowser,
  TaskList,
  TicketQueue,
} from "../shared/WorkbenchParts";
import { Tabs, TabPanel } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";

function useAttempt(runtime: SimulationRuntime) {
  const subscribe = (cb: () => void) => runtime.subscribe(cb);
  return useSyncExternalStore(subscribe, () => runtime.getAttempt(), () => runtime.getAttempt());
}

export function TechnicalSupportSandbox({ runtime, debug }: SimulationRendererProps) {
  const attempt = useAttempt(runtime);
  const scenario = runtime.scenario;
  const readOnly = attempt.status === "SUBMITTED";
  const support = scenario.supportWorkbench;
  const [submitOpen, setSubmitOpen] = useState(false);
  const [centerTab, setCenterTab] = useState("tickets");
  const [rightTab, setRightTab] = useState("people");
  const [activeResource, setActiveResource] = useState<string | undefined>("res_incident_brief");
  const [resourceQuery, setResourceQuery] = useState("");
  const [activePerson, setActivePerson] = useState<string | undefined>("person_sam");
  const [chatDraft, setChatDraft] = useState("");
  const [aiDraft, setAiDraft] = useState("");
  const [escalationDraft, setEscalationDraft] = useState(
    "Escalation to platform:\nEvidence:\nLikely cause:\nRequested action:\n"
  );
  const [customerDraft, setCustomerDraft] = useState(
    "We're investigating intermittent SSO login failures. Status page password checks remain healthy…"
  );

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
                idBase="tse-center"
                items={[
                  { value: "tickets", label: "Tickets" },
                  { value: "docs", label: "Docs / logs" },
                ]}
                value={centerTab}
                onValueChange={setCenterTab}
              />
              <TabPanel
                value="tickets"
                active={centerTab === "tickets"}
                idBase="tse-center"
                className="min-h-0 flex-1 overflow-hidden"
              >
                {support ? (
                  <TicketQueue
                    title={support.ticketsTitle}
                    tickets={support.tickets}
                    selectedId={attempt.workbench.selectedTicketId}
                    triage={attempt.workbench.ticketTriage}
                    onSelect={(id) => runtime.selectTicket(id)}
                    onTriage={(id, classification) => runtime.triageTicket(id, classification)}
                    readOnly={readOnly}
                  />
                ) : (
                  <div className="p-4 text-[13px] text-[var(--text-tertiary)]">No ticket queue</div>
                )}
              </TabPanel>
              <TabPanel value="docs" active={centerTab === "docs"} idBase="tse-center" className="min-h-0 flex-1 overflow-hidden">
                {activeResDef ? (
                  <DocumentationViewer title={activeResDef.title} content={activeResDef.content} />
                ) : (
                  <div className="p-4 text-[13px] text-[var(--text-tertiary)]">Select a resource</div>
                )}
              </TabPanel>
            </div>
          }
          right={
            <div className="flex h-full min-h-0 flex-col">
              <Tabs
                label="Collaboration"
                idBase="tse-right"
                items={[
                  { value: "people", label: "People" },
                  { value: "ai", label: "AI" },
                  { value: "write", label: "Write-ups" },
                ]}
                value={rightTab}
                onValueChange={setRightTab}
              />
              <TabPanel value="people" active={rightTab === "people"} idBase="tse-right" className="min-h-0 flex-1 overflow-hidden">
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
              <TabPanel value="ai" active={rightTab === "ai"} idBase="tse-right" className="min-h-0 flex-1 overflow-hidden">
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
              <TabPanel value="write" active={rightTab === "write"} idBase="tse-right" className="min-h-0 flex-1 overflow-hidden">
                <EscalationComposer
                  escalation={escalationDraft}
                  customerMessage={customerDraft}
                  onChangeEscalation={setEscalationDraft}
                  onChangeCustomer={setCustomerDraft}
                  onSaveEscalation={() =>
                    runtime.saveArtifact("escalation_note", "Escalation to platform", escalationDraft)
                  }
                  onSaveCustomer={() =>
                    runtime.saveArtifact("customer_message", "Customer status update", customerDraft)
                  }
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
