/**
 * chunk-passport grind: GH-10, GH-11, PASS-05, PASS-06, PASS-07.
 * Pure-logic tests (no DB): snapshot reconciliation, share scoping,
 * removal copy. Run: npx tsx scripts/test-passport-grind-sharing.ts
 */
import { GithubClient } from "@/lib/passport/github/client";
import { extractRepository } from "@/lib/passport/github/extract";
import { projectFromResult } from "@/lib/passport/assemble";
import {
  githubDisconnectExplanation,
  portabilityBoundaryNote,
  projectRemovalExplanation,
  shareRevocationExplanation,
} from "@/lib/passport/removal";
import { describeShareGrant, shareState, validateExpiryInput } from "@/lib/passport/sharing";
import { currentSnapshots, findingsAreIdempotent, markSuperseded } from "@/lib/passport/snapshots";
import { emptyPassportNote, projectForShare, type PassportData, type PassportProject } from "@/lib/passport/view";
import { FakeGithub, SHA_A, SHA_B, check, report, standardRepo } from "./test-passport-grind-fake";

const FAST = { baseDelayMs: 1, maxDelayMs: 5, maxAttempts: 3, maxRateLimitWaitMs: 30_000 };

function proj(overrides: Partial<PassportProject> = {}): PassportProject {
  return {
    repoFullName: "acme/api",
    htmlUrl: "https://github.com/acme/api",
    commitSha: SHA_A,
    primaryLanguage: "Python",
    isFork: false,
    contributionStatement: "I built the API routes.",
    status: "complete",
    coverage: { totalFiles: 8, analyzedFiles: 6, skippedFiles: 2, languages: ["Python"], skipReasons: { binary: 1, possible_secret: 1 }, treeTruncated: false },
    analyzedAt: "2026-09-20T10:00:00Z",
    notices: [],
    evidence: [
      {
        id: "ev_1", repo: "acme/api", detector: "fastapi_validated_route", category: "backend",
        finding: "API route validates its request body.", basis: "repository_observation",
        path: "src/app.py", startLine: 9, endLine: 10, excerpt: ["@app.post(\"/items\")"],
        sourceUrl: `https://github.com/acme/api/blob/${SHA_A}/src/app.py#L9-L10`, limitations: [],
      },
    ],
    ...overrides,
  };
}

function passport(projects: PassportProject[]): PassportData {
  return {
    displayName: "Ada",
    headline: "Backend engineer",
    githubLogin: "acme",
    projects,
    roleSuggestions: [],
    capabilities: { source: "rules", capabilities: [], notShown: [] },
    updatedAt: "2026-09-20T10:00:00Z",
  };
}

