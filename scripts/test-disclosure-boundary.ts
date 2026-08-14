/**
 * Disclosure boundary tests.
 *
 * Exactly one public path may show a candidate's work to someone who is not
 * signed in: a Work Receipt share, which is scoped to chosen fields, expires,
 * and can be revoked. This suite is a source-level guard that no second path
 * reappears.
 *
 * It reads files rather than making requests because the assertion is about
 * which code exists, not about one response. A route that discloses nothing
 * because a query happened to return null is not the same as a route that
 * cannot disclose anything.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = join(import.meta.dirname, "..");
const SRC = join(ROOT, "src");

let failures = 0;

function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ""}`);
    failures += 1;
  }
}

function section(title: string) {
  console.log(`\n${title}`);
}

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), "utf8");
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx?$/.test(full)) out.push(full);
  }
  return out;
}

const allSourceFiles = walk(SRC);

/** Strips block and line comments so a comment mentioning a symbol is not a hit. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

/* The retired path -------------------------------------------------------- */

section("the retired /results/[token] path discloses nothing");

const RETIRED = "src/app/results/[token]/page.tsx";
const retiredSource = stripComments(read(RETIRED));

const mustNotAppear: Array<[string, string]> = [
  ["sim_sessions", "resolves a session"],
  ["sim_analysis_runs", "reads an analysis run"],
  ["share_token", "reads the plaintext token"],
  ["createAdminSupabaseClient", "opens a service-role client"],
  ["EvidenceReportV2", "renders the employer report"],
  ["MicroResultView", "renders the candidate result"],
  ["sim_credentials", "reads a credential"],
];

for (const [symbol, why] of mustNotAppear) {
  ok(`does not reference ${symbol}`, !retiredSource.includes(symbol), `it ${why}`);
}

ok(
  "does not read the token out of its own params",
  !/params/.test(retiredSource),
  "an unread token cannot be used to look anything up"
);

ok(
  "is a static component with no awaited data",
  !/\basync\b/.test(retiredSource),
  "async here would mean it fetches something"
);

/* No other plaintext token lookup ------------------------------------------ */

section("no route resolves a plaintext share token");

const plaintextLookups = allSourceFiles.filter((file) => {
  const source = stripComments(readFileSync(file, "utf8"));
  return /\.eq\(\s*["']share_token["']/.test(source);
});

ok(
  "nothing queries sim_sessions by plaintext share_token",
  plaintextLookups.length === 0,
  plaintextLookups.map((f) => relative(ROOT, f).split(sep).join("/")).join(", ")
);

const tokenMinters = allSourceFiles.filter((file) => {
  const source = stripComments(readFileSync(file, "utf8"));
  return /share_token\s*:/.test(source) && !/share_token_hash\s*:/.test(source);
});

ok(
  "nothing writes a new plaintext share_token",
  tokenMinters.length === 0,
  tokenMinters.map((f) => relative(ROOT, f).split(sep).join("/")).join(", ")
);

/* The result API does not leak the token ------------------------------------ */

section("the candidate result API does not hand out a permanent link");

const resultApi = stripComments(read("src/app/api/sim/results/[sessionId]/route.ts"));

ok("does not select share_token", !resultApi.includes("share_token"));
ok("does not return a shareUrl", !resultApi.includes("shareUrl"));
ok(
  "still authorizes the caller",
  resultApi.includes("requireUser") && resultApi.includes("organization_members"),
  "removing the token must not have removed the access check"
);

/* The surviving path is the receipt ----------------------------------------- */

section("the Work Receipt remains the one public path");

const receipt = stripComments(read("src/app/record/[token]/page.tsx"));

ok(
  "resolves through the receipt share model",
  receipt.includes("resolveReceiptShare"),
  "it must not query a session directly"
);
ok(
  "matches on a hashed token rather than a plaintext one",
  receipt.includes("share_token_hash") || receipt.includes("hashToken"),
  "a stored plaintext token is readable by anyone who reaches the row"
);
ok(
  "scopes the response to the fields the candidate chose",
  /allowed_fields|allowedFields/.test(receipt),
  "an unscoped receipt is the thing being retired"
);

/* Summary -------------------------------------------------------------------- */

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("Disclosure boundary holds: one scoped, revocable public path.");
