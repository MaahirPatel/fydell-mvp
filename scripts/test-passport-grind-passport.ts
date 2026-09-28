/**
 * chunk-passport grind: PASS-01..PASS-04, PASS-08, PASS-09 + E2E-01 journey.
 * Run: npx tsx scripts/test-passport-grind-passport.ts
 */
import { assemblePassport, projectFromResult } from "@/lib/passport/assemble";
import {
  disputedFindingIds,
  flaggedFindings,
  validateCorrectionReason,
  type Correction,
} from "@/lib/passport/corrections";
import { exportPassport } from "@/lib/passport/export";
import { GithubClient } from "@/lib/passport/github/client";
import { extractRepository } from "@/lib/passport/github/extract";
import { emptyPassportNote, projectForShare, type PassportData, type PassportProject } from "@/lib/passport/view";
import { ruleSummary, suggestRoles } from "@/lib/passport/rules";
import { buildSimulationEvidenceSummary } from "@/lib/passport/simulationEvidence";
import { shareState } from "@/lib/passport/sharing";
import { FakeGithub, SHA_A, check, report, standardRepo } from "./test-passport-grind-fake";

const FAST = { baseDelayMs: 1, maxDelayMs: 5, maxAttempts: 3, maxRateLimitWaitMs: 30_000 };
// Capability summaries must use the deterministic rules fallback in tests:
// never call a model over the network from a grind test.
delete process.env.OPENAI_API_KEY;
const BANNED = /\d+%|\bsenior\b|\bjunior\b|\bexpert\b|\brockstar\b|\bninja\b|\b10x\b|\bpersonality\b/i;

function ev(id: string, detector: string, category: string, basis: "repository_observation" | "dependency_declaration" = "repository_observation") {
  return {
    id, repo: "acme/api", detector, category, finding: `${detector} observed.`, basis,
    path: "src/app.py", startLine: 9, endLine: 10, excerpt: ["@app.post(\"/items\")"],
    sourceUrl: `https://github.com/acme/api/blob/${SHA_A}/src/app.py#L9-L10`, limitations: ["Not executed."],
  };
}

