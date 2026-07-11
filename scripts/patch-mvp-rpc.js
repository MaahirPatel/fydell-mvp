/**
 * Patch mvp/db.ts to prefer RPC durable storage when FYDELL_MVP_DB_SECRET is set.
 */
const fs = require("fs");
const path = "src/lib/mvp/db.ts";
let s = fs.readFileSync(path, "utf8");

if (!s.includes('import * as rpc from "./rpc"')) {
  s = s.replace(
    'import * as local from "./local-mvp-store";',
    'import * as local from "./local-mvp-store";\nimport * as rpc from "./rpc";'
  );
}

s = s.replace(
  /function useLocal\(\) \{\n  return !isSupabaseConfigured\(\);\n\}/,
  `function storageMode(): "service" | "rpc" | "local" {
  if (isSupabaseConfigured()) return "service";
  if (rpc.isMvpRpcConfigured()) return "rpc";
  return "local";
}

function useLocal() {
  return storageMode() === "local";
}

function useRpc() {
  return storageMode() === "rpc";
}`
);

s = s.replace(
  /function assertLoopStorage\(\) \{\n  if \(useLocal\(\) && process\.env\.VERCEL\) \{[\s\S]*?\}\n\}/,
  `function assertLoopStorage() {
  if (storageMode() === "local" && process.env.VERCEL) {
    throw new Error(
      "Hiring loop storage requires Supabase on Vercel. Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and FYDELL_MVP_DB_SECRET."
    );
  }
}`
);

function injectAfterAssertOrStart(fnSig, rpcBlock) {
  const idx = s.indexOf(fnSig);
  if (idx < 0) {
    console.log("MISS", fnSig);
    return;
  }
  // Find opening brace of function body (after signature)
  let i = s.indexOf("{", idx);
  // skip assertLoopStorage block if present right after
  const after = s.slice(i + 1, i + 80);
  if (after.includes("assertLoopStorage")) {
    const assertEnd = s.indexOf(";", i);
    i = assertEnd;
  }
  if (s.slice(i, i + 120).includes("useRpc()")) return;
  // insert after first line following {
  const insertAt = s.indexOf("\n", i) + 1;
  s = s.slice(0, insertAt) + rpcBlock + s.slice(insertAt);
}

// createWorkspaceIfMissing
injectAfterAssertOrStart(
  "export async function createWorkspaceIfMissing",
  `  if (useRpc()) {
    const ws = await rpc.rpcEnsureWorkspace(userId, name);
    debugLog("db.ts:createWorkspaceIfMissing", "RPC workspace", { userIdPrefix: userId.slice(0, 8), wsId: ws.id }, "H1");
    return ws as unknown as Workspace;
  }
`
);

injectAfterAssertOrStart(
  "export async function getCurrentWorkspace",
  `  if (useRpc()) {
    const ws = await rpc.rpcEnsureWorkspace(userId, "Your workspace");
    return ws as unknown as Workspace;
  }
`
);

injectAfterAssertOrStart(
  "export async function createCandidateInvite",
  `  if (useRpc()) {
    const invite = await rpc.rpcCreateInvite({
      workspaceId: input.workspaceId,
      userId: input.createdBy || "unknown",
      simulationId: input.simulationId,
      candidateName: input.candidateName,
      candidateEmail: input.candidateEmail,
    });
    debugLog("db.ts:createCandidateInvite", "RPC invite", { tokenPrefix: String(invite.token).slice(0, 6) }, "H1");
    return invite as unknown as CandidateInvite;
  }
`
);

injectAfterAssertOrStart(
  "export async function validateCandidateInvite",
  `  if (useRpc()) {
    const result = await rpc.rpcValidateInvite(token);
    debugLog("db.ts:validateCandidateInvite", "RPC validate", { ok: Boolean(result) }, "H2");
    if (!result) return null;
    return result as unknown as ValidatedInvite;
  }
`
);

injectAfterAssertOrStart(
  "export async function startSimulationAttempt",
  `  if (useRpc()) {
    const attempt = await rpc.rpcStartAttempt(token);
    debugLog("db.ts:startSimulationAttempt", "RPC start", { ok: Boolean(attempt), attemptId: attempt?.id ?? null }, "H2");
    return (attempt as unknown as SimulationAttempt) ?? null;
  }
`
);

injectAfterAssertOrStart(
  "export async function getAttempt",
  `  if (useRpc()) {
    const attempt = await rpc.rpcGetAttempt(attemptId);
    return (attempt as unknown as SimulationAttempt) ?? null;
  }
`
);

injectAfterAssertOrStart(
  "export async function recordSimulationEvent",
  `  if (useRpc()) {
    const event = await rpc.rpcRecordEventServer(attemptId, String(eventType), payload);
    return (event as unknown as SimulationEvent) ?? null;
  }
`
);

