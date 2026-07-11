const fs = require("fs");
let s = fs.readFileSync("src/lib/mvp/db.ts", "utf8");

// Deduplicate useLocal
s = s.replace(
  /function useLocal\(\) \{\r?\n  return !isSupabaseConfigured\(\);\r?\n\}\r?\n\r?\nfunction useLocal\(\) \{\r?\n  return !isSupabaseConfigured\(\);\r?\n\}\r?\n/,
  "function useLocal() {\n  return !isSupabaseConfigured();\n}\n\n"
);

// Deduplicate debugLog — keep first
const marker = "function debugLog(";
const i1 = s.indexOf(marker);
const i2 = s.indexOf(marker, i1 + 1);
if (i2 > 0) {
  const end = s.indexOf("// ---------------------------------------------------------------------------\n// Workspaces", i2);
  if (end > 0) s = s.slice(0, i2) + s.slice(end);
}

function inject(fnSig, localBody) {
  const idx = s.indexOf(fnSig);
  if (idx < 0) {
    console.log("MISS", fnSig);
    return;
  }
  const brace = s.indexOf("{", idx);
  if (s.slice(brace + 1, brace + 40).includes("useLocal()")) return;
  s = s.slice(0, brace + 1) + "\n  if (useLocal()) " + localBody + "\n" + s.slice(brace + 1);
}

inject(
  "export async function createWorkspaceIfMissing",
  `{
    const ws = local.localCreateWorkspaceIfMissing(userId, name);
    debugLog("db.ts:createWorkspaceIfMissing", "Local workspace", { userIdPrefix: userId.slice(0, 8), wsId: ws.id }, "H1");
    return ws;
  }`
);
inject("export async function getCurrentWorkspace", "return local.localGetCurrentWorkspace(userId);");
inject("export async function getWorkspaceSimulations", "return local.localGetWorkspaceSimulations(workspaceId);");
inject("export async function getSimulation", "return local.localGetSimulation(id);");
inject(
  "export async function createCandidateInvite",
  `{
    const invite = local.localCreateCandidateInvite(input);
    debugLog("db.ts:createCandidateInvite", "Local invite", { tokenPrefix: invite.token.slice(0, 6), isDemo: invite.token.startsWith("demo") }, "H1");
    return invite;
  }`
);
inject(
  "export async function validateCandidateInvite",
  `{
    const result = local.localValidateCandidateInvite(token);
    debugLog("db.ts:validateCandidateInvite", "Local validate", { ok: Boolean(result), tokenPrefix: token.slice(0, 8) }, "H2");
    return result;
  }`
);
inject(
  "export async function startSimulationAttempt",
  `{
    const attempt = local.localStartSimulationAttempt(token);
    debugLog("db.ts:startSimulationAttempt", "Local start", { ok: Boolean(attempt), attemptId: attempt?.id ?? null }, "H2");
    return attempt;
  }`
);
inject("export async function getAttempt", "return local.localGetAttempt(attemptId);");
inject("export async function recordSimulationEvent", "return local.localRecordSimulationEvent(attemptId, eventType, payload);");
inject("export async function getAttemptEvents", "return local.localGetAttemptEvents(attemptId);");
inject(
  "export async function updateCandidateNotes",
  `{
    local.localUpdateCandidateNotes(attemptId, notes);
    return;
  }`
);
inject(
  "export async function submitFinalRecommendation",
  `{
    const attempt = local.localSubmitFinalRecommendation(attemptId, recommendation);
    debugLog("db.ts:submitFinalRecommendation", "Local submit", { ok: Boolean(attempt), attemptId, recLen: recommendation.length }, "H4");
    return attempt;
  }`
);
inject("export async function generateAttemptScore", "return local.localGenerateAttemptScore(attemptId);");
inject(
  "export async function generateCandidateReport",
  `{
    const report = local.localGenerateCandidateReport(attemptId);
    debugLog("db.ts:generateCandidateReport", "Local report", { ok: Boolean(report), attemptId, signal: report?.overall_signal ?? null }, "H4");
    return report;
  }`
);
inject("export async function updateHiringDecision", "return local.localUpdateHiringDecision(attemptId, decision);");
inject("export async function createOutcomeFeedback", "return local.localCreateOutcomeFeedback(input);");
inject(
  "export async function getDashboardData",
  `{
    const data = local.localGetDashboardData(workspaceId);
    debugLog("db.ts:getDashboardData", "Local dashboard", { attempts: data.attempts.length, invites: data.invites.length, completed: data.stats.completedAttempts }, "H3");
    return data;
  }`
);
inject("export async function getAttemptReport", "return local.localGetAttemptReport(attemptId);");

fs.writeFileSync("src/lib/mvp/db.ts", s);
console.log({
  useLocal: (s.match(/function useLocal/g) || []).length,
  debugLog: (s.match(/function debugLog/g) || []).length,
  localCalls: (s.match(/local\.local/g) || []).length,
});
