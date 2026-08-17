/**
 * Deterministic product-demo heuristics — NOT scientifically validated hiring predictors.
 * Every inference must cite observations.
 */
import type {
  AnalysisResult,
  AnalysisSection,
  CompetencyEvidence,
  CompetencyOutcome,
  EvidenceInference,
  EvidenceObservation,
  PlaybackEntry,
  SimulationAttempt,
  SimulationScenarioDefinition,
  TelemetryEvent,
} from "../types";

function newId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function buildObservations(
  scenario: SimulationScenarioDefinition,
  attempt: SimulationAttempt
): EvidenceObservation[] {
  const obs: EvidenceObservation[] = [];
  const push = (statement: string, eventIds: string[], artifactIds: string[] = []) => {
    obs.push({
      id: newId("obs"),
      kind: "OBSERVATION",
      statement,
      sourceEventIds: eventIds,
      sourceArtifactIds: artifactIds,
    });
  };

  for (const e of attempt.telemetry) {
    if (e.type === "API_EXECUTE") {
      push(
        `Candidate executed ${e.payload.method} ${e.payload.path} → HTTP ${e.payload.status}${e.payload.success ? " (success)" : ""}.`,
        [e.id]
      );
    }
    if (e.type === "RESOURCE_OPENED") {
      const res = scenario.resources.find((r) => r.id === e.payload.resourceId);
      push(`Candidate opened resource: ${res?.title ?? e.payload.resourceId}.`, [e.id]);
    }
    if (e.type === "MESSAGE_SENT") {
      const person = scenario.people.find((p) => p.id === e.payload.personId);
      push(
        `Candidate messaged ${person?.name ?? e.payload.personId} (intent: ${e.payload.intent}).`,
        [e.id]
      );
    }
    if (e.type === "AI_PROMPT") {
      push(`Candidate prompted AI assistant.`, [e.id]);
    }
    if (e.type === "CODE_RUN") {
      push(`Candidate ran integration script (${e.payload.success ? "ok" : "failed"}).`, [e.id]);
    }
    if (e.type === "SQL_EXECUTE") {
      push(
        e.payload.success
          ? `Candidate executed SQL → ${e.payload.rowCount} row(s)${e.payload.patternId ? ` [${e.payload.patternId}]` : ""}.`
          : `Candidate SQL failed: ${e.payload.error ?? "error"}.`,
        [e.id]
      );
    }
    if (e.type === "ARTIFACT_CREATED" || e.type === "ARTIFACT_UPDATED") {
      push(`Candidate ${e.type === "ARTIFACT_CREATED" ? "created" : "updated"} artifact (${e.payload.kind}).`, [e.id], [
        e.payload.artifactId,
      ]);
    }
    if (e.type === "CHECKLIST_TOGGLED") {
      push(
        `Candidate ${e.payload.completed ? "completed" : "cleared"} checklist item ${e.payload.itemId} (${e.payload.completedCount}/${e.payload.total}).`,
        [e.id]
      );
    }
    if (e.type === "FIELD_MAPPING_SET") {
      push(
        `Candidate mapped ${e.payload.sourceField} → ${e.payload.targetField}${e.payload.correct ? " (correct)" : ""}.`,
        [e.id]
      );
    }
    if (e.type === "TICKET_TRIAGED") {
      push(
        `Candidate triaged ${e.payload.ticketId} as ${e.payload.classification}${e.payload.correct ? " (correct)" : ""}.`,
        [e.id]
      );
    }
    if (e.type === "RULE_SELECTED") {
      push(
        `Candidate selected workflow rule ${e.payload.ruleId}${e.payload.isRootCause ? " (root-cause)" : ""}.`,
        [e.id]
      );
    }
    if (e.type === "FIX_SELECTED") {
      push(
        `Candidate selected fix ${e.payload.fixId}${e.payload.recommended ? " (recommended)" : ""}${e.payload.compliant ? "" : " (non-compliant)"}.`,
        [e.id]
      );
    }
    if (e.type === "IMPACT_SELECTED") {
      push(
        `Candidate quantified impact as ${e.payload.count}${e.payload.correct ? " (correct)" : ""}.`,
        [e.id]
      );
    }
  }

  if (attempt.world.flags.candidate_has_seen_422) {
    const ev = attempt.telemetry.find((t) => t.type === "API_EXECUTE" && t.payload.status === 422);
    push("Candidate received HTTP 422 INVALID_FIELD during API investigation.", ev ? [ev.id] : []);
  }
  if (attempt.world.flags.api_succeeded) {
    const ev = attempt.telemetry.find((t) => t.type === "API_EXECUTE" && t.payload.success);
    push("Candidate obtained a successful API response after investigation.", ev ? [ev.id] : []);
  }
  if (attempt.world.flags.candidate_knows_about_deployment) {
    push("Candidate learned that schema validation was tightened in a recent deployment.", []);
  }
  if (attempt.world.flags.candidate_made_unsupported_promise) {
    push("Candidate language triggered an unsupported-promise signal in stakeholder communication.", []);
  }
  if (attempt.world.flags.customer_escalated) {
    push("Customer escalated under board-demo time pressure during the attempt.", []);
  }
  if (attempt.world.flags.found_churn_driver) {
    push("Candidate SQL investigation matched the primary churn-driver pattern.", []);
  }
  if (attempt.world.flags.wrong_driver_claimed) {
    push("Candidate advanced a driver claim inconsistent with the diagnostic query trail.", []);
  }
  if (attempt.world.flags.phased_plan_chosen) {
    push("Candidate proposed a phased import / launch plan that protects silent-skip risk.", []);
  }
  if (attempt.world.flags.unsafe_import_plan) {
    push("Candidate proposed importing as-is or fixing only after launch despite silent skips.", []);
  }
  if (attempt.world.flags.correct_mapping_complete) {
    push("Candidate completed field mappings consistent with the system import rules.", []);
  }
  if (attempt.world.flags.checklist_complete) {
    push("Candidate completed the required launch checklist items.", []);
  }
  if (attempt.world.flags.correct_triage) {
    push("Candidate triage separated incident tickets from the unrelated password case.", []);
  }
  if (attempt.world.flags.identified_release_cause) {
    push("Candidate linked the incident to the R-2214 SAML skew change with evidence.", []);
  }
  if (attempt.world.flags.escalated_with_evidence) {
    push("Candidate escalated with a request to revert the tightened skew configuration.", []);
  }
  if (attempt.world.flags.misdiagnosed_incident) {
    push("Candidate advanced a misdiagnosis (e.g. password reset) inconsistent with auth logs.", []);
  }
  if (attempt.world.flags.identified_rule_interaction) {
    push("Candidate identified the rule interaction driving incorrect routing.", []);
  }
  if (attempt.world.flags.quantified_impact) {
    push("Candidate quantified how many sample cases were wrongly routed.", []);
  }
  if (attempt.world.flags.correct_fix_chosen) {
    push("Candidate selected a fix aligned with policy intent and compliance constraints.", []);
  }
  if (attempt.world.flags.unsafe_fix_chosen) {
    push("Candidate selected a non-compliant fix (e.g. delete R0 or blanket auto-approval).", []);
  }
  if (attempt.world.flags.separated_system_vs_policy) {
    push("Candidate separated system-as-configured behavior from policy intent in writing.", []);
  }

  return obs;
}