async function main() {
  /* ---------------- GH-10: idempotent reimports ---------------- */
  const fake = new FakeGithub().addRepo(standardRepo());
  const once = await extractRepository({ owner: "acme", repo: "api" }, new GithubClient(fake.fetcher, FAST));
  const twice = await extractRepository({ owner: "acme", repo: "api" }, new GithubClient(fake.fetcher, FAST));
  check("GH-10 retry yields identical finding ids", findingsAreIdempotent(once.findings, twice.findings));
  check("GH-10 retry yields identical finding set", once.findings.length === twice.findings.length && once.findings.length > 0);

  const newer = new FakeGithub().addRepo({ ...standardRepo(), sha: SHA_B });
  const updated = await extractRepository({ owner: "acme", repo: "api" }, new GithubClient(newer.fetcher, FAST));
  check("GH-10 new snapshot => new finding ids", !findingsAreIdempotent(once.findings, updated.findings));

  const old = proj({ commitSha: SHA_A, analyzedAt: "2026-09-20T10:00:00Z" });
  const fresh = proj({ commitSha: SHA_B, analyzedAt: "2026-09-21T10:00:00Z" });
  const other = proj({ repoFullName: "acme/other", commitSha: SHA_A, analyzedAt: "2026-09-20T10:00:00Z" });
  const reconciled = markSuperseded([old, fresh, other]);
  check("GH-10 older snapshot marked stale", reconciled.find((p) => p.commitSha === SHA_A && p.repoFullName === "acme/api")?.status === "stale");
  check("GH-10 newest snapshot stays current", reconciled.find((p) => p.commitSha === SHA_B)?.status === "complete");
  check("GH-10 other repos untouched", reconciled.find((p) => p.repoFullName === "acme/other")?.status === "complete");
  check("GH-10 stale evidence excluded from current set", currentSnapshots([old, fresh]).every((p) => p.commitSha === SHA_B));
  const staleExcluded = projectForShare(passport([old, fresh]), ["projects", "evidence", "roles", "capabilities"]);
  check("GH-10 shares never include stale snapshots", staleExcluded.projects.length === 1 && staleExcluded.projects[0].commitSha === SHA_B);

  /* ---------------- PASS-06: scoped sharing ---------------- */
  const full = projectForShare(passport([proj()]), ["projects", "evidence", "roles", "capabilities"]);
  check("PASS-06 full grant keeps evidence", full.projects[0].evidence.length === 1);
  const noEvidence = projectForShare(passport([proj()]), ["projects"]);
  check("PASS-06 projects-without-evidence hides findings", noEvidence.projects.length === 1 && noEvidence.projects[0].evidence.length === 0);
  check("PASS-06 roles withheld without grant", noEvidence.roleSuggestions.length === 0);
  const minimal = projectForShare(passport([proj()]), []);
  check("PASS-06 empty grant reveals nothing", minimal.projects.length === 0 && minimal.capabilities.capabilities.length === 0);
  const junk = projectForShare(passport([proj()]), ["projects", "email" as never, "notes" as never]);
  check("PASS-06 unknown fields ignored", junk.projects.length === 1 && junk.projects[0].evidence.length === 0);
  check("PASS-06 capabilities need evidence grant", projectForShare(passport([proj()]), ["projects", "capabilities"]).capabilities.capabilities.length === 0);

  check("PASS-06 email never present", !JSON.stringify(full).includes('"email"'));
  check("PASS-06 private notes never present", !JSON.stringify(full).toLowerCase().includes("privatenote"));

  check("PASS-06 active share", shareState({ revokedAt: null, expiresAt: null }) === "active");
  check("PASS-06 revoked share", shareState({ revokedAt: "2026-09-21T00:00:00Z", expiresAt: null }) === "revoked");
  check("PASS-06 expired share", shareState({ revokedAt: null, expiresAt: "2020-01-01T00:00:00Z" }) === "expired");
  check("PASS-06 future expiry active", shareState({ revokedAt: null, expiresAt: new Date(Date.now() + 86400000).toISOString() }) === "active");

  const past = validateExpiryInput("2020-01-01T00:00:00Z");
  check("PASS-06 past expiry rejected", !past.ok);
  const far = validateExpiryInput(new Date(Date.now() + 400 * 86400000).toISOString());
  check("PASS-06 >366d expiry rejected", !far.ok);
  const bad = validateExpiryInput("not-a-date");
  check("PASS-06 invalid expiry rejected", !bad.ok);
  const good = validateExpiryInput(new Date(Date.now() + 7 * 86400000).toISOString());
  check("PASS-06 valid expiry accepted", good.ok && !!good.expiresAt);
  const none = validateExpiryInput(undefined);
  check("PASS-06 expiry optional", none.ok && none.expiresAt === "");

  const grant = describeShareGrant(["projects", "evidence"], new Date(Date.now() + 86400000).toISOString());
  check("PASS-06 grant preview names fields", grant.includes("projects") && grant.includes("evidence"));
  check("PASS-06 grant preview discloses limits", /email|employer-private/i.test(grant));

  /* ---------------- PASS-05: private by default ---------------- */
  check("PASS-05 empty passport note is not low-ability", /not enough portfolio evidence/i.test(emptyPassportNote()));
  check("PASS-05 empty note offers simulation path", /simulation/i.test(emptyPassportNote()));

  /* ---------------- PASS-07 / GH-11: boundaries and removal ---------------- */
  check("PASS-07 portability note: revocable", /revok/i.test(portabilityBoundaryNote()));
  check("PASS-07 portability note: retained records", /retained application record/i.test(portabilityBoundaryNote()));
  check("PASS-07 revocation cannot retract downloads", /cannot retract/i.test(shareRevocationExplanation()));
  const removal = projectRemovalExplanation("acme/api");
  check("GH-11 removal explains deletion", /deletes the imported snapshot/i.test(removal));
  check("GH-11 removal explains retained records", /keep the copies they already have/i.test(removal));
  check("GH-11 removal does not touch GitHub", /does not delete the public repository/i.test(removal));
  const disconnect = githubDisconnectExplanation();
  check("GH-11 disconnect: no stored credential", /no.*credential is stored|stores no GitHub credentials/i.test(disconnect));
  check("GH-11 disconnect stops future association", /will not be associated/i.test(disconnect));
  check("GH-11 disconnect keeps imported projects", /stay in your passport/i.test(disconnect));

  /* ---------------- projectFromResult guard (PASS-01) ---------------- */
  const failed = await extractRepository({ owner: "nope", repo: "gone" }, new GithubClient(new FakeGithub().fetcher, FAST));
  check("PASS-01 failed analysis never becomes a project", projectFromResult(failed, "") === null);
  const saved = projectFromResult(once, "I built the API.");
  check("PASS-01 project carries contribution separately", !!saved && saved.contributionStatement === "I built the API.");
  check("PASS-01 project has import time", !!saved && !Number.isNaN(new Date(saved.analyzedAt).getTime()));

  report("sharing (GH-10/GH-11/PASS-05/06/07)");
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
