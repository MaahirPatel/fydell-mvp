/**
 * Credential-free sandbox contracts.
 * Run: npx tsx scripts/test-sandbox-contracts.ts
 */
import { readFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import {
  ACME_ROLLOUT_FIXTURE,
  canTransition,
  createWorldState,
  nextWorldState,
  parseWorldState,
  parseEventContract,
  analyzePassA,
  analyzePassB,
  canonicalize,
  scriptedReviewLabel,
  visitorReviewLabel,
  readSandboxAvailability,
  SANDBOX_STEPS,
} from "../src/lib/sim-engine/proof/sandbox/index";
import type { RunSnapshot } from "../src/lib/sim-engine/proof/types";

let failures = 0;
function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
    failures += 1;
  }
}

const hash = "a".repeat(64);
const expiresAt = new Date(Date.now() + 60_000).toISOString();
const base = createWorldState({
  ownerCapabilityHash: hash,
  createdFromIpHash: "a".repeat(32),
  expiresAt,
});

console.log("\nWorld state");
ok("schemaVersion is 1", base.schemaVersion === 1);
ok("revision starts at 0", base.revision === 0);
try {
  parseWorldState({ ...base, ownerCapabilityHash: "short" });
  ok("rejects short capability hash", false);
} catch {
  ok("rejects short capability hash", true);
}
try {
  parseWorldState({ ...base, extra: true });
  ok("rejects unknown fields", false);
} catch {
  ok("rejects unknown fields", true);
}
const bumped = nextWorldState(base, { currentStep: "active" });
ok("revision is monotonic", bumped.revision === 1);
ok("does not silent-default environment", base.environment === "sandbox");

console.log("\nState machine");
ok("invited to active", canTransition("invited", "active"));
ok("defense before pass A is illegal", canTransition("active", "defense_ready") === false);
ok("pass A then defense", canTransition("pass_a_processing", "defense_ready"));
ok("ten steps", SANDBOX_STEPS.length === 10);

console.log("\nEvents");
const payload = {
  stream: "candidate_work",
  event_type: "DECISION_COMMITTED",
  correlation_id: "c",
  idempotency_key: "k",
  payload_version: 1,
  payload: {},
};
ok("parses event contract", parseEventContract(payload).stream === "candidate_work");
try {
  parseEventContract({ ...payload, stream: "mystery" });
  ok("rejects unknown stream", false);
} catch {
  ok("rejects unknown stream", true);
}

console.log("\nFixture");
ok("single fixture version", ACME_ROLLOUT_FIXTURE.fixtureVersion === "acme-rollout-v1");
ok("defense question is not STAR", !/tell me about a time/i.test(ACME_ROLLOUT_FIXTURE.defenseQuestion.prompt));

console.log("\nAnalysis");
const snapshot: RunSnapshot = {
  run_id: "test",
  stage: "FINAL_SUBMITTED",
  released_facts: ["SECURITY_REVIEW_001"],
  artifact: {
    diagnosis: ACME_ROLLOUT_FIXTURE.discoveryNotes,
    recommendation: ACME_ROLLOUT_FIXTURE.revisedRecommendation,
    customer_message: ACME_ROLLOUT_FIXTURE.customerEmailRevised,
    internal_note: ACME_ROLLOUT_FIXTURE.architectureBrief,
    assumptions: ACME_ROLLOUT_FIXTURE.assumptions,
    limitations: "",
  },
  events: [
    {
      id: "e1",
      run_id: "test",
      sequence: 1,
      event_type: "DECISION_COMMITTED",
      event_version: 1,
      source: "CANDIDATE",
      actor_type: "candidate",
      actor_id: null,
      stage_id: null,
      occurred_at: null,
      recorded_at: expiresAt,
      payload: {},
    },
    {
      id: "e2",
      run_id: "test",
      sequence: 2,
      event_type: "FACT_RELEASED",
      event_version: 1,
      source: "WORLD",
      actor_type: "world",
      actor_id: null,
      stage_id: null,
      occurred_at: null,
      recorded_at: expiresAt,
      payload: { fact_id: "SECURITY_REVIEW_001" },
    },
  ],
  defense: [{ prompt: ACME_ROLLOUT_FIXTURE.defenseQuestion.prompt, response: ACME_ROLLOUT_FIXTURE.fixtureDefenseAnswer }],
};
const passA = analyzePassA(snapshot);
ok("pass A produces a defense question", passA.defensePrompt === ACME_ROLLOUT_FIXTURE.defenseQuestion.prompt);
ok("pass A keeps counterevidence slot", passA.claims.some((c) => c.competency === "Discovery judgment"));
const passB = analyzePassB(snapshot);
ok("pass B does not recommend Strong interview", passB.brief.recommendation !== "STRONG_INTERVIEW");
ok("pass B preserves concern about WAU", passB.claims.some((c) => c.competency === "Discovery judgment"));

console.log("\nReview honesty");
ok("scripted label", scriptedReviewLabel().disclaimer.includes("fictional sandbox"));
ok("visitor label", visitorReviewLabel("approve").label === "Reviewed by sandbox visitor");
ok("never human reviewer copy", !scriptedReviewLabel().label.toLowerCase().includes("human reviewer"));

console.log("\nReceipt integrity hash");
const { canonical } = canonicalize({ publicId: "p", items: ["a"] });
ok("canonical JSON is stable", canonicalize({ items: ["a"], publicId: "p" }).canonical === canonical);

console.log("\nKill switch");
const off = readSandboxAvailability({} as NodeJS.ProcessEnv);
ok("fails closed when disabled", off.enabled === false && off.reason === "disabled");
const mismatch = readSandboxAvailability({
  FYDELL_SANDBOX_ENABLED: "true",
  FYDELL_DEV_PROJECT_REF: "btbmvrvynnrhapjdkunz",
  FYDELL_SANDBOX_FIXTURE_VERSION: "acme-rollout-v1",
  NEXT_PUBLIC_SUPABASE_URL: "https://qtrhwrcxthtqvkeerptp.supabase.co",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_abcdefghijklmnopqrstuv",
} as NodeJS.ProcessEnv);
ok("refuses production project", mismatch.enabled === false && mismatch.reason === "project_mismatch");

console.log("\nClient must not query proof tables");
const forbidden = [".from(\"proof_", ".from('proof_", ".from(\"work_receipts", ".from('work_receipts", ".from(\"receipt_versions", ".from('receipt_versions"];
const clientHits: string[] = [];
function walk(dir: string) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full);
    } else if (/\.(ts|tsx)$/.test(name)) {
      const text = readFileSync(full, "utf8");
      if (!text.includes('"use client"') && !text.includes("'use client'")) continue;
      if (forbidden.some((needle) => text.includes(needle))) clientHits.push(full);
    }
  }
}
walk(resolve("src"));
ok("no client proof/receipt table access", clientHits.length === 0, clientHits.join(", "));

if (failures) {
  console.log(`\n${failures} failure(s)`);
  process.exit(1);
}
console.log("\nsandbox contracts passed");