function outcomeFromSignals(args: {
  positive: number;
  negative: number;
  evidenceCount: number;
}): { outcome: CompetencyOutcome; confidence: number } {
  const { positive, negative, evidenceCount } = args;
  if (evidenceCount === 0) return { outcome: "INSUFFICIENT_EVIDENCE", confidence: 0.15 };
  if (negative > positive && negative >= 1) {
    return { outcome: "CONCERN", confidence: Math.min(0.85, 0.45 + negative * 0.15) };
  }
  if (positive >= 2 && negative === 0) {
    return { outcome: "DEMONSTRATED", confidence: Math.min(0.92, 0.55 + positive * 0.12) };
  }
  if (positive >= 1) {
    return { outcome: "PARTIALLY_DEMONSTRATED", confidence: Math.min(0.75, 0.4 + positive * 0.1) };
  }
  return { outcome: "INSUFFICIENT_EVIDENCE", confidence: 0.25 };
}

export function deriveCompetencies(
  scenario: SimulationScenarioDefinition,
  attempt: SimulationAttempt,
  observations: EvidenceObservation[]
): { competencies: CompetencyEvidence[]; inferences: EvidenceInference[] } {
  const inferences: EvidenceInference[] = [];
  const competencies: CompetencyEvidence[] = [];

  const apiFails = attempt.telemetry.filter((e) => e.type === "API_EXECUTE" && !e.payload.success);
  const apiOk = attempt.telemetry.filter((e) => e.type === "API_EXECUTE" && e.payload.success);
  const sqlOk = attempt.telemetry.filter((e) => e.type === "SQL_EXECUTE" && e.payload.success);
  const sqlFail = attempt.telemetry.filter((e) => e.type === "SQL_EXECUTE" && !e.payload.success);
  const resourcesOpened = attempt.telemetry.filter((e) => e.type === "RESOURCE_OPENED");
  const messages = attempt.telemetry.filter((e) => e.type === "MESSAGE_SENT");
  const aiPrompts = attempt.telemetry.filter((e) => e.type === "AI_PROMPT");
  const aiEdited = attempt.aiInteractions.filter((i) => i.editedAfterResponse);
  const customerMsgs = Object.values(attempt.artifacts).filter((a) => a.kind === "customer_message");
  const analysisMemos = Object.values(attempt.artifacts).filter((a) => a.kind === "analysis_memo");
  const reco = Object.values(attempt.artifacts).filter((a) => a.kind === "technical_recommendation");
  const cutoverPlans = Object.values(attempt.artifacts).filter((a) => a.kind === "cutover_plan");
  const escalationNotes = Object.values(attempt.artifacts).filter((a) => a.kind === "escalation_note");
  const promiseConcern = Boolean(attempt.world.flags.candidate_made_unsupported_promise);
  const foundRootCause = Boolean(
    attempt.world.flags.found_churn_driver ||
      attempt.world.flags.api_succeeded ||
      attempt.world.flags.candidate_knows_about_deployment ||
      attempt.world.flags.identified_release_cause
  );

  const addCompetency = (
    competencyId: string,
    label: string,
    related: EvidenceObservation[],
    positive: number,
    negative: number,
    strengths: string[],
    concerns: string[],
    inferenceStatement: string | null
  ) => {
    const { outcome, confidence } = outcomeFromSignals({
      positive,
      negative,
      evidenceCount: related.length,
    });
    const compsInferences: EvidenceInference[] = [];
    if (inferenceStatement && related.length > 0 && outcome !== "INSUFFICIENT_EVIDENCE") {
      const inf: EvidenceInference = {
        id: newId("inf"),
        kind: "INFERENCE",
        statement: inferenceStatement,
        confidence,
        observationIds: related.map((o) => o.id),
        competencyId,
      };
      inferences.push(inf);
      compsInferences.push(inf);
    }
    competencies.push({
      competencyId,
      label,
      outcome,
      confidence,
      observations: related,
      inferences: compsInferences,
      strengths,
      concerns,
      supportingEventIds: related.flatMap((o) => o.sourceEventIds),
      supportingArtifactIds: related.flatMap((o) => o.sourceArtifactIds),
    });
  };

  /** Only evaluate competencies declared on the scenario — never invent extras. */
  for (const def of scenario.competencies) {
    switch (def.id) {
      case "api_troubleshooting": {
        const related = observations.filter((o) => /HTTP|API|422|successful API/i.test(o.statement));
        addCompetency(
          def.id,
          def.label,
          related,
          apiOk.length + (attempt.world.flags.candidate_has_seen_422 ? 1 : 0),
          0,
          [
            ...(apiFails.length ? ["Encountered and inspected failure responses"] : []),
            ...(apiOk.length ? ["Reached a successful API execution"] : []),
          ],
          apiOk.length === 0 && apiFails.length > 2
            ? ["Multiple failures without a successful correction"]
            : [],
          apiOk.length
            ? "Candidate demonstrated structured API troubleshooting culminating in a successful request."
            : apiFails.length
              ? "Candidate engaged API failures but did not complete a successful correction in this attempt."
              : null
        );
        break;
      }
      case "sql_investigation":
      case "data_investigation": {
        const related = observations.filter((o) => /SQL|sql/i.test(o.statement));
        addCompetency(
          def.id,
          def.label,
          related,
          sqlOk.length + (foundRootCause ? 1 : 0),
          sqlFail.length > 3 && sqlOk.length === 0 ? 1 : 0,
          [
            ...(sqlOk.length ? [`Successful SQL runs: ${sqlOk.length}`] : []),
            ...(attempt.world.flags.found_churn_driver ? ["Matched a diagnostic query pattern"] : []),
          ],
          sqlOk.length === 0 ? ["No successful analytical SQL evidenced"] : [],
          sqlOk.length
            ? foundRootCause
              ? "Candidate used SQL to surface a defensible driver of the metric change."
              : "Candidate executed SQL; diagnosis completeness is only partially evidenced."
            : null
        );
        break;
      }
      case "analytical_correctness":
      case "metric_reasoning": {
        const related = observations.filter(
          (o) => /SQL|churn|yield|driver|pattern/i.test(o.statement) || analysisMemos.length > 0
        );
        addCompetency(
          def.id,
          def.label,
          related,
          (attempt.world.flags.found_churn_driver ? 2 : 0) + analysisMemos.length,
          attempt.world.flags.wrong_driver_claimed ? 2 : 0,
          [
            ...(attempt.world.flags.found_churn_driver ? ["Identified the primary driver"] : []),
            ...(analysisMemos.length ? ["Produced an analysis memo"] : []),
          ],
          attempt.world.flags.wrong_driver_claimed
            ? ["Claimed a driver inconsistent with the evidence trail"]
            : [],
          attempt.world.flags.found_churn_driver
            ? "Candidate reached a defensible analytical conclusion supported by query evidence."
            : analysisMemos.length
              ? "Candidate wrote analysis; grounding against query results is incomplete."
              : null
        );
        break;
      }
      case "information_discovery": {
        const related = observations.filter((o) =>
          /opened resource|messaged|deployment|SQL/i.test(o.statement)
        );
        addCompetency(
          def.id,
          def.label,
          related,
          resourcesOpened.length + (attempt.world.flags.candidate_knows_about_deployment ? 2 : 0),
          0,
          [
            ...(resourcesOpened.length ? [`Opened ${resourcesOpened.length} resource(s)`] : []),
            ...(attempt.world.flags.candidate_knows_about_deployment
              ? ["Unlocked deployment knowledge"]
              : []),
          ],
          resourcesOpened.length === 0 ? ["Little evidence of resource investigation"] : [],
          resourcesOpened.length
            ? "Candidate sought information from documentation and/or people rather than guessing alone."
            : null
        );
        break;
      }
      case "customer_communication":
      case "stakeholder_communication": {
        const related = observations.filter((o) =>
          /messaged|unsupported-promise|Customer escalated|stakeholder|analysis_memo|artifact \(analysis_memo\)|memo/i.test(
            o.statement
          )
        );
        const customerMessageCount =
          customerMsgs.length +
          messages.filter((m) => {
            const p = scenario.people.find((x) => x.id === (m.type === "MESSAGE_SENT" ? ePerson(m) : ""));
            return p?.channel === "customer" || p?.channel === "manager";
          }).length;
        addCompetency(
          def.id,
          def.label,
          related,
          customerMessageCount + analysisMemos.length,
          promiseConcern ? 2 : 0,
          customerMsgs.length || analysisMemos.length
            ? ["Produced stakeholder-facing written work"]
            : [],
          promiseConcern ? ["Unsupported promise or overclaim signal"] : [],
          customerMsgs.length || analysisMemos.length
            ? promiseConcern
              ? "Candidate communicated, but also triggered concern about unsupported claims."
              : "Candidate produced stakeholder-facing communication grounded in the attempt."
            : null
        );
        break;
      }
      case "ai_judgment": {
        const related = observations.filter((o) => /AI assistant/i.test(o.statement));
        const verified = apiOk.length > 0 || sqlOk.length > 0 || resourcesOpened.length > 0;
        addCompetency(
          def.id,
          def.label,
          related,
          aiEdited.length + (aiPrompts.length > 0 && verified ? 1 : 0),
          aiPrompts.length > 0 && !verified ? 1 : 0,
          [
            ...(aiPrompts.length ? ["Used AI assistant during investigation"] : []),
            ...(aiEdited.length ? ["Edited after AI response"] : []),
          ],
          aiPrompts.length > 3 && resourcesOpened.length === 0
            ? ["Heavy AI use with little direct resource verification"]
            : [],
          aiPrompts.length
            ? aiEdited.length || verified
              ? "Candidate used AI as an aid within a verification loop."
              : "Candidate used AI; verification behavior is only partially evidenced."
            : null
        );
        break;
      }
      case "stakeholder_judgment":
      case "business_interpretation":
      case "escalation_judgment": {
        const related = observations.filter((o) =>
          /escalat|unsupported|leadership|technical recommendation|analysis memo|memo|phased|revert|checklist/i.test(
            o.statement
          )
        );
        addCompetency(
          def.id,
          def.label,
          related,
          reco.length +
            analysisMemos.length +
            cutoverPlans.length +
            escalationNotes.length +
            (attempt.world.flags.customer_escalated && customerMsgs.length ? 1 : 0) +
            (attempt.world.flags.escalated_with_evidence ? 2 : 0) +
            (attempt.world.flags.phased_plan_chosen ? 1 : 0),
          promiseConcern || attempt.world.flags.unsafe_import_plan || attempt.world.flags.misdiagnosed_incident
            ? 1
            : 0,
          reco.length || analysisMemos.length || cutoverPlans.length || escalationNotes.length
            ? ["Produced leadership/stakeholder-facing artifacts"]
            : [],
          promiseConcern
            ? ["Promise/scope or overclaim risk under pressure"]
            : attempt.world.flags.unsafe_import_plan
              ? ["Unsafe import/launch plan signal"]
              : [],
          reco.length || analysisMemos.length || cutoverPlans.length || escalationNotes.length
            ? "Candidate left artifacts that support interview calibration."
            : null
        );
        break;
      }
      case "implementation_judgment":
      case "go_no_go_judgment":
      case "migration_judgment": {
        const related = observations.filter((o) =>
          /phased|checklist|mapping|import|cutover|unsafe import/i.test(o.statement)
        );
        addCompetency(
          def.id,
          def.label,
          related,
          (attempt.world.flags.phased_plan_chosen ? 2 : 0) +
            (attempt.world.flags.checklist_complete ? 1 : 0) +
            (attempt.world.flags.verification_mentioned ? 1 : 0) +
            cutoverPlans.length,
          attempt.world.flags.unsafe_import_plan ? 2 : 0,
          [
            ...(attempt.world.flags.phased_plan_chosen ? ["Chose a phased / safe launch path"] : []),
            ...(attempt.world.flags.checklist_complete ? ["Completed launch checklist"] : []),
          ],
          attempt.world.flags.unsafe_import_plan
            ? ["Import-as-is or post-launch-only fix under silent-skip risk"]
            : [],
          attempt.world.flags.phased_plan_chosen
            ? "Candidate balanced launch date pressure against silent data loss risk."
            : cutoverPlans.length
              ? "Candidate produced a plan; safety of the import path is only partially evidenced."
              : null
        );
        break;
      }
      case "data_integrity":
      case "requirements_interpretation": {
        const related = observations.filter((o) =>
          /mapped|mapping|import rules|checklist|opened resource/i.test(o.statement)
        );
        addCompetency(
          def.id,
          def.label,
          related,
          (attempt.world.flags.correct_mapping_complete ? 2 : 0) +
            (attempt.world.flags.mapped_at_least_one_correct ? 1 : 0) +
            (attempt.world.flags.opened_import_rules ? 1 : 0),
          0,
          [
            ...(attempt.world.flags.correct_mapping_complete
              ? ["Completed correct field mappings"]
              : []),
            ...(attempt.world.flags.opened_import_rules ? ["Reviewed import rules"] : []),
          ],
          !attempt.world.flags.correct_mapping_complete && related.length > 0
            ? ["Field mapping incomplete or incorrect"]
            : [],
          attempt.world.flags.correct_mapping_complete
            ? "Candidate aligned customer fields to system requirements before launch."
            : null
        );
        break;
      }
      case "technical_diagnosis":
      case "triage":
      case "log_analysis": {
        const related = observations.filter((o) =>
          /triaged|auth log|release|SAML|R-2214|opened resource|misdiagnosis/i.test(o.statement)
        );
        addCompetency(
          def.id,
          def.label,
          related,
          (attempt.world.flags.identified_release_cause ? 2 : 0) +
            (attempt.world.flags.correct_triage ? 2 : 0) +
            (attempt.world.flags.triaged_incident_ticket ? 1 : 0) +
            (attempt.world.flags.opened_auth_log ? 1 : 0),
          attempt.world.flags.misdiagnosed_incident ? 2 : 0,
          [
            ...(attempt.world.flags.identified_release_cause
              ? ["Linked failures to R-2214 SAML skew change"]
              : []),
            ...(attempt.world.flags.correct_triage ? ["Correct ticket triage"] : []),
          ],
          attempt.world.flags.misdiagnosed_incident
            ? ["Misdiagnosed the incident relative to log evidence"]
            : [],
          attempt.world.flags.identified_release_cause
            ? "Candidate diagnosed SSO failures using logs and release context."
            : attempt.world.flags.correct_triage
              ? "Candidate triaged tickets correctly; root-cause statement is incomplete."
              : null
        );
        break;
      }
      case "root_cause_analysis":
      case "process_analysis":
      case "systems_judgment":
      case "stakeholder_summary": {
        const related = observations.filter((o) =>
          /rule|routing|impact|fix|policy|system-as-configured|opened resource|memo|recommendation/i.test(
            o.statement
          )
        );
        addCompetency(
          def.id,
          def.label,
          related,
          (attempt.world.flags.identified_rule_interaction ? 2 : 0) +
            (attempt.world.flags.quantified_impact ? 1 : 0) +
            (attempt.world.flags.correct_fix_chosen ? 2 : 0) +
            (attempt.world.flags.separated_system_vs_policy ? 1 : 0) +
            analysisMemos.length +
            reco.length,
          attempt.world.flags.unsafe_fix_chosen ? 2 : 0,
          [
            ...(attempt.world.flags.identified_rule_interaction
              ? ["Identified rule-order / data interaction"]
              : []),
            ...(attempt.world.flags.quantified_impact ? ["Quantified wrongly routed cases"] : []),
            ...(attempt.world.flags.correct_fix_chosen
              ? ["Chose a compliance-safe fix matching policy intent"]
              : []),
          ],
          attempt.world.flags.unsafe_fix_chosen
            ? ["Selected a fix that fails compliance/audit constraints"]
            : [],
          attempt.world.flags.identified_rule_interaction && attempt.world.flags.correct_fix_chosen
            ? "Candidate traced rule interaction and proposed a policy-aligned fix."
            : attempt.world.flags.identified_rule_interaction
              ? "Candidate identified rule interaction; recommendation quality is only partially evidenced."
              : null
        );
        break;
      }
      default: {
        // Unknown competency: still report insufficient rather than inventing a score.
        addCompetency(def.id, def.label, [], 0, 0, [], [], null);
        break;
      }
    }
  }

  return { competencies, inferences };
}

