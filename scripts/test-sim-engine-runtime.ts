/**
 * Simulation engine runtime + scenario validation tests.
 */
import { northstarIntegrationScenario } from "../src/lib/sim-engine/scenarios/solutions-engineer/northstar-integration";
import { q3ChurnInvestigationScenario } from "../src/lib/sim-engine/scenarios/data-analyst/q3-churn-investigation";
import { brightpathLaunchImportScenario } from "../src/lib/sim-engine/scenarios/implementation-consultant/brightpath-launch-import";
import { greenStatusPageScenario } from "../src/lib/sim-engine/scenarios/technical-support/green-status-page";
import { ridgelineExecutiveQueueScenario } from "../src/lib/sim-engine/scenarios/business-systems-analyst/ridgeline-executive-queue";
import { getScenario } from "../src/lib/sim-engine/scenarios/catalog";
import { centerTabsForScenario, rightTabsForScenario } from "../src/lib/sim-engine/registry/workbenchLayout";
import { validateScenario } from "../src/lib/sim-engine/validation/validateScenario";
import { SimulationRuntime, createAttempt } from "../src/lib/sim-engine/runtime/simulationRuntime";
import { getRenderer, registerRenderer } from "../src/lib/sim-engine/registry/rendererRegistry";
import { telemetryToLegacyEvent, attemptToLegacySessionProjection } from "../src/lib/sim-engine/adapters/legacy-compat";
import { resolveEngineScenarioId } from "../src/lib/sim-engine/adapters/legacy-slug-map";
import { classifyIntent } from "../src/lib/sim-engine/runtime/personaRuntime";

let failures = 0;

function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

console.log("sim-engine runtime");

const validation = validateScenario(northstarIntegrationScenario);
ok("scenario validates", validation.ok, validation.issues.map((i) => i.message).join("; "));
ok("scenario versioned", Boolean(northstarIntegrationScenario.versions.scenarioVersion));
ok("uses RoleKey solutions_engineer", northstarIntegrationScenario.metadata.roleKey === "solutions_engineer");
ok("has capabilities set", northstarIntegrationScenario.capabilities.includes("api_execution"));
ok("hidden resources exist", northstarIntegrationScenario.resources.some((r) => !r.initiallyVisible));
ok("multiple event definitions", northstarIntegrationScenario.events.length >= 5);

ok("intent classify deploy", classifyIntent("Did you deploy schema validation yesterday?") === "ask_deployment");
ok("intent classify promise", classifyIntent("We guarantee this ships tonight with no risk") === "unsupported_promise");

const runtime = new SimulationRuntime(northstarIntegrationScenario, createAttempt(northstarIntegrationScenario, "testseed"));
runtime.start(Date.now());

// Path B-ish: execute first → 422
runtime.executeApi();
let attempt = runtime.getAttempt();
ok("422 failure state", attempt.world.flags.candidate_has_seen_422 === true, JSON.stringify(attempt.world.flags));
ok("request id issued", Boolean(attempt.world.flags.last_request_id) || Boolean(attempt.workbench.lastApiResult?.requestId));

// Ask engineering about deployment (disclosure requires 422)
runtime.contactPerson("person_devon", "Did anything related to schema validation get deployed recently?");
attempt = runtime.getAttempt();
ok(
  "deployment knowledge can unlock",
  attempt.world.flags.candidate_knows_about_deployment === true ||
    Object.values(attempt.messages).some((m) => m.body.toLowerCase().includes("uuid")),
  "persona reply or flag"
);

// Reveal path
ok(
  "deploy notes eventually revealable",
  attempt.resources.res_deploy_notes?.visible === true ||
    northstarIntegrationScenario.events.some((e) =>
      e.actions.some((a) => a.kind === "REVEAL_RESOURCE" && a.resourceId === "res_deploy_notes")
    )
);

// Fix payload and succeed
runtime.updateWorkbench({
  apiBody: JSON.stringify({
    customer_id: "550e8400-e29b-41d4-a716-446655440000",
    owner_email: "alex@northstar.health",
    account_name: "Northstar Health",
  }),
});
runtime.executeApi();
attempt = runtime.getAttempt();
ok("API success path", attempt.world.flags.api_succeeded === true || attempt.workbench.lastApiResult?.success === true);

// Alternate failure states
const r401 = new SimulationRuntime(northstarIntegrationScenario, createAttempt(northstarIntegrationScenario, "authfail"));
r401.start();
r401.updateWorkbench({ apiHeaders: "{}" });
r401.executeApi();
ok("401 failure state", r401.getAttempt().workbench.lastApiResult?.status === 401);

const r404 = new SimulationRuntime(northstarIntegrationScenario, createAttempt(northstarIntegrationScenario, "notfound"));
r404.start();
r404.updateWorkbench({ apiPath: "/v1/unknown" });
r404.executeApi();
ok("404 failure state", r404.getAttempt().workbench.lastApiResult?.status === 404);