injectAfterAssertOrStart(
  "export async function getAttemptEvents",
  `  if (useRpc()) {
    const events = await rpc.rpcGetAttemptEvents(attemptId);
    return (events as unknown as SimulationEvent[]) ?? [];
  }
`
);

injectAfterAssertOrStart(
  "export async function updateCandidateNotes",
  `  if (useRpc()) {
    await rpc.rpcUpdateNotes(attemptId, notes);
    return;
  }
`
);

// Replace submit + score + report path with finalize for RPC via new helper used by route
if (!s.includes("export async function finalizeAttemptWithScore")) {
  s += `

/** RPC/local/service helper used by the submit route to score + persist in one step. */
export async function finalizeAttemptWithScore(
  attemptId: string,
  recommendation: string
): Promise<{ overall_score: number | null }> {
  if (useRpc()) {
    const attempt = await getAttempt(attemptId);
    if (!attempt) return { overall_score: null };
    const events = await getAttemptEvents(attemptId);
    const result = scoreAttempt({
      finalRecommendation: recommendation,
      candidateNotes: attempt.candidate_notes,
      events
    });
    await rpc.rpcFinalizeAttempt({
      attemptId,
      recommendation,
      score: result.overall_score,
      scoreJson: result.score_json as unknown as Record<string, unknown>,
      reportJson: result.report_json as unknown as Record<string, unknown>
    });
    debugLog("db.ts:finalizeAttemptWithScore", "RPC finalize", { attemptId, score: result.overall_score }, "H4");
    return { overall_score: result.overall_score };
  }

  const attempt = await submitFinalRecommendation(attemptId, recommendation);
  if (!attempt) return { overall_score: null };
  const score = await generateAttemptScore(attemptId);
  await generateCandidateReport(attemptId);
  return { overall_score: score?.overall_score ?? null };
}
`;
}

injectAfterAssertOrStart(
  "export async function getDashboardData",
  `  if (useRpc()) {
    // workspaceId is unused; membership is resolved by caller user via guard context.
    // Callers must pass workspace created for the same user.
    throw new Error("Use getDashboardDataForUser in RPC mode");
  }
`
);

if (!s.includes("export async function getDashboardDataForUser")) {
  s = s.replace(
    "export async function getDashboardData(workspaceId: string): Promise<DashboardData> {",
    `export async function getDashboardDataForUser(userId: string): Promise<DashboardData> {
  if (useRpc()) {
    const data = await rpc.rpcDashboard(userId);
    const attempts = (data.attempts as SimulationAttempt[]) ?? [];
    const invites = (data.invites as CandidateInvite[]) ?? [];
    const simulations = (data.simulations as Simulation[]) ?? [];
    const stats = (data.stats as DashboardData["stats"]) ?? {
      totalSimulations: simulations.length,
      totalInvites: invites.length,
      totalAttempts: attempts.length,
      completedAttempts: attempts.filter((a) => a.status === "submitted" || a.status === "reviewed").length,
      hires: attempts.filter((a) => a.hiring_decision === "hired").length
    };
    debugLog("db.ts:getDashboardDataForUser", "RPC dashboard", { attempts: attempts.length, invites: invites.length }, "H3");
    return {
      workspace: (data.workspace as Workspace) ?? null,
      simulations,
      attempts,
      invites,
      stats,
      calibration: {
        hiredCount: attempts.filter((a) => a.hired_at).length,
        checkInsDue: 0,
        feedbackCollected: 0,
        message: "Outcome tracking ready when you record a hire.",
        disclaimer:
          "Outcome data is collected to calibrate signal over time. We do not claim a validated correlation between simulation scores and on-the-job performance."
      }
    };
  }
  const ws = await createWorkspaceIfMissing(userId);
  return getDashboardData(ws.id);
}

export async function getDashboardData(workspaceId: string): Promise<DashboardData> {`
  );
}

injectAfterAssertOrStart(
  "export async function getAttemptReport",
  `  if (useRpc()) {
    throw new Error("Use getAttemptReportForUser in RPC mode");
  }
`
);

if (!s.includes("export async function getAttemptReportForUser")) {
  s = s.replace(
    "export async function getAttemptReport(attemptId: string): Promise<AttemptReport | null> {",
    `export async function getAttemptReportForUser(
  userId: string,
  attemptId: string
): Promise<AttemptReport | null> {
  if (useRpc()) {
    const data = await rpc.rpcAttemptReport(userId, attemptId);
    if (!data) return null;
    return data as unknown as AttemptReport;
  }
  return getAttemptReport(attemptId);
}

export async function getAttemptReport(attemptId: string): Promise<AttemptReport | null> {`
  );
}

fs.writeFileSync(path, s);
console.log("patched", {
  useRpc: s.includes("function useRpc"),
  finalize: s.includes("finalizeAttemptWithScore"),
  forUser: s.includes("getDashboardDataForUser"),
});