function ePerson(m: TelemetryEvent): string {
  return m.type === "MESSAGE_SENT" ? m.payload.personId : "";
}

export function buildPlayback(attempt: SimulationAttempt): PlaybackEntry[] {
  const entries: PlaybackEntry[] = [];
  for (const e of attempt.telemetry) {
    entries.push({
      elapsedMs: e.elapsedMs,
      timestamp: e.timestamp,
      eventId: e.id,
      label: labelFor(e),
      category: categoryFor(e),
      detail: detailFor(e),
    });
  }
  for (const s of attempt.world.scenarioEvents) {
    entries.push({
      elapsedMs: s.createdAtMs,
      timestamp: (attempt.metadata.startedAt ?? 0) + s.createdAtMs,
      eventId: s.id,
      label: `[World] ${s.label}`,
      category: "system",
      detail: s.kind,
    });
  }
  return entries.sort((a, b) => a.elapsedMs - b.elapsedMs);
}

function labelFor(e: TelemetryEvent): string {
  switch (e.type) {
    case "SIMULATION_STARTED":
      return "Simulation started";
    case "SIMULATION_SUBMITTED":
      return "Simulation submitted";
    case "RESOURCE_OPENED":
      return `Opened ${e.payload.resourceId}`;
    case "API_EXECUTE":
      return `API ${e.payload.method} ${e.payload.path} → ${e.payload.status}`;
    case "CODE_RUN":
      return `Ran integration script (${e.payload.success ? "ok" : "fail"})`;
    case "SQL_EXECUTE":
      return e.payload.success
        ? `SQL → ${e.payload.rowCount} rows (${e.payload.patternId ?? "scan"})`
        : `SQL error: ${e.payload.error ?? "failed"}`;
    case "MESSAGE_SENT":
      return `Messaged ${e.payload.personId}`;
    case "MESSAGE_RECEIVED":
      return `Reply from ${e.payload.personId}`;
    case "AI_PROMPT":
      return "Asked AI assistant";
    case "AI_RESPONSE":
      return e.payload.editedAfterResponse ? "Edited after AI response" : "AI assistant responded";
    case "ARTIFACT_CREATED":
      return `Created artifact (${e.payload.kind})`;
    case "ARTIFACT_UPDATED":
      return `Updated artifact (${e.payload.kind})`;
    case "TASK_OPENED":
      return `Opened task ${e.payload.taskId}`;
    case "TASK_STATUS_CHANGED":
      return `Task ${e.payload.taskId}: ${e.payload.from} → ${e.payload.to}`;
    case "CHECKLIST_TOGGLED":
      return `Checklist ${e.payload.itemId} → ${e.payload.completed ? "done" : "open"}`;
    case "FIELD_MAPPING_SET":
      return `Mapped ${e.payload.sourceField} → ${e.payload.targetField}`;
    case "TICKET_SELECTED":
      return `Selected ticket ${e.payload.ticketId}`;
    case "TICKET_TRIAGED":
      return `Triaged ${e.payload.ticketId} as ${e.payload.classification}`;
    case "RULE_SELECTED":
      return `Selected rule ${e.payload.ruleId}`;
    case "FIX_SELECTED":
      return `Selected fix ${e.payload.fixId}`;
    case "IMPACT_SELECTED":
      return `Impact count ${e.payload.count}`;
    case "WINDOW_BLUR":
      return "Window focus lost";
    default:
      return e.type;
  }
}