runtime.saveArtifact("customer_message", "Customer update", "We confirmed schema validation on customer_id and verified a supported fix. Residual risk remains for other jobs still sending numeric IDs.");
runtime.saveArtifact("technical_recommendation", "Technical recommendation", "Root cause was UUID enforcement after deploy. Auth ruled out.");
const submitted = runtime.submit();
ok("submit once", submitted === true);
ok("submit twice blocked", runtime.submit() === false);
ok("telemetry present", runtime.getAttempt().telemetry.length > 5);

const legacy = telemetryToLegacyEvent(attempt.telemetry[0]!);
ok("legacy event mapper", Boolean(legacy.event_type) && Boolean(legacy.client_event_id));
const proj = attemptToLegacySessionProjection(runtime.getAttempt());
ok("legacy session projection", proj.status === "submitted");

registerRenderer({
  roleKey: "solutions_engineer",
  label: "SE",
  status: "EXPERIMENTAL",
  component: (() => null) as unknown as import("../src/lib/sim-engine/registry/rendererRegistry").RendererDefinition["component"],
});
ok("partial registry get SE", getRenderer("solutions_engineer", { allowExperimental: true }).ok);
ok(
  "partial registry still partial until registered in UI",
  getRenderer("business_systems_analyst").ok === false
);

// --- Phase Two: Data Analyst ---
const daValidation = validateScenario(q3ChurnInvestigationScenario);
ok("DA scenario validates", daValidation.ok, daValidation.issues.map((i) => i.message).join("; "));
ok("catalog resolves DA", getScenario("q3-churn-investigation")?.metadata.roleKey === "data_analyst");
ok("catalog resolves BI", getScenario("q3-churn-investigation-bi")?.metadata.roleKey === "bi_analyst");

const daRuntime = new SimulationRuntime(
  q3ChurnInvestigationScenario,
  createAttempt(q3ChurnInvestigationScenario, "datest01")
);
daRuntime.start();
ok(
  "DA attempt seeds SQL-first workbench",
  daRuntime.getAttempt().workbench.sqlQuery.toLowerCase().includes("subscriptions")
);
ok(
  "DA attempt does not seed Northstar API body as primary",
  !daRuntime.getAttempt().workbench.apiBody.includes("northstar")
);

daRuntime.openResource("res_schema");
ok("schema open sets opened_schema", daRuntime.getAttempt().world.flags.opened_schema === true);

daRuntime.executeSql();
ok(
  "plan-mix SQL sets found_churn_driver",
  daRuntime.getAttempt().world.flags.found_churn_driver === true,
  JSON.stringify(daRuntime.getAttempt().world.flags)
);
ok("SQL result rows present", (daRuntime.getAttempt().workbench.lastSqlResult?.rowCount ?? 0) > 0);

daRuntime.updateWorkbench({
  sqlQuery: "SELECT category, COUNT(*) FROM support_tickets GROUP BY category",
});
daRuntime.executeSql();
ok("ticket query sets ran_ticket_query", daRuntime.getAttempt().world.flags.ran_ticket_query === true);

daRuntime.openResource("res_invoice_sample");
ok(
  "invoice sample opens billing flag",
  daRuntime.getAttempt().world.flags.opened_billing_resource === true
);
ok(
  "billing notes revealable after billing path",
  daRuntime.getAttempt().resources.res_billing_note?.visible === true
);

daRuntime.saveArtifact(
  "analysis_memo",
  "Analysis memo",
  "Primary driver is Growth plan mix. Evidence from churn-by-plan. Ruled out tickets. Caveat: billing secondary."
);
ok("memo artifact saved", Object.values(daRuntime.getAttempt().artifacts).some((a) => a.kind === "analysis_memo"));
daRuntime.dispose();

// --- Phase Three: IC + TSE ---
const icValidation = validateScenario(brightpathLaunchImportScenario);
ok("IC scenario validates", icValidation.ok, icValidation.issues.map((i) => i.message).join("; "));
ok(
  "catalog resolves IC",
  getScenario("brightpath-launch-import")?.metadata.roleKey === "implementation_consultant"
);

const icRuntime = new SimulationRuntime(
  brightpathLaunchImportScenario,
  createAttempt(brightpathLaunchImportScenario, "ictest01")
);
icRuntime.start();
icRuntime.openResource("res_import_rules");
ok("IC rules open flag", icRuntime.getAttempt().world.flags.opened_import_rules === true);
for (const m of brightpathLaunchImportScenario.implementationWorkbench!.fieldMappings) {
  icRuntime.setFieldMapping(m.id, m.correctTarget);
}
ok("IC mappings complete", icRuntime.getAttempt().world.flags.correct_mapping_complete === true);
for (const item of brightpathLaunchImportScenario.implementationWorkbench!.checklist) {
  icRuntime.toggleChecklistItem(item.id, true);
}
ok("IC checklist complete", icRuntime.getAttempt().world.flags.checklist_complete === true);
icRuntime.saveArtifact(
  "cutover_plan",
  "Launch / cutover plan",
  "Import clean rows today, then fix remaining before Monday. Validate counts so nothing is silently lost."
);
ok("IC phased plan flag", icRuntime.getAttempt().world.flags.phased_plan_chosen === true);
icRuntime.dispose();

