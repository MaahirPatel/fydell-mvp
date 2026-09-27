/**
 * Employer grind — buyer promise document checks (BUY-01..BUY-07).
 *
 * The buyer promise is a commercial definition, so the "tests" here verify
 * the document itself: required sections exist (BUY-01..03 defined), the
 * manual protocols exist (BUY-04/05/07), and — critically — the document
 * contains no unsupported promises (BUY-06): no predicting job performance,
 * no guaranteed hires, no cheat-proofing claims, no universal coverage, no
 * hireability number.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

let failures = 0;
function ok(name: string, condition: boolean, detail = "") {
  if (condition) console.log(`  ok   ${name}`);
  else {
    console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ""}`);
    failures += 1;
  }
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const path = join(root, "docs", "BUYER_PROMISE.md");

ok("BUYER_PROMISE.md exists", existsSync(path));
if (!existsSync(path)) {
  console.error("document missing");
  process.exit(1);
}
const doc = readFileSync(path, "utf8");
const lower = doc.toLowerCase();

/* Required definitions ------------------------------------------------------- */

ok("BUY-01: supported role named", /backend engineer/i.test(doc) && /hiring step this replaces/i.test(doc));
ok("BUY-01: report reviewer named", /engineering reviewer|hiring manager/i.test(doc));
ok("BUY-02: candidate time stated", /candidate time/i.test(doc));
ok("BUY-02: report turnaround stated", /report turnaround/i.test(doc));
ok("BUY-02: included volume stated", /included volume/i.test(doc));
ok("BUY-02: support contact stated", /support contact/i.test(doc));
ok("BUY-02: limits stated", /limits:/i.test(doc));
ok("BUY-03: billable event defined", /billable event/i.test(doc) && /completed evaluation/i.test(doc));
ok(
  "BUY-03: failed infra runs never silently consume credits",
  /failed infrastructure runs never silently consume/i.test(doc)
);
ok("BUY-04: manual review protocol documented", /BUY-04/i.test(doc) && /checklist/i.test(doc));
ok("BUY-05: work-saved measurement protocol documented", /BUY-05/i.test(doc) && /manual review labor/i.test(doc));
ok("BUY-07: repeat-demand log documented", /BUY-07/i.test(doc));

/* BUY-06: no unsupported promises --------------------------------------------- */

// Disclaimers live in the "What is NOT promised" section; the check below
// asserts the forbidden claims are never ASSERTED elsewhere in the doc.
const disclaimerAt = lower.indexOf("## what is not promised");
const asserted = disclaimerAt === -1 ? lower : lower.slice(0, disclaimerAt);

const forbidden: [string, RegExp][] = [
  ["predicting job performance", /predict\w* job performance/i],
  ["guaranteed hires", /guaranteed hire/i],
  ["preventing all cheating", /prevent all cheating|cheat-proof/i],
  ["universal coverage", /universal coverage/i],
  ["hireability number", /hireability/i],
  ["cultural-fit score", /cultural.fit/i],
  ["testimonial-style claims", /testimonial/i],
];
for (const [label, re] of forbidden) {
  ok(`no unsupported claim asserted: ${label}`, !re.test(asserted));
}
// The doc must explicitly disclaim the big ones, not just avoid asserting them.
ok(
  "explicitly disclaims predicting job performance",
  /do \*\*not\*\* predict job performance/i.test(doc)
);
ok(
  "explicitly disclaims guaranteed hires",
  /do \*\*not\*\* guarantee hires/i.test(doc)
);
ok(
  "explicitly disclaims preventing all cheating",
  /do \*\*not\*\* claim to prevent all cheating/i.test(doc)
);

console.log("");
if (failures > 0) {
  console.error(`${failures} check(s) failed.`);
  process.exit(1);
}
console.log("All buyer-promise checks passed.");