function categoryFor(e: TelemetryEvent): PlaybackEntry["category"] {
  switch (e.type) {
    case "CODE_RUN":
      return "code";
    case "SQL_EXECUTE":
      return "execution";
    case "AI_PROMPT":
    case "AI_RESPONSE":
      return "ai";
    case "MESSAGE_SENT":
    case "MESSAGE_RECEIVED":
    case "PERSON_CONTACTED":
      return "communication";
    case "API_EXECUTE":
      return "execution";
    case "CHECKLIST_TOGGLED":
    case "FIELD_MAPPING_SET":
    case "TICKET_TRIAGED":
    case "RULE_SELECTED":
    case "FIX_SELECTED":
    case "IMPACT_SELECTED":
      return "execution";
    case "TICKET_SELECTED":
      return "navigation";
    case "WINDOW_BLUR":
    case "TAB_BLUR":
    case "PASTE_DETECTION":
      return "integrity";
    case "RESOURCE_OPENED":
    case "TAB_CHANGE":
    case "TASK_OPENED":
      return "navigation";
    default:
      return "system";
  }
}

function detailFor(e: TelemetryEvent): string | undefined {
  if (e.type === "API_EXECUTE") return e.payload.responseBody?.slice(0, 200);
  if (e.type === "SQL_EXECUTE") return e.payload.sql.slice(0, 200);
  if (e.type === "MESSAGE_SENT") return e.payload.preview;
  if (e.type === "AI_PROMPT") return e.payload.prompt.slice(0, 160);
  return undefined;
}