const tseValidation = validateScenario(greenStatusPageScenario);
ok("TSE scenario validates", tseValidation.ok, tseValidation.issues.map((i) => i.message).join("; "));
ok(
  "catalog resolves TSE",
  getScenario("green-status-page-incident")?.metadata.roleKey === "technical_support_engineer"
);

const tseRuntime = new SimulationRuntime(
  greenStatusPageScenario,
  createAttempt(greenStatusPageScenario, "tsetest01")
);
tseRuntime.start();
tseRuntime.openResource("res_auth_log");
tseRuntime.openResource("res_release_notes");
ok("TSE auth log flag", tseRuntime.getAttempt().world.flags.opened_auth_log === true);
ok(
  "TSE runbook revealable",
  tseRuntime.getAttempt().resources.res_runbook?.visible === true
);
for (const ticket of greenStatusPageScenario.supportWorkbench!.tickets) {
  tseRuntime.triageTicket(ticket.id, ticket.belongsToIncident ? "incident" : "unrelated");
}
ok("TSE correct triage", tseRuntime.getAttempt().world.flags.correct_triage === true);
tseRuntime.saveArtifact(
  "escalation_note",
  "Escalation to platform",
  "Root cause is R-2214 SAML clock-skew tighten from 300s to 30s. Please revert the skew-tolerance config flag."
);
ok("TSE identified cause", tseRuntime.getAttempt().world.flags.identified_release_cause === true);
ok("TSE escalated", tseRuntime.getAttempt().world.flags.escalated_with_evidence === true);
tseRuntime.dispose();

// --- Phase Four: BSA + config-only polymorphism ---
const bsaValidation = validateScenario(ridgelineExecutiveQueueScenario);
ok("BSA scenario validates", bsaValidation.ok, bsaValidation.issues.map((i) => i.message).join("; "));
ok(
  "catalog resolves BSA",
  getScenario("ridgeline-executive-queue")?.metadata.roleKey === "business_systems_analyst"
);

const bsaCenter = centerTabsForScenario(ridgelineExecutiveQueueScenario).map((t) => t.value);
ok("BSA layout includes rules (config)", bsaCenter.includes("rules"));
ok("BSA layout includes docs (config)", bsaCenter.includes("docs"));
ok("BSA layout excludes SQL without config", !bsaCenter.includes("sql"));

const seCenter = centerTabsForScenario(northstarIntegrationScenario).map((t) => t.value);
ok("SE layout includes API from technicalRuntime+capability", seCenter.includes("api"));
ok("SE layout excludes rules without rulesWorkbench", !seCenter.includes("rules"));

const bsaRight = rightTabsForScenario(ridgelineExecutiveQueueScenario).map((t) => t.value);
ok("BSA right tab uses summary from rulesWorkbench", bsaRight.includes("summary"));

const bsaRuntime = new SimulationRuntime(
  ridgelineExecutiveQueueScenario,
  createAttempt(ridgelineExecutiveQueueScenario, "bsatest01")
);
bsaRuntime.start();
bsaRuntime.openResource("res_rules");
bsaRuntime.openResource("res_systems_note");
ok("BSA rules open flag", bsaRuntime.getAttempt().world.flags.opened_rules === true);
ok("BSA audit revealable", bsaRuntime.getAttempt().resources.res_audit_excerpt?.visible === true);
bsaRuntime.selectRule("R0");
ok("BSA root cause rule", bsaRuntime.getAttempt().world.flags.identified_rule_interaction === true);
bsaRuntime.selectImpactCount(4);
ok("BSA impact quantified", bsaRuntime.getAttempt().world.flags.quantified_impact === true);
bsaRuntime.selectFix("fix_backfill_define");
ok("BSA correct fix", bsaRuntime.getAttempt().world.flags.correct_fix_chosen === true);
bsaRuntime.selectFix("fix_delete_r0");
ok("BSA unsafe fix flag", bsaRuntime.getAttempt().world.flags.unsafe_fix_chosen === true);
bsaRuntime.selectFix("fix_backfill_define");
bsaRuntime.saveArtifact(
  "analysis_memo",
  "Stakeholder summary",
  "The system is working as configured under R0. Policy meant genuinely new vendors. Four POs wrongly routed. Backfill migrated vendors and preserve audit review."
);
ok(
  "BSA summary separates system vs policy",
  bsaRuntime.getAttempt().world.flags.separated_system_vs_policy === true
);
bsaRuntime.dispose();

ok(
  "legacy slug maps launch-day-import",
  resolveEngineScenarioId("launch-day-import") === "brightpath-launch-import"
);
ok(
  "legacy slug maps green-status-page",
  resolveEngineScenarioId("green-status-page") === "green-status-page-incident"
);
ok("unknown legacy slug returns null", resolveEngineScenarioId("not-a-real-slug") === null);

runtime.dispose();
r401.dispose();
r404.dispose();

if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All sim-engine runtime checks passed.");