async function main() {
  /* ---------------- PASS-02: evidence types distinct ---------------- */
  const observed = [ev("a", "fastapi_validated_route", "backend"), ev("b", "test_suite", "testing")];
  const declared = [ev("c", "dependency_declaration", "backend", "dependency_declaration")];
  const rolesObs = suggestRoles(observed);
  const rolesDecl = suggestRoles(declared);
  check("PASS-02 observations drive roles", rolesObs.some((r) => r.family === "backend"));
  check("PASS-02 dependency declarations alone drive no role", rolesDecl.length === 0);
  const mixed = suggestRoles([...observed, ...declared]);
  check("PASS-02 role evidence cites observations only", mixed.every((r) => r.evidenceIds.every((id) => id !== "c")));
  const summary = ruleSummary(observed, rolesObs);
  check("PASS-02 interpretation separate from observation", summary.source === "rules" && summary.capabilities.every((c) => c.evidenceIds.length > 0));

  /* ---------------- PASS-03: honest role suggestions ---------------- */
  for (const r of suggestRoles(observed)) {
    check(`PASS-03 ${r.family}: evidence cited`, r.evidenceIds.length > 0);
    check(`PASS-03 ${r.family}: gaps stated`, r.gaps.length > 0);
    check(`PASS-03 ${r.family}: no banned labels`, !BANNED.test([r.requirement, ...r.gaps].join(" ")));
    check(`PASS-03 ${r.family}: no fit percentage field`, !("fit" in r) && !("score" in r));
  }
  for (const c of summary.capabilities) {
    check("PASS-03 capability: no banned labels", !BANNED.test(c.statement));
  }
  check("PASS-03 notShown disclaims missing evidence", summary.notShown.some((n) => /not evidence of inability|missing evidence/i.test(n)));

  /* ---------------- PASS-04: no public work ---------------- */
  const empty = await assemblePassport([], { displayName: "Ada", headline: "", githubLogin: null, updatedAt: null });
  check("PASS-04 empty passport: no roles invented", empty.roleSuggestions.length === 0);
  check("PASS-04 empty passport: no capabilities invented", empty.capabilities.capabilities.length === 0);
  check("PASS-04 empty passport: disclaimer present", empty.capabilities.notShown.some((n) => /not evidence of inability/i.test(n)));
  check("PASS-04 note frames as insufficient evidence", /not enough portfolio evidence/i.test(emptyPassportNote()) && !/low ability/i.test(emptyPassportNote()));

  /* ---------------- PASS-08: correction + export ---------------- */
  check("PASS-08 empty reason rejected", !validateCorrectionReason("").ok);
  check("PASS-08 long reason rejected", !validateCorrectionReason("x".repeat(1001)).ok);
  check("PASS-08 good reason accepted", validateCorrectionReason("The route was written by a teammate.").ok);

  const corrections: Correction[] = [
    { id: "corr-1", findingId: "a", projectId: "p1", reason: "Teammate wrote this route.", status: "open", createdAt: "2026-09-21T00:00:00Z", resolvedAt: null, resolutionNote: "" },
    { id: "corr-2", findingId: "b", projectId: "p1", reason: "Typo in path.", status: "resolved", createdAt: "2026-09-21T00:00:00Z", resolvedAt: "2026-09-22T00:00:00Z", resolutionNote: "Fixed display." },
  ];
  const passport: PassportData = {
    displayName: "Ada", headline: "Backend engineer", githubLogin: "acme",
    projects: [{
      repoFullName: "acme/api", htmlUrl: "https://github.com/acme/api", commitSha: SHA_A,
      primaryLanguage: "Python", isFork: false, contributionStatement: "I built the API.",
      status: "complete",
      coverage: { totalFiles: 8, analyzedFiles: 6, skippedFiles: 2, languages: ["Python"], skipReasons: {}, treeTruncated: false },
      analyzedAt: "2026-09-20T10:00:00Z", notices: [],
      evidence: [ev("a", "fastapi_validated_route", "backend"), ev("b", "test_suite", "testing")],
    }],
    roleSuggestions: suggestRoles(observed),
    capabilities: ruleSummary(observed, suggestRoles(observed)),
    updatedAt: "2026-09-20T10:00:00Z",
  };
  const flagged = flaggedFindings(passport, corrections);
  check("PASS-08 findings paired with corrections", flagged.length === 2);
  const original = JSON.stringify(passport.projects[0].evidence);
  check("PASS-08 original findings untouched by flagging", JSON.stringify(passport.projects[0].evidence) === original);
  check("PASS-08 disputed ids tracked", disputedFindingIds(corrections).has("a") && !disputedFindingIds(corrections).has("b"));

  const exported = exportPassport(passport, corrections);
  const exportedText = JSON.stringify(exported);
  check("PASS-08 export is versioned", (exported.format as string).startsWith("passport-export-v"));
  check("PASS-08 export keeps citations", exportedText.includes(SHA_A) && exportedText.includes("sourceUrl"));
  check("PASS-08 export carries corrections", exportedText.includes("Teammate wrote this route."));
  check("PASS-08 export has no employer notes", !exportedText.toLowerCase().includes("privatenote"));
  check("PASS-08 export has no email", !exportedText.includes('"email"'));
  check("PASS-08 export strips internal correction ids", !exportedText.includes("corr-1"));
  check("PASS-08 export states privacy", exportedText.includes("employer-private notes"));

  /* ---------------- PASS-09: portable simulation evidence ---------------- */
  const hostile = {
    scenarioId: "webhook-retry-incident",
    scenarioVersion: "1.0.0",
    completedAt: "2026-09-25T14:00:00Z",
    durationMinutes: 95,
    dimensions: [
      { name: "Correctness", score: 8, maxScore: 10, band: "strong", note: "Fixed the retry path cleanly." },
      { name: "Judgment", score: 7, maxScore: 10, band: "solid" },
    ],
    publicTests: { passed: 12, total: 14 },
    candidateStatement: "I added exponential backoff with jitter.",
    // Everything below must never pass through:
    hiddenTests: [{ name: "test_reconnect_backoff_hidden", passed: true }],
    hiddenTestCount: 9,
    answerKey: "retry with backoff factor 2, jitter 0.1",
    referenceSolution: "def solve(): ...",
    employerNotes: "Strong hire signal, keep warm.",
    internalRubric: { weights: { correctness: 0.5 } },
    gradingNotes: "do not show candidate",
  };
  const built = buildSimulationEvidenceSummary(hostile);
  check("PASS-09 summary builds", built.ok === true);
  if (built.ok) {
    const text = JSON.stringify(built.summary);
    check("PASS-09 scope present", built.summary.scenarioId === "webhook-retry-incident");
    check("PASS-09 version present", built.summary.scenarioVersion === "1.0.0");
    check("PASS-09 date present", built.summary.completedAt.startsWith("2026-09-25"));
    check("PASS-09 dimensions kept", built.summary.dimensions.length === 2);
    check("PASS-09 public tests kept", built.summary.publicTests?.passed === 12);
    for (const leak of ["hiddenTests", "hiddenTestCount", "answerKey", "referenceSolution", "employerNotes", "internalRubric", "gradingNotes", "test_reconnect_backoff_hidden", "Strong hire signal"]) {
      check(`PASS-09 no leak: ${leak.slice(0, 24)}`, !text.includes(leak));
    }
  }
  check("PASS-09 missing version rejected", buildSimulationEvidenceSummary({ scenarioId: "x", completedAt: "2026-09-25T00:00:00Z" }).ok === false);
  check("PASS-09 missing date rejected", buildSimulationEvidenceSummary({ scenarioId: "x", scenarioVersion: "1" }).ok === false);
  check("PASS-09 non-object rejected", buildSimulationEvidenceSummary(null).ok === false);
  const secretStmt = buildSimulationEvidenceSummary({
    scenarioId: "s", scenarioVersion: "1", completedAt: "2026-09-25T00:00:00Z",
    candidateStatement: 'My key was "ghp_0123456789abcdef0123".',
  });
  check(
    "PASS-09 secrets redacted in free text",
    secretStmt.ok === true && secretStmt.ok && !JSON.stringify(secretStmt.summary).includes("ghp_0123456789abcdef0123"),
  );

  /* ---------------- E2E-01 journey (in-process) ---------------- */
  // Fresh user imports a supported public repo, inspects a finding, builds
  // the passport, shares it, revokes, and exports — all against fakes.
  const journey = new FakeGithub().addRepo(standardRepo());
  const jClient = new GithubClient(journey.fetcher, FAST);
  const imported = await extractRepository({ owner: "acme", repo: "api" }, jClient);
  check("E2E-01 import completes", imported.status === "complete" && imported.findings.length > 0);
  const jProject = projectFromResult(imported, "I built the API routes and the worker.");
  check("E2E-01 project built", !!jProject);
  const inspected = jProject!.evidence[0];
  check("E2E-01 finding inspectable with citation", inspected.sourceUrl.includes(SHA_A) && inspected.excerpt.length > 0 && inspected.startLine >= 1);
  const jPassport = await assemblePassport(jProject ? [jProject] : [], { displayName: "Ada", headline: "Backend engineer", githubLogin: "acme", updatedAt: null });
  check("E2E-01 passport assembled", jPassport.projects.length === 1 && jPassport.roleSuggestions.length > 0);
  check("E2E-01 no fabricated stats", !BANNED.test(JSON.stringify(jPassport.roleSuggestions)));
  const shared: PassportProject[] = (projectForShare(jPassport, ["projects", "evidence"]) as PassportData).projects;
  check("E2E-01 share carries evidence", shared[0].evidence.length > 0);
  const revokedView = shareState({ revokedAt: new Date().toISOString(), expiresAt: null });
  check("E2E-01 revoked share grants nothing", revokedView === "revoked");
  const record = exportPassport(jPassport, []);
  check("E2E-01 export usable", (record.projects as unknown[]).length === 1 && typeof record.exportedAt === "string");

  report("passport (PASS-01..04/08/09 + E2E-01)");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