export function buildSections(
  scenario: SimulationScenarioDefinition,
  attempt: SimulationAttempt,
  competencies: CompetencyEvidence[],
  playback: PlaybackEntry[]
): AnalysisSection[] {
  const artifacts = Object.values(attempt.artifacts);
  const sections: AnalysisSection[] = [];

  const demonstrated = competencies.filter((c) => c.outcome === "DEMONSTRATED");
  const concerns = competencies.filter((c) => c.outcome === "CONCERN");
  const insufficient = competencies.filter((c) => c.outcome === "INSUFFICIENT_EVIDENCE");

  sections.push({
    kind: "summary",
    title: "Summary",
    hasContent: true,
    body: [
      `${scenario.metadata.title}.`,
      attempt.world.flags.api_succeeded
        ? "The candidate reached a successful API correction path."
        : attempt.world.flags.found_churn_driver
          ? "The candidate reached a defensible analytical diagnosis via SQL."
          : "The candidate did not complete a successful technical/analytical correction in this attempt.",
      demonstrated.length
        ? `Demonstrated: ${demonstrated.map((c) => c.label).join(", ")}.`
        : "No competencies fully demonstrated.",
      concerns.length ? `Concerns: ${concerns.map((c) => c.label).join(", ")}.` : "",
      insufficient.length
        ? `Insufficient evidence: ${insufficient.map((c) => c.label).join(", ")}.`
        : "",
    ]
      .filter(Boolean)
      .join(" "),
  });

  sections.push({
    kind: "capabilities",
    title: "Demonstrated capabilities",
    hasContent: competencies.length > 0,
    body: "Outcomes are observation-backed. INSUFFICIENT_EVIDENCE means we should not invent a score.",
    items: competencies.map((c) => ({
      id: c.competencyId,
      label: `${c.label} — ${c.outcome.replaceAll("_", " ").toLowerCase()} (${Math.round(c.confidence * 100)}% confidence)`,
      detail: c.inferences[0]?.statement ?? c.strengths[0] ?? c.concerns[0],
      eventIds: c.supportingEventIds,
      artifactIds: c.supportingArtifactIds,
    })),
  });

  sections.push({
    kind: "work_produced",
    title: "Work produced",
    hasContent: artifacts.length > 0,
    body: artifacts.length ? "Artifacts captured from the attempt." : "No artifacts were saved.",
    items: artifacts.map((a) => ({
      id: a.id,
      label: `${a.title} (${a.kind})`,
      detail: a.content.slice(0, 280),
      artifactIds: [a.id],
    })),
  });

  sections.push({
    kind: "execution",
    title: "Execution",
    hasContent: playback.length > 0,
    body: "Chronological playback of candidate actions and world events.",
    items: playback.slice(0, 80).map((p) => ({
      id: p.eventId,
      label: `${formatElapsed(p.elapsedMs)} ${p.label}`,
      detail: p.detail,
      eventIds: [p.eventId],
    })),
  });

  const personMsgs = Object.values(attempt.messages);
  sections.push({
    kind: "communication",
    title: "Communication",
    hasContent: personMsgs.length > 0,
    body: "Candidate ↔ coworkers/customer (person conversations, not AI tool use).",
    items: personMsgs.slice(-20).map((m) => ({
      id: m.id,
      label: `${m.direction === "outbound" ? "→" : "←"} ${m.personId}`,
      detail: m.body.slice(0, 200),
    })),
  });

  sections.push({
    kind: "ai_usage",
    title: "AI usage",
    hasContent: attempt.aiInteractions.length > 0,
    body: "AI assistant interactions are distinct from coworker conversations.",
    items: attempt.aiInteractions.map((i) => ({
      id: i.id,
      label: i.editedAfterResponse ? "Prompted + edited after response" : "Prompted AI assistant",
      detail: `Q: ${i.prompt.slice(0, 120)} → A: ${i.response.slice(0, 120)}`,
    })),
  });

  const opened = Object.values(attempt.resources).filter((r) => r.opened);
  sections.push({
    kind: "investigation",
    title: "Investigation",
    hasContent: opened.length > 0 || Boolean(attempt.world.flags.candidate_knows_about_deployment),
    body: "Resources opened and information unlocked during the attempt.",
    items: opened.map((r) => {
      const def = scenario.resources.find((x) => x.id === r.id);
      return { id: r.id, label: def?.title ?? r.id, detail: def?.summary };
    }),
  });

  const followUps: string[] = [];
  if (!attempt.world.flags.api_succeeded) {
    followUps.push("Ask how they would confirm root cause if the next attempt still returned 422.");
  }
  if (attempt.world.flags.candidate_made_unsupported_promise) {
    followUps.push("Probe how they decide what can be promised to a customer under board-demo pressure.");
  }
  const hadApiFailure = attempt.telemetry.some((e) => e.type === "API_EXECUTE" && !e.payload.success);
  if (!opened.find((r) => r.id === "res_schema") && hadApiFailure) {
    followUps.push("Ask why they did not consult the schema reference after seeing validation errors.");
  }
  if (insufficient.length) {
    followUps.push(
      `Probe areas with insufficient evidence: ${insufficient.map((c) => c.label).join(", ")}.`
    );
  }
  if (!followUps.length) {
    followUps.push("Ask them to narrate an alternative investigation path they considered and discarded.");
  }

  sections.push({
    kind: "follow_up",
    title: "Follow-up",
    hasContent: true,
    body: "What remains uncertain — better than inventing scores.",
    items: followUps.map((q, i) => ({ id: `fq_${i}`, label: q })),
  });

  sections.push({
    kind: "raw_evidence",
    title: "Raw evidence",
    hasContent: observationsSafe(attempt),
    body: "Drilldown into telemetry and scenario events.",
    items: attempt.telemetry.slice(-100).map((e) => ({
      id: e.id,
      label: `${formatElapsed(e.elapsedMs)} ${e.type}`,
      detail: JSON.stringify(e.payload).slice(0, 200),
      eventIds: [e.id],
    })),
  });

  return sections.filter((s) => s.hasContent || s.kind === "summary" || s.kind === "follow_up");
}

function observationsSafe(attempt: SimulationAttempt): boolean {
  return attempt.telemetry.length > 0;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
}

export function analyzeAttempt(
  scenario: SimulationScenarioDefinition,
  attempt: SimulationAttempt
): AnalysisResult {
  const observations = buildObservations(scenario, attempt);
  const { competencies, inferences } = deriveCompetencies(scenario, attempt, observations);
  const playback = buildPlayback(attempt);
  const sections = buildSections(scenario, attempt, competencies, playback);

  return {
    attemptId: attempt.id,
    versions: {
      scenarioVersion: attempt.metadata.scenarioVersion,
      engineVersion: attempt.metadata.engineVersion,
      competencyModelVersion: attempt.metadata.versions.competencyModelVersion,
      evidenceDerivationVersion: attempt.metadata.versions.evidenceDerivationVersion,
      analysisVersion: attempt.metadata.versions.analysisVersion,
    },
    generatedAt: Date.now(),
    competencies,
    observations,
    inferences,
    sections,
    playback,
    overallNarrative: sections.find((s) => s.kind === "summary")?.body ?? "",
  };
}
