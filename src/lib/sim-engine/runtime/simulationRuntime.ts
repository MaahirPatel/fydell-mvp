import type {
  AiToolInteraction,
  JsonValue,
  SimulationAttempt,
  SimulationScenarioDefinition,
  TelemetryEvent,
} from "../types";
import { createWorldState, setWorldFlag } from "./worldState";
import { initTasks, openTask, syncTaskStatuses } from "./taskManager";
import { initResources, openResource, searchResources } from "./resourceLibrary";
import { initPeople } from "./personaRuntime";
import { sendPersonMessage, markConversationRead } from "./communicationRuntime";
import { evaluateEvents, setFlags } from "./eventEngine";
import { upsertArtifact } from "./artifactManager";
import { TelemetryRuntime } from "./telemetryRuntime";
import { executeApiRequest, runIntegrationCode } from "./technicalRuntime";
import { executeSqlQuery } from "./sqlRuntime";

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

/** Deterministic seed from string (no Math.random for scenario branching fairness). */
export function hashSeed(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function defaultWorkbench(scenario: SimulationScenarioDefinition): SimulationAttempt["workbench"] {
  const sqlFirst = scenario.capabilities.includes("sql_execution");
  const apiFirst = scenario.capabilities.includes("api_execution");
  const checklist: Record<string, boolean> = {};
  for (const item of scenario.implementationWorkbench?.checklist ?? []) {
    checklist[item.id] = false;
  }
  const fieldMappings: Record<string, string> = {};
  for (const m of scenario.implementationWorkbench?.fieldMappings ?? []) {
    fieldMappings[m.id] = "";
  }
  const ticketTriage: Record<string, "incident" | "unrelated" | "unknown"> = {};
  for (const t of scenario.supportWorkbench?.tickets ?? []) {
    ticketTriage[t.id] = "unknown";
  }

  return {
    code: apiFirst
      ? `// Integration script, Northstar Health CRM sync\nconst payload = {\n  customer_id: 18402,\n  owner_email: "alex@northstar.health",\n  account_name: "Northstar Health"\n};\n\n// TODO: POST to /v1/accounts with Authorization: Bearer <token>\n`
      : `// Optional scratch pad\n`,
    language: "javascript",
    apiMethod: "POST",
    apiPath: apiFirst ? "/v1/accounts" : "/",
    apiHeaders: apiFirst
      ? '{\n  "Authorization": "Bearer demo-token",\n  "Content-Type": "application/json"\n}'
      : "{}",
    apiBody: apiFirst
      ? '{\n  "customer_id": 18402,\n  "owner_email": "alex@northstar.health",\n  "account_name": "Northstar Health"\n}'
      : "{}",
    sqlQuery: sqlFirst
      ? `SELECT\n  plan,\n  COUNT(*) AS churned_accounts\nFROM subscriptions\nWHERE status = 'churned'\n  AND churned_at >= '2026-07-01'\n  AND churned_at < '2026-10-01'\nGROUP BY plan\nORDER BY churned_accounts DESC;`
      : `SELECT 1;`,
    checklist,
    fieldMappings,
    ticketTriage,
    selectedTicketId: scenario.supportWorkbench?.tickets[0]?.id,
    selectedRuleId: scenario.rulesWorkbench?.rules[0]?.id,
  };
}

export function createAttempt(
  scenario: SimulationScenarioDefinition,
  seed?: string
): SimulationAttempt {
  const resolvedSeed = seed ?? hashSeed(`${scenario.metadata.id}:${Date.now()}`);
  const unlocked = scenario.tools.filter((t) => t.initiallyUnlocked).map((t) => t.id);
  const world = createWorldState(scenario.world);
  world.unlockedTools = unlocked;

  return {
    id: newId("attempt"),
    metadata: {
      scenarioId: scenario.metadata.id,
      scenarioVersion: scenario.versions.scenarioVersion,
      engineVersion: scenario.versions.engineVersion,
      seed: resolvedSeed,
      roleKey: scenario.metadata.roleKey,
      versions: scenario.versions,
    },
    status: "NOT_STARTED",
    remainingTimeSeconds: scenario.metadata.timeLimitSeconds,
    activeWorkspaceTab: "tasks",
    tasks: initTasks(scenario.tasks),
    resources: initResources(scenario.resources),
    people: initPeople(scenario.people),
    conversations: {},
    messages: {},
    aiInteractions: [],
    artifacts: {},
    world,
    telemetry: [],
    scenarioEvents: [],
    workbench: defaultWorkbench(scenario),
    integrity: { windowBlurCount: 0, pasteCount: 0 },
  };
}

type Listener = () => void;

export class SimulationRuntime {
  readonly scenario: SimulationScenarioDefinition;
  private attempt: SimulationAttempt;
  private telemetry = new TelemetryRuntime();
  private listeners = new Set<Listener>();
  private firedEvents = new Set<string>();
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  constructor(scenario: SimulationScenarioDefinition, attempt?: SimulationAttempt) {
    this.scenario = scenario;
    this.attempt = attempt ?? createAttempt(scenario);
    if (attempt?.metadata.startedAt) {
      this.telemetry.load(attempt.telemetry, attempt.metadata.startedAt);
    }
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }

  getAttempt(): SimulationAttempt {
    return this.attempt;
  }

  getElapsedMs(now = Date.now()): number {
    return this.telemetry.getElapsedMs(now);
  }

  start(now = Date.now()): void {
    if (this.attempt.status !== "NOT_STARTED") return;
    this.telemetry.start(now);
    this.attempt = {
      ...this.attempt,
      status: "IN_PROGRESS",
      metadata: { ...this.attempt.metadata, startedAt: now },
    };
    this.pushTelemetry({
      type: "SIMULATION_STARTED",
      payload: { scenarioId: this.scenario.metadata.id, seed: this.attempt.metadata.seed },
    }, now);
    this.afterAction(now);
    this.startTicker();
    this.emit();
  }

  private startTicker(): void {
    if (this.tickTimer) return;
    this.tickTimer = setInterval(() => {
      if (this.attempt.status !== "IN_PROGRESS") return;
      const remaining = Math.max(0, this.attempt.remainingTimeSeconds - 1);
      this.attempt = { ...this.attempt, remainingTimeSeconds: remaining };
      // Time-based scenario events
      const elapsed = this.getElapsedMs();
      const evaluated = evaluateEvents(this.scenario, this.attempt, elapsed, this.firedEvents);
      this.attempt = evaluated.attempt;
      this.syncTasks(elapsed);
      this.emit();
    }, 1000);
  }

  dispose(): void {
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
  }

  private pushTelemetry(
    partial: Omit<TelemetryEvent, "id" | "timestamp" | "elapsedMs">,
    now = Date.now()
  ): TelemetryEvent {
    const event = this.telemetry.record(partial, now);
    this.attempt = {
      ...this.attempt,
      telemetry: [...this.attempt.telemetry, event],
      scenarioEvents: this.attempt.world.scenarioEvents,
    };
    if (partial.type === "WINDOW_BLUR" || partial.type === "TAB_BLUR") {
      this.attempt = {
        ...this.attempt,
        integrity: {
          ...this.attempt.integrity,
          windowBlurCount: this.attempt.integrity.windowBlurCount + 1,
        },
      };
    }
    if (partial.type === "PASTE_DETECTION") {
      this.attempt = {
        ...this.attempt,
        integrity: {
          ...this.attempt.integrity,
          pasteCount: this.attempt.integrity.pasteCount + 1,
        },
      };
    }
    return event;
  }

  private syncTasks(elapsedMs: number): void {
    const { tasks, changes } = syncTaskStatuses(this.scenario, this.attempt, elapsedMs);
    if (!changes.length) {
      this.attempt = { ...this.attempt, tasks };
      return;
    }
    let next = { ...this.attempt, tasks };
    for (const c of changes) {
      const ev = this.telemetry.record({
        type: "TASK_STATUS_CHANGED",
        payload: { taskId: c.taskId, from: c.from, to: c.to },
      });
      next = { ...next, telemetry: [...next.telemetry, ev], tasks };
    }
    this.attempt = next;
  }

  private afterAction(now = Date.now(), causedBy?: TelemetryEvent): void {
    const elapsed = this.telemetry.getElapsedMs(now);
    const evaluated = evaluateEvents(this.scenario, this.attempt, elapsed, this.firedEvents, causedBy);
    this.attempt = evaluated.attempt;
    this.syncTasks(elapsed);
    this.attempt = {
      ...this.attempt,
      scenarioEvents: this.attempt.world.scenarioEvents,
    };
  }

  setTab(tab: string): void {
    this.attempt = { ...this.attempt, activeWorkspaceTab: tab };
    this.pushTelemetry({ type: "TAB_CHANGE", payload: { tab } });
    this.afterAction();
    this.emit();
  }

  openTask(taskId: string): void {
    const elapsed = this.getElapsedMs();
    this.attempt = {
      ...this.attempt,
      tasks: openTask(this.attempt.tasks, taskId, elapsed),
    };
    this.pushTelemetry({ type: "TASK_OPENED", payload: { taskId } });
    this.afterAction();
    this.emit();
  }

  openResource(resourceId: string): void {
    const elapsed = this.getElapsedMs();
    this.attempt = {
      ...this.attempt,
      resources: openResource(this.attempt.resources, resourceId, elapsed),
    };
    const def = this.scenario.resources.find((r) => r.id === resourceId);
    if (def?.onOpenFlags) {
      this.attempt = setFlags(this.attempt, def.onOpenFlags, elapsed);
    }
    this.pushTelemetry({ type: "RESOURCE_OPENED", payload: { resourceId } });
    this.afterAction();
    this.emit();
  }

  searchResources(query: string): string[] {
    const { hits, resources } = searchResources(this.scenario.resources, this.attempt.resources, query);
    this.attempt = { ...this.attempt, resources };
    this.pushTelemetry({
      type: "RESOURCE_SEARCHED",
      payload: { query, hitCount: hits.length },
    });
    this.afterAction();
    this.emit();
    return hits;
  }

  contactPerson(personId: string, body: string): void {
    const person = this.scenario.people.find((p) => p.id === personId);
    if (!person) return;
    const personRuntime = this.attempt.people[personId];
    if (!personRuntime) return;
    const elapsed = this.getElapsedMs();
    const result = sendPersonMessage({
      person,
      personRuntime,
      people: this.attempt.people,
      conversations: this.attempt.conversations,
      messages: this.attempt.messages,
      world: this.attempt.world,
      body,
      elapsedMs: elapsed,
    });

    let next: SimulationAttempt = {
      ...this.attempt,
      people: result.people,
      conversations: result.conversations,
      messages: result.messages,
    };
    if (result.worldFlagsToSet) {
      next = setFlags(next, result.worldFlagsToSet, elapsed);
    }

    this.attempt = next;
    const contacted = this.pushTelemetry({
      type: "PERSON_CONTACTED",
      payload: { personId },
    });
    this.pushTelemetry({
      type: "MESSAGE_SENT",
      payload: {
        personId,
        conversationId: result.outbound.conversationId,
        intent: result.intent,
        preview: body.slice(0, 120),
      },
    });
    this.pushTelemetry({
      type: "MESSAGE_RECEIVED",
      payload: {
        personId,
        conversationId: result.inbound.conversationId,
        preview: result.inbound.body.slice(0, 120),
      },
    });
    this.afterAction(Date.now(), contacted);
    this.emit();
  }

  markConversationRead(conversationId: string): void {
    this.attempt = {
      ...this.attempt,
      conversations: markConversationRead(this.attempt.conversations, conversationId),
    };
    this.emit();
  }

  updateWorkbench(patch: Partial<SimulationAttempt["workbench"]>): void {
    this.attempt = {
      ...this.attempt,
      workbench: { ...this.attempt.workbench, ...patch },
    };
    this.pushTelemetry({
      type: "INPUT_CHANGE",
      payload: { field: "workbench", length: (patch.code ?? patch.apiBody ?? patch.sqlQuery ?? "").length },
    });
    this.emit();
  }

  /**
   * Durable scratch for surfaces that own structured candidate work the core
   * attempt shape does not model, such as the evidence pack. Kept in `extras`
   * so it is captured by the durable snapshot and survives a refresh instead of
   * living in component state.
   */
  updateExtras(patch: Record<string, JsonValue>): void {
    this.attempt = {
      ...this.attempt,
      extras: { ...(this.attempt.extras ?? {}), ...patch },
    };
    this.emit();
  }

  async executeSql(): Promise<void> {
    const sql = this.attempt.workbench.sqlQuery;
    const result = await executeSqlQuery(
      this.scenario.sqlRuntime,
      this.attempt,
      sql,
      this.getElapsedMs()
    );
    this.attempt = {
      ...result.attempt,
      workbench: {
        ...result.attempt.workbench,
        lastSqlResult: {
          success: result.success,
          error: result.error,
          columns: result.columns,
          rows: result.rows,
          patternId: result.patternId,
          rowCount: result.rowCount,
        },
      },
    };
    const art = upsertArtifact(this.attempt.artifacts, {
      kind: "sql_query",
      title: "SQL investigation",
      content: sql,
      elapsedMs: this.getElapsedMs(),
      metadata: {
        success: result.success,
        patternId: result.patternId ?? null,
        rowCount: result.rowCount,
      },
    });
    this.attempt = { ...this.attempt, artifacts: art.artifacts };
    const ev = this.pushTelemetry({
      type: "SQL_EXECUTE",
      payload: {
        sql,
        success: result.success,
        error: result.error,
        rowCount: result.rowCount,
        patternId: result.patternId,
        columns: result.columns,
      },
    });
    this.afterAction(Date.now(), ev);
    this.emit();
  }

  runCode(): void {
    const { output, success } = runIntegrationCode(
      this.attempt.workbench.code,
      this.attempt.workbench.language
    );
    this.attempt = {
      ...this.attempt,
      workbench: { ...this.attempt.workbench, lastCodeOutput: output },
    };
    const art = upsertArtifact(this.attempt.artifacts, {
      kind: "integration_code",
      title: "Integration script",
      content: this.attempt.workbench.code,
      elapsedMs: this.getElapsedMs(),
    });
    this.attempt = { ...this.attempt, artifacts: art.artifacts };
    this.pushTelemetry({
      type: art.created ? "ARTIFACT_CREATED" : "ARTIFACT_UPDATED",
      payload: art.created
        ? { artifactId: art.artifact.id, kind: art.artifact.kind }
        : { artifactId: art.artifact.id, kind: art.artifact.kind, length: art.artifact.content.length },
    });
    const ev = this.pushTelemetry({
      type: "CODE_RUN",
      payload: {
        language: this.attempt.workbench.language,
        code: this.attempt.workbench.code,
        output,
        success,
      },
    });
    this.afterAction(Date.now(), ev);
    this.emit();
  }

  executeApi(): void {
    const wb = this.attempt.workbench;
    const result = executeApiRequest(this.scenario.technicalRuntime, this.attempt, {
      method: wb.apiMethod,
      path: wb.apiPath,
      headers: wb.apiHeaders,
      body: wb.apiBody,
      elapsedMs: this.getElapsedMs(),
      seed: this.attempt.metadata.seed,
    });
    this.attempt = {
      ...result.attempt,
      workbench: {
        ...result.attempt.workbench,
        lastApiResult: {
          status: result.status,
          body: result.body,
          requestId: result.requestId,
          success: result.success,
        },
      },
    };
    // If request id issued and candidate asks later, also set fact unlock path via world
    if (result.requestId && result.status === 422) {
      this.attempt = {
        ...this.attempt,
        world: setWorldFlag(this.attempt.world, "request_id_available", true, this.getElapsedMs()),
      };
    }
    const art = upsertArtifact(this.attempt.artifacts, {
      kind: "api_request",
      title: "Latest API request",
      content: `${wb.apiMethod} ${wb.apiPath}\n${wb.apiHeaders}\n\n${wb.apiBody}\n\n---\n${result.status}\n${result.body}`,
      elapsedMs: this.getElapsedMs(),
      metadata: { status: result.status, success: result.success },
    });
    this.attempt = { ...this.attempt, artifacts: art.artifacts };
    const ev = this.pushTelemetry({
      type: "API_EXECUTE",
      payload: {
        method: wb.apiMethod,
        path: wb.apiPath,
        status: result.status,
        success: result.success,
        requestBody: wb.apiBody,
        responseBody: result.body,
        requestId: result.requestId,
      },
    });
    this.afterAction(Date.now(), ev);
    this.emit();
  }

  askAiAssistant(prompt: string): AiToolInteraction {
    const cfg = this.scenario.aiAssistant;
    const modelLabel = cfg?.modelLabel ?? "Fydell Assistant (mock)";
    let response = cfg?.fallbackResponse ?? "I can help you reason about the integration failure. Share the error payload or ask about auth, schema, or logs.";
    if (cfg) {
      const lower = prompt.toLowerCase();
      for (const r of cfg.responses) {
        if (r.whenPromptIncludes.every((k) => lower.includes(k.toLowerCase()))) {
          response = r.response;
          break;
        }
        if (r.whenPromptIncludes.some((k) => lower.includes(k.toLowerCase()))) {
          response = r.response;
          break;
        }
      }
    }
    const interaction: AiToolInteraction = {
      id: newId("ai"),
      kind: "ai_tool",
      prompt,
      response,
      modelLabel,
      createdAtMs: this.getElapsedMs(),
    };
    this.attempt = {
      ...this.attempt,
      aiInteractions: [...this.attempt.aiInteractions, interaction],
    };
    this.pushTelemetry({
      type: "AI_PROMPT",
      payload: { interactionId: interaction.id, prompt, modelLabel },
    });
    this.pushTelemetry({
      type: "AI_RESPONSE",
      payload: { interactionId: interaction.id, responsePreview: response.slice(0, 160) },
    });
    this.afterAction();
    this.emit();
    return interaction;
  }

  markAiEdited(interactionId: string): void {
    this.attempt = {
      ...this.attempt,
      aiInteractions: this.attempt.aiInteractions.map((i) =>
        i.id === interactionId ? { ...i, editedAfterResponse: true } : i
      ),
    };
    this.pushTelemetry({
      type: "AI_RESPONSE",
      payload: {
        interactionId,
        responsePreview: "edited_after_response",
        editedAfterResponse: true,
      },
    });
    this.emit();
  }

  saveArtifact(kind: import("../types").ArtifactKind, title: string, content: string): void {
    const art = upsertArtifact(this.attempt.artifacts, {
      kind,
      title,
      content,
      elapsedMs: this.getElapsedMs(),
    });
    this.attempt = { ...this.attempt, artifacts: art.artifacts };
    const elapsed = this.getElapsedMs();
    const lower = content.toLowerCase();

    // Analytics memo heuristics
    if (kind === "analysis_memo") {
      const claimsTickets =
        /(primary|mainly|mainly due|driven by).{0,40}(ticket|support quality)/i.test(lower) ||
        /tickets?.{0,20}(primary|main driver)/i.test(lower);
      const claimsMix =
        /(mix|growth plan|plan mix)/i.test(lower) && /(primary|main driver|driven)/i.test(lower);
      if (claimsTickets && !this.attempt.world.flags.found_churn_driver) {
        this.attempt = setFlags(this.attempt, { wrong_driver_claimed: true }, elapsed);
      } else if (claimsMix && this.attempt.world.flags.found_churn_driver) {
        this.attempt = setFlags(this.attempt, { wrong_driver_claimed: false }, elapsed);
      }
    }

    // IC cutover / customer plan heuristics
    if (kind === "cutover_plan" || kind === "customer_message") {
      const phased =
        /(clean rows|partial|phase|import now|today).{0,80}(fix|monday|before monday|remaining)/i.test(
          lower
        ) || /(import|launch).{0,60}(clean|partial|phase)/i.test(lower);
      const verifies = /(count|validat|reconcil|verify|nothing (is )?lost|missing)/i.test(lower);
      const importAsIs = /(import (everything|all).{0,30}as[- ]?is|fix after launch)/i.test(lower);
      if (phased) {
        this.attempt = setFlags(this.attempt, { phased_plan_chosen: true }, elapsed);
      }
      if (verifies) {
        this.attempt = setFlags(this.attempt, { verification_mentioned: true }, elapsed);
      }
      if (importAsIs && !phased) {
        this.attempt = setFlags(this.attempt, { unsafe_import_plan: true }, elapsed);
      }
    }

    // TSE escalation / customer update heuristics
    if (kind === "escalation_note" || kind === "customer_message" || kind === "technical_recommendation") {
      const samlCause =
        /(r-2214|r2214|saml|clock.?skew|assertion|30s|300)/i.test(lower) &&
        /(cause|root|releas|revert|tighten)/i.test(lower);
      const passwordMisblame =
        /(password database|reset (all|their) password|status page (is )?broken)/i.test(lower);
      if (samlCause) {
        this.attempt = setFlags(this.attempt, { identified_release_cause: true }, elapsed);
      }
      if (/(revert|escalat|config flag|skew.?toleranc)/i.test(lower) && samlCause) {
        this.attempt = setFlags(this.attempt, { escalated_with_evidence: true }, elapsed);
      }
      if (passwordMisblame && !samlCause) {
        this.attempt = setFlags(this.attempt, { misdiagnosed_incident: true }, elapsed);
      }
    }

    // BSA stakeholder summary heuristics
    if (kind === "analysis_memo" || kind === "technical_recommendation") {
      const separates =
        /(as configured|working as|rule (r0|says)|intent|policy meant|not a bug|doing exactly)/i.test(
          lower
        );
      const quantifies = /\b(4|four)\b/.test(lower);
      const compliantFix =
        /(backfill|genuinely new|definition|preserve|audit)/i.test(lower) &&
        !/(delete r0|auto-approve everything|blanket)/i.test(lower);
      if (separates) {
        this.attempt = setFlags(this.attempt, { separated_system_vs_policy: true }, elapsed);
      }
      if (quantifies) {
        this.attempt = setFlags(this.attempt, { quantified_impact: true }, elapsed);
      }
      if (compliantFix && separates) {
        this.attempt = setFlags(this.attempt, { correct_fix_chosen: true }, elapsed);
      }
    }

    this.pushTelemetry({
      type: art.created ? "ARTIFACT_CREATED" : "ARTIFACT_UPDATED",
      payload: art.created
        ? { artifactId: art.artifact.id, kind: art.artifact.kind }
        : { artifactId: art.artifact.id, kind: art.artifact.kind, length: content.length },
    });
    this.afterAction();
    this.emit();
  }

  toggleChecklistItem(itemId: string, completed?: boolean): void {
    const items = this.scenario.implementationWorkbench?.checklist ?? [];
    if (!items.some((i) => i.id === itemId)) return;
    const next = completed ?? !this.attempt.workbench.checklist[itemId];
    const checklist = { ...this.attempt.workbench.checklist, [itemId]: next };
    const completedCount = Object.values(checklist).filter(Boolean).length;
    this.attempt = {
      ...this.attempt,
      workbench: { ...this.attempt.workbench, checklist },
    };
    const elapsed = this.getElapsedMs();
    const required = items.filter((i) => i.required !== false);
    const requiredDone = required.every((i) => checklist[i.id]);
    if (requiredDone && required.length > 0) {
      this.attempt = setFlags(this.attempt, { checklist_complete: true }, elapsed);
    }
    this.pushTelemetry({
      type: "CHECKLIST_TOGGLED",
      payload: { itemId, completed: next, completedCount, total: items.length },
    });
    this.afterAction();
    this.emit();
  }

  setFieldMapping(mappingId: string, targetField: string): void {
    const def = this.scenario.implementationWorkbench?.fieldMappings.find((m) => m.id === mappingId);
    if (!def) return;
    const fieldMappings = { ...this.attempt.workbench.fieldMappings, [mappingId]: targetField };
    const correct = targetField === def.correctTarget;
    this.attempt = {
      ...this.attempt,
      workbench: { ...this.attempt.workbench, fieldMappings },
    };
    const elapsed = this.getElapsedMs();
    const all = this.scenario.implementationWorkbench?.fieldMappings ?? [];
    const allCorrect =
      all.length > 0 && all.every((m) => fieldMappings[m.id] === m.correctTarget);
    if (allCorrect) {
      this.attempt = setFlags(this.attempt, { correct_mapping_complete: true }, elapsed);
    }
    if (correct) {
      this.attempt = setFlags(this.attempt, { mapped_at_least_one_correct: true }, elapsed);
    }
    this.pushTelemetry({
      type: "FIELD_MAPPING_SET",
      payload: { mappingId, sourceField: def.sourceField, targetField, correct },
    });
    this.afterAction();
    this.emit();
  }

  selectTicket(ticketId: string): void {
    if (!this.scenario.supportWorkbench?.tickets.some((t) => t.id === ticketId)) return;
    this.attempt = {
      ...this.attempt,
      workbench: { ...this.attempt.workbench, selectedTicketId: ticketId },
    };
    this.pushTelemetry({ type: "TICKET_SELECTED", payload: { ticketId } });
    this.afterAction();
    this.emit();
  }

  triageTicket(ticketId: string, classification: "incident" | "unrelated" | "unknown"): void {
    const ticket = this.scenario.supportWorkbench?.tickets.find((t) => t.id === ticketId);
    if (!ticket) return;
    const ticketTriage = { ...this.attempt.workbench.ticketTriage, [ticketId]: classification };
    const correct =
      (ticket.belongsToIncident && classification === "incident") ||
      (!ticket.belongsToIncident && classification === "unrelated");
    this.attempt = {
      ...this.attempt,
      workbench: { ...this.attempt.workbench, ticketTriage, selectedTicketId: ticketId },
    };
    const elapsed = this.getElapsedMs();
    const tickets = this.scenario.supportWorkbench?.tickets ?? [];
    const allCorrect =
      tickets.length > 0 &&
      tickets.every((t) => {
        const c = ticketTriage[t.id];
        return (
          (t.belongsToIncident && c === "incident") || (!t.belongsToIncident && c === "unrelated")
        );
      });
    if (allCorrect) {
      this.attempt = setFlags(this.attempt, { correct_triage: true, excluded_unrelated_ticket: true }, elapsed);
    }
    if (classification === "incident") {
      this.attempt = setFlags(this.attempt, { triaged_incident_ticket: true }, elapsed);
    }
    this.pushTelemetry({
      type: "TICKET_TRIAGED",
      payload: { ticketId, classification, correct },
    });
    this.afterAction();
    this.emit();
  }

  selectRule(ruleId: string): void {
    const rules = this.scenario.rulesWorkbench?.rules ?? [];
    if (!rules.some((r) => r.id === ruleId)) return;
    const isRootCause = Boolean(this.scenario.rulesWorkbench?.rootCauseRuleIds.includes(ruleId));
    this.attempt = {
      ...this.attempt,
      workbench: { ...this.attempt.workbench, selectedRuleId: ruleId },
    };
    const elapsed = this.getElapsedMs();
    if (isRootCause) {
      this.attempt = setFlags(this.attempt, { identified_rule_interaction: true }, elapsed);
    }
    this.pushTelemetry({ type: "RULE_SELECTED", payload: { ruleId, isRootCause } });
    this.afterAction();
    this.emit();
  }

  selectFix(fixId: string): void {
    const cfg = this.scenario.rulesWorkbench;
    const fix = cfg?.fixOptions.find((f) => f.id === fixId);
    if (!cfg || !fix) return;
    const recommended = fixId === cfg.recommendedFixId;
    this.attempt = {
      ...this.attempt,
      workbench: { ...this.attempt.workbench, selectedFixId: fixId },
    };
    const elapsed = this.getElapsedMs();
    if (recommended) {
      this.attempt = setFlags(
        this.attempt,
        { correct_fix_chosen: true, unsafe_fix_chosen: false },
        elapsed
      );
    } else if (!fix.compliant) {
      this.attempt = setFlags(this.attempt, { unsafe_fix_chosen: true, correct_fix_chosen: false }, elapsed);
    } else {
      this.attempt = setFlags(this.attempt, { correct_fix_chosen: false }, elapsed);
    }
    this.pushTelemetry({
      type: "FIX_SELECTED",
      payload: { fixId, compliant: fix.compliant, recommended },
    });
    this.afterAction();
    this.emit();
  }

  selectImpactCount(count: number): void {
    const cfg = this.scenario.rulesWorkbench;
    if (!cfg || cfg.correctImpactCount === undefined) return;
    const correct = count === cfg.correctImpactCount;
    this.attempt = {
      ...this.attempt,
      workbench: { ...this.attempt.workbench, selectedImpactCount: count },
    };
    const elapsed = this.getElapsedMs();
    if (correct) {
      this.attempt = setFlags(this.attempt, { quantified_impact: true }, elapsed);
    }
    this.pushTelemetry({ type: "IMPACT_SELECTED", payload: { count, correct } });
    this.afterAction();
    this.emit();
  }

  recordBlur(reason: "window" | "visibility"): void {
    this.pushTelemetry({ type: "WINDOW_BLUR", payload: { reason } });
    this.emit();
  }

  recordPaste(length: number, target?: string): void {
    this.pushTelemetry({ type: "PASTE_DETECTION", payload: { length, target } });
    this.emit();
  }

  submit(): boolean {
    if (this.attempt.status === "SUBMITTED" || this.attempt.status === "SUBMITTING") {
      return false;
    }
    this.attempt = { ...this.attempt, status: "SUBMITTING" };
    this.emit();
    const artifactIds = Object.keys(this.attempt.artifacts);
    this.pushTelemetry({ type: "SIMULATION_SUBMITTED", payload: { artifactIds } });
    this.attempt = {
      ...this.attempt,
      status: "SUBMITTED",
      metadata: { ...this.attempt.metadata, submittedAt: Date.now() },
    };
    this.dispose();
    this.emit();
    return true;
  }

  /** Restore from persistence. */
  static restore(scenario: SimulationScenarioDefinition, attempt: SimulationAttempt): SimulationRuntime {
    return new SimulationRuntime(scenario, attempt);
  }
}
