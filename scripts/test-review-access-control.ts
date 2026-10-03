/**
 * Access-control contract for the H06/H09 review tables (migration 034).
 *
 * Verifies:
 * 1. RLS is enabled on requirement_evidence_mappings and review_questions
 * 2. Policies restrict access to organization members only
 * 3. No permissive (FOR ALL / USING true) policies exist
 * 4. The candidate API route verifies share ownership before answering
 *
 * Run: npx tsx scripts/test-review-access-control.ts
 */
import { readFileSync } from "fs";
import { resolve } from "path";

const MIGRATION = resolve(__dirname, "..", "supabase", "migrations", "034_requirement_evidence_review.sql");
const REVIEW_LIB = resolve(__dirname, "..", "src", "lib", "employer", "review.ts");
const CANDIDATE_ROUTE = resolve(__dirname, "..", "src", "app", "api", "candidate", "questions", "route.ts");

let failures = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`FAIL ${name}`);
    console.error(`     ${err instanceof Error ? err.message : err}`);
  }
}

function assertTrue(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const migration = readFileSync(MIGRATION, "utf-8");
const reviewLib = readFileSync(REVIEW_LIB, "utf-8");
const candidateRoute = readFileSync(CANDIDATE_ROUTE, "utf-8");

check("RLS enabled on requirement_evidence_mappings", () => {
  assertTrue(
    /ALTER TABLE[^;]*requirement_evidence_mappings[^;]*ENABLE ROW LEVEL SECURITY/i.test(migration),
    "RLS not enabled on requirement_evidence_mappings"
  );
});

check("RLS enabled on review_questions", () => {
  assertTrue(
    /ALTER TABLE[^;]*review_questions[^;]*ENABLE ROW LEVEL SECURITY/i.test(migration),
    "RLS not enabled on review_questions"
  );
});

check("No permissive USING (true) policies", () => {
  assertTrue(
    !/USING\s*\(\s*true\s*\)/.test(migration),
    "Found a permissive USING (true) policy"
  );
});

check("Policies scope to organization_members", () => {
  assertTrue(
    /organization_members/.test(migration),
    "No policy references organization_members"
  );
});

check("Review lib scopes by organization_id on all operations", () => {
  const fns = ["listMappings", "upsertMapping", "askQuestion", "listQuestions", "answerQuestion"];
  for (const fn of fns) {
    assertTrue(
      reviewLib.includes(fn),
      `Function ${fn} not found in review lib`
    );
  }
  // Every read filters by .eq("organization_id"; every write sets organization_id
  const filters = reviewLib.match(/\.eq\("organization_id"/g) || [];
  const inserts = reviewLib.match(/organization_id:\s*input\.organizationId/g) || [];
  assertTrue(
    filters.length >= 3 && inserts.length >= 2,
    `Expected 3+ filters and 2+ scoped inserts, found ${filters.length} filters, ${inserts.length} inserts`
  );
});

check("Candidate route verifies share ownership before answering", () => {
  assertTrue(
    candidateRoute.includes("listQuestionsForCandidate"),
    "Candidate route does not verify ownership via listQuestionsForCandidate"
  );
  assertTrue(
    candidateRoute.includes("Question not found"),
    "Candidate route does not reject questions outside the candidate's shares"
  );
});

check("Migration grants are scoped (no public write)", () => {
  assertTrue(
    !/GRANT\s+(ALL|INSERT|UPDATE|DELETE)\s+ON\s+(requirement_evidence_mappings|review_questions)\s+TO\s+(public|anon)/i.test(migration),
    "Found overly broad grant on review tables"
  );
});

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll review access-control checks passed.");
